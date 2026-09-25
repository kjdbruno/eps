const { Op } = require('sequelize');
const { Discussion, DiscussionComment, DiscussionOffice, User, Office, Staff, Notification } = require('../models');
const { askLLM, hasLLM } = require('../utils/llm');
const { resolvePeriodRange } = require('../utils/periodRange');
const { pushNotifications } = require('../utils/notifySocket');
const { logActivity } = require('../utils/activityLog');

// Attaches a display name to a comment JSON: the logged-in author's name when there was one,
// otherwise whatever guest display name they typed in (defaulting to "Anonymous"). Never leaks
// which citizen account a comment came from beyond the name they chose to show.
const withAuthorName = (commentJSON) => {
    commentJSON.authorName = commentJSON.user
        ? (`${commentJSON.user.firstname || ''} ${commentJSON.user.lastname || ''}`.trim() || 'User')
        : (commentJSON.guestName || 'Anonymous');
    delete commentJSON.user;
    return commentJSON;
};

// Best-effort: staff should hear about new engagement, but a notification hiccup must never
// fail the citizen's comment that already saved successfully. Pushed to each recipient's own
// connected socket(s) only (see utils/notifySocket) — not a global broadcast.
const notifyStaffOfComment = async (io, discussion) => {
    try {
        const staffUsers = await User.findAll({ where: { role: ['super', 'admin'] } });
        for (const user of staffUsers) {
            await Notification.create({ receiverId: user.id, content: `New comment on "${discussion.title}"` });
            await pushNotifications(io, user.id);
        }
    } catch (error) {
        console.error('Failed to notify staff of new discussion comment:', error);
    }
};

// Best-effort: emails/notifies each office's staff that a new discussion concerns them. Pushed to
// each recipient's own connected socket(s) only (see utils/notifySocket) — not a global broadcast,
// and not silently DB-only either (this used to create the Notification row but never push it
// live, so a recipient wouldn't see it until their next reconnect).
const notifyOffices = async (io, offices) => {
    for (const office of offices) {
        try {
            const staffs = await Staff.findAll({ where: { officeId: office.id } });
            for (const staff of staffs) {
                await Notification.create({ receiverId: staff.userId, content: `New discussion assigned to your office: "${office.name}"` });
                await pushNotifications(io, staff.userId);
            }
        } catch (error) {
            console.error(`Failed to notify office ${office.id} of new discussion:`, error);
        }
    }
};

// Super/admin see everything (system-wide). A workstation user only sees discussions assigned to
// their own office. A citizen/guest (no role decoded — see softAuth on the public GET routes)
// sees everything too, same as today's public discussion board. Returns null to signal "should be
// scoped but has no office to scope to" (a workstation account with no Staff row).
const resolveOfficeScope = async (req) => {
    if (!req.role || ['super', 'admin'].includes(req.role)) {
        return { officeId: null, label: null };
    }
    if (req.role !== 'workstation') {
        return { officeId: null, label: null };
    }
    const staff = await Staff.findOne({
        where: { userId: req.userId },
        include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }]
    });
    if (!staff) return null;
    return { officeId: staff.officeId, label: staff.office?.alias || staff.office?.name || null };
};

// Reads a discussion's title/description and matches it against every active office's stated
// mandate to decide who it concerns — same idea as ComplaintController's matchOfficesToContent,
// simplified (no complexity classification, no photo evidence — a discussion topic doesn't carry
// either). Returns { matches: [] } (never persists anything) whenever matching can't run: no API
// key configured, no office has a mandate set yet, or nothing confidently matches.
const matchOfficesToDiscussion = async (title, description) => {
    const empty = { matches: [] };
    if (!hasLLM() || !title) return empty;

    const offices = await Office.findAll({
        where: { isActive: true, mandate: { [Op.ne]: null } },
        attributes: ['id', 'name', 'alias', 'mandate']
    });
    if (!offices.length) return empty;

    const officeList = offices
        .map(o => `${o.id}: ${o.name}${o.alias ? ` (${o.alias})` : ''} — ${o.mandate}`)
        .join('\n');

    try {
        const raw = await askLLM({
            system: 'You route a staff-opened public discussion topic to the city department(s) most ' +
                'concerned with or responsible for it, based strictly on each department\'s stated ' +
                'mandate below — there is no category system, match the topic\'s content directly to a ' +
                'mandate. Reply with ONLY a JSON object, no other text and no markdown fences, in ' +
                'exactly this shape: {"offices": [{"officeId": <number>, "reason": "<one short sentence ' +
                'tying the topic to that department\'s mandate>"}]}. Usually pick just one department; ' +
                'only include more than one when the topic genuinely spans multiple mandates. If nothing ' +
                'confidently matches, reply {"offices": []}.',
            prompt: `Departments (id: name — mandate):\n${officeList}\n\nDiscussion title: "${title}"\n\n` +
                `Discussion description:\n"""${description || '(no description provided)'}"""`,
            maxTokens: 400
        }) || '{}';

        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        let picks;
        try {
            picks = JSON.parse(cleaned);
        } catch {
            return empty;
        }
        if (!picks || typeof picks !== 'object' || Array.isArray(picks)) return empty;

        const offerings = Array.isArray(picks.offices) ? picks.offices : [];
        const officeById = new Map(offices.map(o => [o.id, o]));
        const matches = [];
        for (const pick of offerings) {
            const officeId = parseInt(pick?.officeId, 10);
            const office = officeById.get(officeId);
            if (!office) continue;
            matches.push({ office, reason: typeof pick.reason === 'string' ? pick.reason.slice(0, 500) : null });
        }
        return { matches };
    } catch (error) {
        console.error('Discussion office matching failed:', error);
        return empty;
    }
};

// Persists whatever matchOfficesToDiscussion found: creates the DiscussionOffice rows (with the
// AI's reasoning attached). Never fails discussion creation — matching is best-effort, same
// convention as assignComplaintToOffices. Returns false when nothing matched (no AI provider
// configured, or no confident match), leaving the discussion unassigned for a staff member to
// route manually via reassignOffice below.
const assignDiscussionToOffices = async (io, discussion) => {
    const { matches } = await matchOfficesToDiscussion(discussion.title, discussion.description);
    if (!matches.length) return false;

    for (const { office, reason } of matches) {
        await DiscussionOffice.findOrCreate({
            where: { discussionId: discussion.id, officeId: office.id },
            defaults: { isActive: true, assignedBy: 'ai', assignmentReason: reason }
        });
    }
    notifyOffices(io, matches.map(m => m.office));
    return true;
};

const isExpired = (discussion) => !!discussion.expiresAt && new Date(discussion.expiresAt) < new Date();

module.exports = (io) => ({
    // Public list — open topics first, newest first within each. Scoped for a workstation viewer
    // (see resolveOfficeScope); unrestricted for super/admin, citizens, and guests.
    // `period`/`year` are opt-in: the internal staff dashboard always sends them (for its
    // Week/Month/Year + year-stepper controls), but the public citizen/guest board (softAuth,
    // no role) never does — so omitting them keeps returning every discussion ever, unfiltered,
    // exactly like before this was added. Only apply the date window when a period was actually
    // requested.
    getAllDiscussions: async (req, res) => {
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.json({ data: [], scope: { officeId: null, label: null }, range: null });

            const range = req.query.period ? resolvePeriodRange(req.query.period, req.query.year) : null;
            const where = range ? { createdAt: { [Op.gte]: range.since, [Op.lte]: range.until } } : {};
            if (scope.officeId) {
                const rows = await DiscussionOffice.findAll({
                    where: { officeId: scope.officeId, isActive: true },
                    attributes: ['discussionId'],
                    raw: true
                });
                const ids = rows.map(r => r.discussionId);
                where.id = { [Op.in]: ids.length ? ids : [0] };
            }

            const discussions = await Discussion.findAll({
                where,
                include: [
                    { model: User, as: 'creator', attributes: ['firstname', 'lastname'] },
                    { model: DiscussionComment, as: 'comments', attributes: ['id'] },
                    {
                        model: DiscussionOffice,
                        as: 'discussionOffices',
                        where: { isActive: true },
                        required: false,
                        include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }]
                    }
                ],
                order: [['status', 'ASC'], ['createdAt', 'DESC']]
            });

            const data = discussions.map(d => {
                const json = d.toJSON();
                json.commentCount = json.comments.length;
                json.offices = (json.discussionOffices || []).map(o => o.office).filter(Boolean);
                json.isExpired = isExpired(d);
                delete json.comments;
                delete json.discussionOffices;
                return json;
            });

            // Time-to-first-comment + guest/registered mix both need each comment's own
            // createdAt/userId, not just the count already loaded above — one extra query across
            // the same (already period/office-scoped) set of discussions.
            const discussionIds = discussions.map(d => d.id);
            const allComments = discussionIds.length
                ? await DiscussionComment.findAll({
                    where: { discussionId: { [Op.in]: discussionIds } },
                    attributes: ['discussionId', 'userId', 'createdAt'],
                    raw: true
                })
                : [];

            const firstCommentAtByDiscussion = {};
            allComments.forEach(c => {
                const existing = firstCommentAtByDiscussion[c.discussionId];
                if (!existing || new Date(c.createdAt) < new Date(existing)) {
                    firstCommentAtByDiscussion[c.discussionId] = c.createdAt;
                }
            });
            const discussionsById = new Map(discussions.map(d => [d.id, d]));
            const lagsMinutes = Object.entries(firstCommentAtByDiscussion)
                .map(([discussionId, firstAt]) => {
                    const d = discussionsById.get(Number(discussionId));
                    if (!d) return null;
                    return (new Date(firstAt) - new Date(d.createdAt)) / 60000;
                })
                .filter(v => v != null && v >= 0);
            const avgTimeToFirstCommentMinutes = lagsMinutes.length
                ? +(lagsMinutes.reduce((s, v) => s + v, 0) / lagsMinutes.length).toFixed(1)
                : null;

            const guestCommentCount = allComments.filter(c => !c.userId).length;
            const registeredCommentCount = allComments.filter(c => c.userId).length;

            // Reopen rate — of every topic that's EVER been closed (currently closed, or reopened
            // at least once, which implies it was closed before), how many came back at least once.
            const everClosed = discussions.filter(d => d.status === 'closed' || d.reopenCount > 0);
            const everReopened = discussions.filter(d => d.reopenCount > 0);
            const reopenRate = everClosed.length ? +(everReopened.length / everClosed.length * 100).toFixed(1) : null;

            return res.json({
                data,
                scope: { officeId: scope.officeId, label: scope.label },
                range: range ? { period: range.period, year: range.year, label: range.label } : null,
                stats: {
                    avgTimeToFirstCommentMinutes,
                    commentAuthorMix: [
                        { label: 'Registered', count: registeredCommentCount },
                        { label: 'Guest', count: guestCommentCount }
                    ],
                    reopenRate,
                    everClosedCount: everClosed.length,
                    reopenedCount: everReopened.length
                }
            });
        } catch (error) {
            console.error('Error fetching discussions:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    getDiscussion: async (req, res) => {
        const { id } = req.params;
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const discussion = await Discussion.findByPk(id, {
                include: [
                    { model: User, as: 'creator', attributes: ['firstname', 'lastname'] },
                    {
                        model: DiscussionComment,
                        as: 'comments',
                        include: [{ model: User, as: 'user', attributes: ['firstname', 'lastname'] }],
                        order: [['createdAt', 'ASC']]
                    },
                    {
                        model: DiscussionOffice,
                        as: 'discussionOffices',
                        where: { isActive: true },
                        required: false,
                        include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }]
                    }
                ]
            });
            if (!discussion) {
                return res.status(404).json({ message: 'Discussion not found.' });
            }

            if (scope.officeId) {
                const assigned = (discussion.discussionOffices || []).some(o => o.officeId === scope.officeId);
                if (!assigned) {
                    return res.status(403).json({ message: 'You do not have access to this discussion.' });
                }
            }

            const json = discussion.toJSON();
            json.comments = json.comments.map(withAuthorName);
            json.offices = (json.discussionOffices || []).map(o => o.office).filter(Boolean);
            json.isExpired = isExpired(discussion);
            delete json.discussionOffices;

            return res.json({ data: json });
        } catch (error) {
            console.error('Error fetching discussion:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Staff-only — opens a new topic for citizens to weigh in on. Auto-assigns it to the
    // office(s) whose mandate it concerns, same AI-matching pattern complaints use at filing time
    // — a no-match just leaves it unassigned for a staff member to route via reassignOffice.
    createDiscussion: async (req, res) => {
        const { title, description, expiresAt } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Title is required.' });
        }
        try {
            const discussion = await Discussion.create({
                title,
                description: description || null,
                expiresAt: expiresAt || null,
                createdBy: req.userId
            });

            await assignDiscussionToOffices(io, discussion);

            logActivity({
                module: 'discussion', entityId: discussion.id, action: 'created',
                actorId: req.userId, actorRole: req.role,
                description: `Created discussion "${discussion.title}"`
            });

            return res.status(201).json({ message: 'Discussion created.', data: discussion });
        } catch (error) {
            console.error('Error creating discussion:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Staff-facing preview: re-runs the same content-vs-mandate matching used at creation time and
    // returns the result WITHOUT persisting anything, so a staff member can see what the AI would
    // suggest (and why) before deciding whether to act on it via reassignOffice.
    suggestOffice: async (req, res) => {
        const { id } = req.params;
        try {
            const discussion = await Discussion.findByPk(id);
            if (!discussion) {
                return res.status(404).json({ message: 'Discussion not found.' });
            }
            const { matches } = await matchOfficesToDiscussion(discussion.title, discussion.description);
            return res.status(200).json({
                suggestions: matches.map(({ office, reason }) => ({
                    officeId: office.id,
                    name: office.name,
                    alias: office.alias,
                    reason
                }))
            });
        } catch (error) {
            console.error('Error suggesting office for discussion:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Super/admin-only (see route middleware) — corrects/sets which office(s) a discussion is
    // assigned to, whether the AI left it unassigned or got it wrong. A true reassignment (sets
    // the full active set), not additive — mirrors ComplaintController.reassignOffice exactly.
    reassignOffice: async (req, res) => {
        const { id } = req.params;
        const { offices } = req.body;

        if (!Array.isArray(offices)) {
            return res.status(400).json({ message: 'offices must be an array of { officeId, reason? }.' });
        }

        try {
            const discussion = await Discussion.findByPk(id);
            if (!discussion) {
                return res.status(404).json({ message: 'Discussion not found.' });
            }

            const resolvedOffices = [];
            for (const entry of offices) {
                const officeId = parseInt(entry?.officeId, 10);
                if (!officeId) continue;
                const office = await Office.findByPk(officeId);
                if (!office) continue;
                resolvedOffices.push({ office, reason: entry.reason || null });
            }

            const keepIds = resolvedOffices.map(r => r.office.id);
            await DiscussionOffice.update(
                { isActive: false },
                {
                    where: {
                        discussionId: discussion.id,
                        isActive: true,
                        ...(keepIds.length ? { officeId: { [Op.notIn]: keepIds } } : {})
                    }
                }
            );

            for (const { office, reason } of resolvedOffices) {
                const [assignment, created] = await DiscussionOffice.findOrCreate({
                    where: { discussionId: discussion.id, officeId: office.id },
                    defaults: { isActive: true, assignedBy: 'admin', assignmentReason: reason }
                });
                if (!created) {
                    await assignment.update({
                        isActive: true,
                        assignedBy: 'admin',
                        assignmentReason: reason || assignment.assignmentReason
                    });
                }
            }

            if (resolvedOffices.length) {
                notifyOffices(io, resolvedOffices.map(r => r.office));
            }

            logActivity({
                module: 'discussion', entityId: discussion.id, action: 'reassigned',
                actorId: req.userId, actorRole: req.role,
                description: `Reassigned office(s) for discussion "${discussion.title}"`
            });

            return res.status(200).json({ message: 'Office(s) reassigned.' });
        } catch (error) {
            console.error('Error reassigning discussion office:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Open to guests and citizens alike — softAuth attributes it to an account when logged in,
    // otherwise the guestName the commenter typed (or "Anonymous" if left blank) is stored instead.
    // A logged-in workstation user, though, may only comment on a discussion assigned to their own
    // office — super/admin and the public remain unrestricted. monitoring is blocked outright —
    // it never transacts, not even a public-style engagement action.
    addComment: async (req, res) => {
        const { id } = req.params;
        const { content, guestName } = req.body;

        if (req.role === 'monitoring') {
            return res.status(403).json({ message: 'Monitoring accounts are view-only.' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required.' });
        }

        try {
            const discussion = await Discussion.findByPk(id);
            if (!discussion) {
                return res.status(404).json({ message: 'Discussion not found.' });
            }
            if (discussion.status === 'closed' || isExpired(discussion)) {
                return res.status(400).json({ message: 'This discussion is closed to new comments.' });
            }

            if (req.role === 'workstation') {
                const scope = await resolveOfficeScope(req);
                if (scope === null) return res.status(403).json({ message: 'You do not have access to this discussion.' });
                if (scope.officeId) {
                    const assigned = await DiscussionOffice.findOne({ where: { discussionId: id, officeId: scope.officeId, isActive: true } });
                    if (!assigned) return res.status(403).json({ message: 'You do not have access to this discussion.' });
                }
            }

            const comment = await DiscussionComment.create({
                discussionId: id,
                userId: req.userId || null,
                guestName: req.userId ? null : (guestName ? guestName.trim().slice(0, 80) : null),
                content: content.trim()
            });

            const withUser = await DiscussionComment.findByPk(comment.id, {
                include: [{ model: User, as: 'user', attributes: ['firstname', 'lastname'] }]
            });

            notifyStaffOfComment(io, discussion);

            return res.status(201).json({ message: 'Comment posted.', data: withAuthorName(withUser.toJSON()) });
        } catch (error) {
            console.error('Error posting comment:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // A workstation user may only close/reopen a discussion assigned to their own office;
    // super/admin can act on any.
    closeDiscussion: async (req, res) => {
        const { id } = req.params;
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const discussion = await Discussion.findByPk(id);
            if (!discussion) return res.status(404).json({ message: 'Discussion not found.' });

            if (scope.officeId) {
                const assigned = await DiscussionOffice.findOne({ where: { discussionId: id, officeId: scope.officeId, isActive: true } });
                if (!assigned) return res.status(403).json({ message: 'You do not have access to this discussion.' });
            }

            await discussion.update({ status: 'closed' });

            logActivity({
                module: 'discussion', entityId: discussion.id, action: 'closed',
                actorId: req.userId, actorRole: req.role,
                description: `Closed discussion "${discussion.title}"`
            });

            return res.status(200).json({ message: 'Discussion closed.', data: discussion });
        } catch (error) {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    reopenDiscussion: async (req, res) => {
        const { id } = req.params;
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const discussion = await Discussion.findByPk(id);
            if (!discussion) return res.status(404).json({ message: 'Discussion not found.' });

            if (scope.officeId) {
                const assigned = await DiscussionOffice.findOne({ where: { discussionId: id, officeId: scope.officeId, isActive: true } });
                if (!assigned) return res.status(403).json({ message: 'You do not have access to this discussion.' });
            }

            // Only count a real closed->open transition — calling this on an already-open
            // discussion (a no-op) shouldn't inflate the reopen-rate stat.
            const wasClosed = discussion.status === 'closed';
            await discussion.update({ status: 'open', reopenCount: wasClosed ? discussion.reopenCount + 1 : discussion.reopenCount });

            if (wasClosed) {
                logActivity({
                    module: 'discussion', entityId: discussion.id, action: 'reopened',
                    actorId: req.userId, actorRole: req.role,
                    description: `Reopened discussion "${discussion.title}"`
                });
            }

            return res.status(200).json({ message: 'Discussion reopened.', data: discussion });
        } catch (error) {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },
});
