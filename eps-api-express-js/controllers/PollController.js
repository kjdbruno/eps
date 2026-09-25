const { Op } = require('sequelize');
const { Poll, PollOption, PollVote, PollOffice, User, Office, Staff, Notification } = require('../models');
const { askLLM, hasLLM } = require('../utils/llm');
const { resolvePeriodRange } = require('../utils/periodRange');
const { pushNotifications } = require('../utils/notifySocket');
const { logActivity } = require('../utils/activityLog');

// Shapes a poll for a specific viewer (identified by userId if logged in, guestToken if not):
// includes each option's vote count, but only when the viewer has already voted, the poll is
// closed, or the viewer is staff managing the poll (isStaff) — hiding running results before you
// vote avoids bandwagon bias for a citizen, but staff need to see live results regardless of
// whether they personally voted.
const shapePollForViewer = async (poll, { userId, guestToken, isStaff }) => {
    const options = await PollOption.findAll({
        where: { pollId: poll.id },
        include: [{ model: PollVote, as: 'votes', attributes: ['id'] }],
        order: [['id', 'ASC']]
    });

    let myVote = null;
    if (userId) {
        myVote = await PollVote.findOne({ where: { pollId: poll.id, userId } });
    } else if (guestToken) {
        myVote = await PollVote.findOne({ where: { pollId: poll.id, guestToken } });
    }

    const hasVoted = !!myVote;
    const showResults = hasVoted || poll.status === 'closed' || isStaff;
    const totalVotes = options.reduce((sum, o) => sum + o.votes.length, 0);

    return {
        id: poll.id,
        question: poll.question,
        status: poll.status,
        createdAt: poll.createdAt,
        expiresAt: poll.expiresAt,
        isExpired: isExpired(poll),
        reopenCount: poll.reopenCount,
        hasVoted,
        myOptionId: myVote ? myVote.optionId : null,
        totalVotes,
        options: options.map(o => ({
            id: o.id,
            label: o.label,
            // Counts are only meaningful to the client once showResults is true — sent regardless
            // (nothing sensitive in a tally) but the UI hides them until then.
            votes: o.votes.length,
            percent: showResults && totalVotes ? Math.round((o.votes.length / totalVotes) * 100) : null
        })),
        showResults
    };
};

const isExpired = (poll) => !!poll.expiresAt && new Date(poll.expiresAt) < new Date();

const STAFF_ROLES = ['super', 'admin', 'workstation', 'monitoring'];

// Super/admin see everything (system-wide). A workstation user only sees polls assigned to their
// own office. A citizen/guest (no role decoded — see softAuth on the public GET routes) sees
// everything too, same as today's public poll board. Returns null to signal "should be scoped but
// has no office to scope to" (a workstation account with no Staff row).
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

// Reads a poll's question and matches it against every active office's stated mandate to decide
// who it concerns — same idea as DiscussionController's matchOfficesToDiscussion.
const matchOfficesToPoll = async (question) => {
    const empty = { matches: [] };
    if (!hasLLM() || !question) return empty;

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
            system: 'You route a staff-created public opinion poll to the city department(s) most ' +
                'concerned with or responsible for its subject, based strictly on each department\'s ' +
                'stated mandate below — there is no category system, match the poll\'s question directly ' +
                'to a mandate. Reply with ONLY a JSON object, no other text and no markdown fences, in ' +
                'exactly this shape: {"offices": [{"officeId": <number>, "reason": "<one short sentence ' +
                'tying the question to that department\'s mandate>"}]}. Usually pick just one department; ' +
                'only include more than one when the question genuinely spans multiple mandates. If ' +
                'nothing confidently matches, reply {"offices": []}.',
            prompt: `Departments (id: name — mandate):\n${officeList}\n\nPoll question: "${question}"`,
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
        console.error('Poll office matching failed:', error);
        return empty;
    }
};

// Best-effort: notifies each office's staff that a new poll concerns them. Pushed to each
// recipient's own connected socket(s) only (see utils/notifySocket) — this used to only create
// the Notification row with no live push at all, so a recipient wouldn't see it until their next
// reconnect.
const notifyOffices = async (io, offices) => {
    for (const office of offices) {
        try {
            const staffs = await Staff.findAll({ where: { officeId: office.id } });
            for (const staff of staffs) {
                await Notification.create({ receiverId: staff.userId, content: `New poll assigned to your office: "${office.name}"` });
                await pushNotifications(io, staff.userId);
            }
        } catch (error) {
            console.error(`Failed to notify office ${office.id} of new poll:`, error);
        }
    }
};

// Persists whatever matchOfficesToPoll found. Never fails poll creation — matching is
// best-effort. Returns false when nothing matched, leaving the poll unassigned for a staff
// member to route manually via reassignOffice below.
const assignPollToOffices = async (io, poll) => {
    const { matches } = await matchOfficesToPoll(poll.question);
    if (!matches.length) return false;

    for (const { office, reason } of matches) {
        await PollOffice.findOrCreate({
            where: { pollId: poll.id, officeId: office.id },
            defaults: { isActive: true, assignedBy: 'ai', assignmentReason: reason }
        });
    }
    notifyOffices(io, matches.map(m => m.office));
    return true;
};

module.exports = (io) => ({
    // Public list — pass ?guestToken= so guest vote-state can be resolved per poll. Also serves
    // the internal app's poll management table (staff always sees live results, see isStaff).
    // `period`/`year` are opt-in — the internal dashboard sends them for its Week/Month/Year +
    // year-stepper controls; the public citizen/guest board never does, so omitting them keeps
    // returning every poll ever, unfiltered, exactly like before this was added. Scoped for a
    // workstation viewer (see resolveOfficeScope); unrestricted for super/admin, citizens, guests.
    getAllPolls: async (req, res) => {
        const guestToken = req.query.guestToken || null;
        const isStaff = STAFF_ROLES.includes(req.role);
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.json({ data: [], scope: { officeId: null, label: null }, range: null });

            const range = req.query.period ? resolvePeriodRange(req.query.period, req.query.year) : null;
            const where = range ? { createdAt: { [Op.gte]: range.since, [Op.lte]: range.until } } : {};
            if (scope.officeId) {
                const rows = await PollOffice.findAll({
                    where: { officeId: scope.officeId, isActive: true },
                    attributes: ['pollId'],
                    raw: true
                });
                const ids = rows.map(r => r.pollId);
                where.id = { [Op.in]: ids.length ? ids : [0] };
            }

            const polls = await Poll.findAll({
                where,
                include: [
                    {
                        model: PollOffice,
                        as: 'pollOffices',
                        where: { isActive: true },
                        required: false,
                        include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }]
                    }
                ],
                order: [['status', 'ASC'], ['createdAt', 'DESC']]
            });

            const data = await Promise.all(
                polls.map(async p => {
                    const shaped = await shapePollForViewer(p, { userId: req.userId, guestToken, isStaff });
                    shaped.offices = (p.pollOffices || []).map(o => o.office).filter(Boolean);
                    return shaped;
                })
            );

            // Time-to-first-vote + guest/registered mix both need each vote's own
            // createdAt/userId, not just per-option counts already loaded above.
            const pollIds = polls.map(p => p.id);
            const allVotes = pollIds.length
                ? await PollVote.findAll({
                    where: { pollId: { [Op.in]: pollIds } },
                    attributes: ['pollId', 'userId', 'createdAt'],
                    raw: true
                })
                : [];

            const firstVoteAtByPoll = {};
            allVotes.forEach(v => {
                const existing = firstVoteAtByPoll[v.pollId];
                if (!existing || new Date(v.createdAt) < new Date(existing)) {
                    firstVoteAtByPoll[v.pollId] = v.createdAt;
                }
            });
            const pollsById = new Map(polls.map(p => [p.id, p]));
            const lagsMinutes = Object.entries(firstVoteAtByPoll)
                .map(([pollId, firstAt]) => {
                    const p = pollsById.get(Number(pollId));
                    if (!p) return null;
                    return (new Date(firstAt) - new Date(p.createdAt)) / 60000;
                })
                .filter(v => v != null && v >= 0);
            const avgTimeToFirstVoteMinutes = lagsMinutes.length
                ? +(lagsMinutes.reduce((s, v) => s + v, 0) / lagsMinutes.length).toFixed(1)
                : null;

            const guestVoteCount = allVotes.filter(v => !v.userId).length;
            const registeredVoteCount = allVotes.filter(v => v.userId).length;

            // Reopen rate — of every poll that's EVER been closed (currently closed, or reopened
            // at least once, which implies it was closed before), how many came back at least once.
            const everClosed = polls.filter(p => p.status === 'closed' || p.reopenCount > 0);
            const everReopened = polls.filter(p => p.reopenCount > 0);
            const reopenRate = everClosed.length ? +(everReopened.length / everClosed.length * 100).toFixed(1) : null;

            return res.json({
                data,
                scope: { officeId: scope.officeId, label: scope.label },
                range: range ? { period: range.period, year: range.year, label: range.label } : null,
                stats: {
                    avgTimeToFirstVoteMinutes,
                    voteAuthorMix: [
                        { label: 'Registered', count: registeredVoteCount },
                        { label: 'Guest', count: guestVoteCount }
                    ],
                    reopenRate,
                    everClosedCount: everClosed.length,
                    reopenedCount: everReopened.length
                }
            });
        } catch (error) {
            console.error('Error fetching polls:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    getPoll: async (req, res) => {
        const { id } = req.params;
        const guestToken = req.query.guestToken || null;
        const isStaff = STAFF_ROLES.includes(req.role);
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const poll = await Poll.findByPk(id, {
                include: [
                    {
                        model: PollOffice,
                        as: 'pollOffices',
                        where: { isActive: true },
                        required: false,
                        include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }]
                    }
                ]
            });
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });

            if (scope.officeId) {
                const assigned = (poll.pollOffices || []).some(o => o.officeId === scope.officeId);
                if (!assigned) return res.status(403).json({ message: 'You do not have access to this poll.' });
            }

            const data = await shapePollForViewer(poll, { userId: req.userId, guestToken, isStaff });
            data.offices = (poll.pollOffices || []).map(o => o.office).filter(Boolean);
            return res.json({ data });
        } catch (error) {
            console.error('Error fetching poll:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Staff-only — question plus a list of option labels (min 2). Auto-assigns it to the
    // office(s) whose mandate it concerns, same AI-matching pattern discussions use at creation
    // time — a no-match just leaves it unassigned for a staff member to route via reassignOffice.
    createPoll: async (req, res) => {
        const { question, options, expiresAt } = req.body;
        if (!question || !Array.isArray(options) || options.filter(o => o && o.trim()).length < 2) {
            return res.status(400).json({ message: 'A question and at least two options are required.' });
        }
        try {
            const poll = await Poll.create({ question, expiresAt: expiresAt || null, createdBy: req.userId });
            await PollOption.bulkCreate(
                options.filter(o => o && o.trim()).map(label => ({ pollId: poll.id, label: label.trim() }))
            );

            await assignPollToOffices(io, poll);

            logActivity({
                module: 'poll', entityId: poll.id, action: 'created',
                actorId: req.userId, actorRole: req.role,
                description: `Created poll "${poll.question}"`
            });

            const created = await Poll.findByPk(poll.id, { include: [{ model: PollOption, as: 'options' }] });
            return res.status(201).json({ message: 'Poll created.', data: created });
        } catch (error) {
            console.error('Error creating poll:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Staff-facing preview: re-runs the same content-vs-mandate matching used at creation time and
    // returns the result WITHOUT persisting anything.
    suggestOffice: async (req, res) => {
        const { id } = req.params;
        try {
            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });
            const { matches } = await matchOfficesToPoll(poll.question);
            return res.status(200).json({
                suggestions: matches.map(({ office, reason }) => ({
                    officeId: office.id,
                    name: office.name,
                    alias: office.alias,
                    reason
                }))
            });
        } catch (error) {
            console.error('Error suggesting office for poll:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Super/admin-only (see route middleware) — corrects/sets which office(s) a poll is assigned
    // to. A true reassignment (sets the full active set), not additive — mirrors
    // DiscussionController.reassignOffice exactly.
    reassignOffice: async (req, res) => {
        const { id } = req.params;
        const { offices } = req.body;

        if (!Array.isArray(offices)) {
            return res.status(400).json({ message: 'offices must be an array of { officeId, reason? }.' });
        }

        try {
            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });

            const resolvedOffices = [];
            for (const entry of offices) {
                const officeId = parseInt(entry?.officeId, 10);
                if (!officeId) continue;
                const office = await Office.findByPk(officeId);
                if (!office) continue;
                resolvedOffices.push({ office, reason: entry.reason || null });
            }

            const keepIds = resolvedOffices.map(r => r.office.id);
            await PollOffice.update(
                { isActive: false },
                {
                    where: {
                        pollId: poll.id,
                        isActive: true,
                        ...(keepIds.length ? { officeId: { [Op.notIn]: keepIds } } : {})
                    }
                }
            );

            for (const { office, reason } of resolvedOffices) {
                const [assignment, created] = await PollOffice.findOrCreate({
                    where: { pollId: poll.id, officeId: office.id },
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
                module: 'poll', entityId: poll.id, action: 'reassigned',
                actorId: req.userId, actorRole: req.role,
                description: `Reassigned office(s) for poll "${poll.question}"`
            });

            return res.status(200).json({ message: 'Office(s) reassigned.' });
        } catch (error) {
            console.error('Error reassigning poll office:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Open to guests and citizens — softAuth attributes the vote to an account when logged in,
    // otherwise the client-generated guestToken is what prevents that browser voting twice.
    // Answering a poll from the staff side is reserved for super/admin; a workstation or
    // monitoring account may only view results, not cast a vote, even on a poll assigned to a
    // workstation's own office.
    vote: async (req, res) => {
        const { id } = req.params;
        const { optionId, guestToken } = req.body;

        if (['workstation', 'monitoring'].includes(req.role)) {
            return res.status(403).json({ message: 'Only Super/Admin can vote on polls from the staff dashboard.' });
        }
        if (!optionId) {
            return res.status(400).json({ message: 'optionId is required.' });
        }
        if (!req.userId && !guestToken) {
            return res.status(400).json({ message: 'guestToken is required when not logged in.' });
        }

        try {
            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });
            if (poll.status === 'closed' || isExpired(poll)) return res.status(400).json({ message: 'This poll is closed.' });

            const option = await PollOption.findOne({ where: { id: optionId, pollId: id } });
            if (!option) return res.status(400).json({ message: 'Unknown option for this poll.' });

            const existing = req.userId
                ? await PollVote.findOne({ where: { pollId: id, userId: req.userId } })
                : await PollVote.findOne({ where: { pollId: id, guestToken } });
            if (existing) {
                return res.status(409).json({ message: 'You\'ve already voted on this poll.' });
            }

            await PollVote.create({
                pollId: id,
                optionId,
                userId: req.userId || null,
                guestToken: req.userId ? null : guestToken
            });

            const data = await shapePollForViewer(poll, { userId: req.userId, guestToken });
            return res.status(201).json({ message: 'Vote recorded.', data });
        } catch (error) {
            // The unique index is the authoritative guard against a double-submit race —
            // surface it the same way as the pre-check above rather than a raw 500.
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'You\'ve already voted on this poll.' });
            }
            console.error('Error recording vote:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // A workstation user may only close/reopen a poll assigned to their own office; super/admin
    // can act on any.
    closePoll: async (req, res) => {
        const { id } = req.params;
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });

            if (scope.officeId) {
                const assigned = await PollOffice.findOne({ where: { pollId: id, officeId: scope.officeId, isActive: true } });
                if (!assigned) return res.status(403).json({ message: 'You do not have access to this poll.' });
            }

            await poll.update({ status: 'closed' });

            logActivity({
                module: 'poll', entityId: poll.id, action: 'closed',
                actorId: req.userId, actorRole: req.role,
                description: `Closed poll "${poll.question}"`
            });

            return res.status(200).json({ message: 'Poll closed.', data: poll });
        } catch (error) {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    reopenPoll: async (req, res) => {
        const { id } = req.params;
        try {
            const scope = await resolveOfficeScope(req);
            if (scope === null) return res.status(403).json({ message: 'You do not have access to this data.' });

            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Poll not found.' });

            if (scope.officeId) {
                const assigned = await PollOffice.findOne({ where: { pollId: id, officeId: scope.officeId, isActive: true } });
                if (!assigned) return res.status(403).json({ message: 'You do not have access to this poll.' });
            }

            // Only count a real closed->open transition — calling this on an already-open poll
            // (a no-op) shouldn't inflate the reopen-rate stat.
            const wasClosed = poll.status === 'closed';
            await poll.update({ status: 'open', reopenCount: wasClosed ? poll.reopenCount + 1 : poll.reopenCount });

            if (wasClosed) {
                logActivity({
                    module: 'poll', entityId: poll.id, action: 'reopened',
                    actorId: req.userId, actorRole: req.role,
                    description: `Reopened poll "${poll.question}"`
                });
            }

            return res.status(200).json({ message: 'Poll reopened.', data: poll });
        } catch (error) {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },
});
