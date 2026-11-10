const { Op } = require('sequelize');
const { Poll, PollQuestion, PollOption, PollVote, PollAnswer, PollOffice, User, Office, Staff, Notification, sequelize } = require('../models');
const { askLLM, hasLLM } = require('../utils/llm');
const { resolvePeriodRange } = require('../utils/periodRange');
const { pushNotifications } = require('../utils/notifySocket');
const { logActivity } = require('../utils/activityLog');
const { emitChanged } = require('../utils/realtime');

// A poll is a survey: a title and description, and any number of questions, each answered in its own way.
const QUESTION_TYPES = ['short', 'paragraph', 'radio', 'checkbox'];
const isChoice = (type) => type === 'radio' || type === 'checkbox';
const MAX_TEXT = 2000;

// Shapes a survey for a specific viewer (identified by userId if logged in, guestToken if not): every question with
// its choices and how many chose each, but only when the viewer has already answered, the survey is closed, or the
// viewer is staff managing it (isStaff) — hiding running results before you answer avoids bandwagon bias for a
// citizen, but staff need to see live results regardless. What people typed (short answers and paragraphs) is only
// ever sent to staff (withAnswers), never to another citizen.
const shapePollForViewer = async (poll, { userId, guestToken, isStaff, withAnswers = false }) => {
    const questions = await PollQuestion.findAll({
        where: { pollId: poll.id },
        include: [{
            model: PollOption,
            as: 'options',
            required: false,
            include: [{ model: PollAnswer, as: 'answers', attributes: ['id', 'voteId'], required: false }]
        }],
        order: [['position', 'ASC'], ['id', 'ASC'], [{ model: PollOption, as: 'options' }, 'id', 'ASC']]
    });

    let myVote = null;
    if (userId) {
        myVote = await PollVote.findOne({ where: { pollId: poll.id, userId }, include: [{ model: PollAnswer, as: 'answers' }] });
    } else if (guestToken) {
        myVote = await PollVote.findOne({ where: { pollId: poll.id, guestToken }, include: [{ model: PollAnswer, as: 'answers' }] });
    }

    const hasVoted = !!myVote;
    const showResults = hasVoted || poll.status === 'closed' || isExpired(poll) || isStaff;
    const totalVotes = await PollVote.count({ where: { pollId: poll.id } });
    const myAnswers = myVote ? myVote.answers : [];

    // what people typed, newest first, for the text questions (staff only)
    let typed = [];
    const textIds = questions.filter(q => !isChoice(q.type)).map(q => q.id);
    if (withAnswers && isStaff && textIds.length) {
        typed = await PollAnswer.findAll({
            where: { questionId: { [Op.in]: textIds }, text: { [Op.ne]: null } },
            include: [{
                model: PollVote, as: 'vote', attributes: ['id', 'userId', 'guestToken', 'createdAt'],
                include: [{ model: User, as: 'user', attributes: ['firstname', 'lastname'], required: false }]
            }],
            order: [['id', 'DESC']],
            limit: 500
        });
    }

    const shapedQuestions = questions.map(q => {
        const choice = isChoice(q.type);
        // how many responses answered this question at all (a checkbox question can have several rows per response)
        const respondents = new Set();
        q.options.forEach(o => o.answers.forEach(x => respondents.add(x.voteId)));
        const textAnswers = typed.filter(t => t.questionId === q.id);
        const answered = choice ? respondents.size : textAnswers.length;
        const mine = myAnswers.filter(x => x.questionId === q.id);
        return {
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            required: q.required,
            position: q.position,
            answered,
            options: choice ? q.options.map(o => ({
                id: o.id,
                label: o.label,
                // Counts are only meaningful to the client once showResults is true — sent regardless
                // (nothing sensitive in a tally) but the UI hides them until then.
                votes: o.answers.length,
                percent: showResults && respondents.size ? Math.round((o.answers.length / respondents.size) * 100) : null
            })) : [],
            myOptionIds: mine.filter(x => x.optionId).map(x => x.optionId),
            myText: mine.find(x => x.text)?.text || null,
            answers: withAnswers && isStaff && !choice
                ? textAnswers.map(t => ({
                    id: t.id,
                    text: t.text,
                    createdAt: t.createdAt,
                    author: t.vote?.user ? `${t.vote.user.firstname || ''} ${t.vote.user.lastname || ''}`.trim() : 'Guest'
                }))
                : undefined
        };
    });

    // Older clients know one question with options: the first choice question stands in for it.
    const firstChoice = shapedQuestions.find(q => isChoice(q.type));

    return {
        id: poll.id,
        question: poll.question,
        description: poll.description || null,
        status: poll.status,
        createdAt: poll.createdAt,
        expiresAt: poll.expiresAt,
        isExpired: isExpired(poll),
        reopenCount: poll.reopenCount,
        hasVoted,
        myOptionId: firstChoice?.myOptionIds?.[0] || null,
        totalVotes,
        questionCount: shapedQuestions.length,
        questions: shapedQuestions,
        options: firstChoice ? firstChoice.options : [],
        showResults
    };
};

const isExpired = (poll) => !!poll.expiresAt && new Date(poll.expiresAt) < new Date();

// The same check as for discussions: an expiry date given when opening a poll must be a real date
// that is still ahead, or the poll would be "open" and expired at once and take no votes.
const expiryProblem = (expiresAt) => {
    if (!expiresAt) return null;
    const when = new Date(expiresAt);
    if (Number.isNaN(when.getTime())) return 'The expiry date is not a valid date.';
    if (when <= new Date()) return 'The expiry date must be in the future.';
    return null;
};

// What a creator sends for the questions, checked and cleaned. Returns { error } or { questions }.
const cleanQuestions = (input) => {
    if (!Array.isArray(input) || !input.length) return { error: 'Add at least one question.' };
    if (input.length > 50) return { error: 'A survey can have up to 50 questions.' };
    const questions = [];
    for (let i = 0; i < input.length; i++) {
        const q = input[i] || {};
        const prompt = String(q.prompt || '').trim();
        const type = QUESTION_TYPES.includes(q.type) ? q.type : null;
        const n = i + 1;
        if (!type) return { error: `Question ${n}: choose how it is answered.` };
        if (!prompt) return { error: `Question ${n}: write the question.` };
        if (prompt.length > 500) return { error: `Question ${n} is too long (500 characters at most).` };
        let options = [];
        if (isChoice(type)) {
            options = [...new Set((Array.isArray(q.options) ? q.options : []).map(o => String(o || '').trim()).filter(Boolean))];
            if (options.length < 2) return { error: `Question ${n}: give at least two choices.` };
            if (options.length > 20) return { error: `Question ${n}: up to 20 choices.` };
        }
        questions.push({ type, prompt, required: q.required !== false, position: i, options });
    }
    return { questions };
};

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
const matchOfficesToPoll = async (surveyText) => {
    const empty = { matches: [] };
    if (!hasLLM() || !surveyText) return empty;

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
                'stated mandate below — there is no category system, match the survey\'s subject directly ' +
                'to a mandate. Reply with ONLY a JSON object, no other text and no markdown fences, in ' +
                'exactly this shape: {"offices": [{"officeId": <number>, "reason": "<one short sentence ' +
                'tying the question to that department\'s mandate>"}]}. Usually pick just one department; ' +
                'only include more than one when the question genuinely spans multiple mandates. If ' +
                'nothing confidently matches, reply {"offices": []}.',
            prompt: `Departments (id: name — mandate):\n${officeList}\n\nSurvey:\n${surveyText}`,
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

// The text the office matching reads: the title, the description and every question.
const surveyTextOf = async (poll) => {
    const questions = await PollQuestion.findAll({ where: { pollId: poll.id }, order: [['position', 'ASC']], attributes: ['prompt'], raw: true });
    return [`Title: ${poll.question}`, poll.description ? `About: ${poll.description}` : '', ...questions.map((q, i) => `Question ${i + 1}: ${q.prompt}`)]
        .filter(Boolean).join('\n');
};

// Persists whatever matchOfficesToPoll found. Never fails poll creation — matching is
// best-effort. Returns false when nothing matched, leaving the poll unassigned for a staff
// member to route manually via reassignOffice below.
const assignPollToOffices = async (io, poll, surveyText) => {
    const { matches } = await matchOfficesToPoll(surveyText || poll.question);
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

            const data = await shapePollForViewer(poll, { userId: req.userId, guestToken, isStaff, withAnswers: true });
            data.offices = (poll.pollOffices || []).map(o => o.office).filter(Boolean);
            return res.json({ data });
        } catch (error) {
            console.error('Error fetching poll:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Staff-only — a title, a description and the questions, each with the way it is answered (short answer,
    // paragraph, multiple choice or checkboxes; the last two with at least two choices). Auto-assigns it to the
    // office(s) whose mandate it concerns, same AI-matching pattern discussions use at creation time — a
    // no-match just leaves it unassigned for a staff member to route via reassignOffice. The old shape (one
    // `question` and a list of `options`) is still accepted: it becomes a one-question survey.
    createPoll: async (req, res) => {
        const { question, description, expiresAt } = req.body;
        let { questions } = req.body;
        if (!questions && Array.isArray(req.body.options)) {
            questions = [{ type: 'radio', prompt: question, options: req.body.options }];
        }
        if (!question || !String(question).trim()) {
            return res.status(400).json({ message: 'A title is required.' });
        }
        const cleaned = cleanQuestions(questions);
        if (cleaned.error) return res.status(400).json({ message: cleaned.error });
        const badExpiry = expiryProblem(expiresAt);
        if (badExpiry) return res.status(400).json({ message: badExpiry });
        try {
            const poll = await sequelize.transaction(async (transaction) => {
                const created = await Poll.create({
                    question: String(question).trim(),
                    description: description && String(description).trim() ? String(description).trim() : null,
                    expiresAt: expiresAt || null,
                    createdBy: req.userId
                }, { transaction });
                for (const q of cleaned.questions) {
                    const row = await PollQuestion.create({
                        pollId: created.id, type: q.type, prompt: q.prompt, required: q.required, position: q.position
                    }, { transaction });
                    if (q.options.length) {
                        await PollOption.bulkCreate(
                            q.options.map(label => ({ pollId: created.id, questionId: row.id, label })),
                            { transaction }
                        );
                    }
                }
                return created;
            });

            await assignPollToOffices(io, poll, await surveyTextOf(poll));

            logActivity({
                module: 'poll', entityId: poll.id, action: 'created',
                actorId: req.userId, actorRole: req.role,
                description: `Created survey "${poll.question}" (${cleaned.questions.length} question${cleaned.questions.length === 1 ? '' : 's'})`
            });

            const data = await shapePollForViewer(poll, { userId: req.userId, isStaff: true });
            return res.status(201).json({ message: 'Survey created.', data });
        } catch (error) {
            console.error('Error creating survey:', error);
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
            const { matches } = await matchOfficesToPoll(await surveyTextOf(poll));
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

    // Needs a logged-in account (the route uses verifyToken), so the response is always attributed to that
    // user; the guestToken path below only remains for votes cast before guests were stopped from voting.
    // Answering from the staff side is reserved for super/admin; a workstation or monitoring account may only
    // view results.
    //
    // The body is { answers: [{ questionId, optionIds?: [..], optionId?, text? }] }: one entry per question, the
    // chosen option(s) for a multiple choice / checkbox question, the text for a short answer / paragraph.
    // The old shape { optionId } still works for a survey that has a single question.
    vote: async (req, res) => {
        const { id } = req.params;
        const { guestToken } = req.body;

        if (['workstation', 'monitoring'].includes(req.role)) {
            return res.status(403).json({ message: 'Only Super/Admin can answer surveys from the staff dashboard.' });
        }
        if (!req.userId && !guestToken) {
            return res.status(400).json({ message: 'guestToken is required when not logged in.' });
        }

        try {
            const poll = await Poll.findByPk(id);
            if (!poll) return res.status(404).json({ message: 'Survey not found.' });
            if (poll.status === 'closed' || isExpired(poll)) return res.status(400).json({ message: 'This survey is closed.' });

            const questions = await PollQuestion.findAll({
                where: { pollId: id },
                include: [{ model: PollOption, as: 'options', required: false }],
                order: [['position', 'ASC'], ['id', 'ASC']]
            });
            if (!questions.length) return res.status(400).json({ message: 'This survey has no questions.' });

            let given = req.body.answers;
            if (!Array.isArray(given) && req.body.optionId && questions.length === 1) {
                given = [{ questionId: questions[0].id, optionIds: [req.body.optionId] }];
            }
            if (!Array.isArray(given)) return res.status(400).json({ message: 'answers is required.' });
            const byQuestion = new Map(given.map(a => [parseInt(a?.questionId, 10), a]));

            const rows = [];
            for (const q of questions) {
                const a = byQuestion.get(q.id) || {};
                if (isChoice(q.type)) {
                    const raw = Array.isArray(a.optionIds) ? a.optionIds : (a.optionId ? [a.optionId] : []);
                    const ids = [...new Set(raw.map(n => parseInt(n, 10)).filter(Boolean))];
                    if (q.type === 'radio' && ids.length > 1) {
                        return res.status(400).json({ message: `Choose only one answer for: "${q.prompt}"` });
                    }
                    if (ids.some(oid => !q.options.some(o => o.id === oid))) {
                        return res.status(400).json({ message: `Unknown choice for: "${q.prompt}"` });
                    }
                    if (q.required && !ids.length) {
                        return res.status(400).json({ message: `Please answer: "${q.prompt}"` });
                    }
                    ids.forEach(oid => rows.push({ questionId: q.id, optionId: oid, text: null }));
                } else {
                    const text = String(a.text || '').trim().slice(0, MAX_TEXT);
                    if (q.required && !text) {
                        return res.status(400).json({ message: `Please answer: "${q.prompt}"` });
                    }
                    if (text) rows.push({ questionId: q.id, optionId: null, text });
                }
            }
            if (!rows.length) return res.status(400).json({ message: 'Answer at least one question.' });

            const existing = req.userId
                ? await PollVote.findOne({ where: { pollId: id, userId: req.userId } })
                : await PollVote.findOne({ where: { pollId: id, guestToken } });
            if (existing) {
                return res.status(409).json({ message: 'You\'ve already answered this survey.' });
            }

            await sequelize.transaction(async (transaction) => {
                const response = await PollVote.create({
                    pollId: id,
                    optionId: null,
                    userId: req.userId || null,
                    guestToken: req.userId ? null : guestToken
                }, { transaction });
                await PollAnswer.bulkCreate(rows.map(r => ({ ...r, voteId: response.id })), { transaction });
            });

            emitChanged('poll', 'answered');
            const data = await shapePollForViewer(poll, { userId: req.userId, guestToken });
            return res.status(201).json({ message: 'Response recorded.', data });
        } catch (error) {
            // The unique index is the authoritative guard against a double-submit race —
            // surface it the same way as the pre-check above rather than a raw 500.
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'You\'ve already answered this survey.' });
            }
            console.error('Error recording response:', error);
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
            // A passed expiry date would leave it "open" but taking no votes, so reopening clears it
            // (no expiry); a date still ahead is kept.
            const expiresAt = isExpired(poll) ? null : poll.expiresAt;
            await poll.update({
                status: 'open',
                expiresAt,
                reopenCount: wasClosed ? poll.reopenCount + 1 : poll.reopenCount
            });

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
