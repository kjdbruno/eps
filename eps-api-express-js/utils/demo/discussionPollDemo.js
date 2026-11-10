'use strict';

// Demo discussions and polls for EVERY office: one discussion and one poll about each office's own
// work, assigned to that office (so a workstation account sees its own and super/admin see all of
// them), with a few comments on each discussion and a spread of votes on each poll.
//
// Most are open with an end date still ahead. A few are on purpose in the other states so every
// screen can be tried: some are closed, and one discussion and one poll are "open" but past their
// end date (shown as expired). Comments are posted under a display name and votes under a guest
// token, so nothing here depends on any citizen account existing.
//
// Not a seeder on its own: 20261026030000-EpsDemoDataSeeder.js calls up()/down() below.
//
// Everything it creates is recognisable by its office assignment reason (MARK below), so undoing it
// removes exactly these rows and nothing that was created through the app.
const {
    Discussion, DiscussionOffice, DiscussionComment,
    Poll, PollQuestion, PollOption, PollVote, PollAnswer, PollOffice,
    Office, User,
} = require('../../models');

const MARK = 'Demo data (DiscussionPollDemoSeeder).';

// state: 'open' (default) | 'closed' | 'expired'
const TOPICS = {
    CICTO: {
        discussion: { title: 'Free public Wi-Fi: where should the next hotspots go?', description: 'The City is looking at adding free Wi-Fi hotspots. Tell us which public places you would use them in, and what speed or hours matter to you.' },
        poll: { question: 'Where would free city Wi-Fi help you most?', options: ['City hall and public offices', 'The public market', 'Parks and the plaza', 'Schools and libraries'] },
    },
    PIO: {
        discussion: { title: 'How should the City share announcements with you?', description: 'Advisories, road closures and events reach people in different ways. Which channels do you actually read, and what is missing?' },
        poll: { question: 'Where do you first look for city announcements?', options: ['The city Facebook page', 'Text messages', 'Radio', 'The city website or this app'] },
    },
    ADM: {
        discussion: { title: 'Making city hall transactions faster', description: 'Long lines and repeated trips are a common complaint. Share which transaction took you the longest and what would have helped.', state: 'closed' },
        poll: { question: 'What would speed up your city hall visits the most?', options: ['A queue number you can get from your phone', 'More windows open at peak hours', 'Clearer lists of requirements', 'Doing more of it online'] },
    },
    AGR: {
        discussion: { title: 'Support for local farmers this planting season', description: 'What kind of help would make the biggest difference for farmers and fisherfolk: seeds, tools, training, or market access?' },
        poll: { question: 'Which farm support should the City prioritize?', options: ['Seeds and fertilizer', 'Farm tools and equipment', 'Training and seminars', 'Selling your harvest at fair prices'] },
    },
    CHO: {
        discussion: { title: 'Health center hours and services', description: 'Are the health centers open when you can go? Tell us which hours, services or check-ups you need most.' },
        poll: { question: 'When is it easiest for you to visit a health center?', options: ['Weekday mornings', 'Weekday afternoons', 'Early evening', 'Saturdays'] },
    },
    CLO: {
        discussion: { title: 'Free legal advice for residents', description: 'The City is considering regular legal clinics. What kinds of questions would you bring: land, family, labor, or something else?' },
        poll: { question: 'What would you most want free legal advice on?', options: ['Land and property', 'Family matters', 'Work and wages', 'Business and permits'] },
    },
    CTO: {
        discussion: { title: 'Paying taxes and fees: what is hard about it?', description: 'Paying at the counter, by bank or online: what works and what does not? Your experience will guide which options we improve first.' },
        poll: { question: 'How do you prefer to pay city taxes and fees?', options: ['At the treasurer\'s counter', 'At a partner bank', 'Online', 'Through a collector who comes to me'] },
    },
    OCE: {
        discussion: { title: 'Which roads and drains need work first?', description: 'Potholes, flooding streets and blocked canals: tell us the roads and drains in your area that most need repair, and how long they have been a problem.' },
        poll: { question: 'Which public works should come first?', options: ['Road repair', 'Drainage and canals', 'Sidewalks and covered walkways', 'Streetlights'] },
    },
    CENRO: {
        discussion: { title: 'Segregating waste at home: what would help?', description: 'Garbage collection works best when waste is sorted. What stops you from segregating at home, and what would make it easier?' },
        poll: { question: 'What would help you sort your garbage?', options: ['Separate bins given by the City', 'Clear pickup schedules by type of waste', 'Information on what goes where', 'Rewards for barangays that do it well'] },
    },
    GSO: {
        discussion: { title: 'Public buildings and facilities you use', description: 'Which city buildings, restrooms or meeting halls do you use, and what condition are they in? Tell us what needs fixing.' },
        poll: { question: 'Which public facility most needs improving?', options: ['Public restrooms', 'Barangay and community halls', 'Covered courts', 'City hall itself'] },
    },
    EEM: {
        discussion: { title: 'A cleaner, safer public market', description: 'From drainage to stall layout to cleanliness: share what would make shopping and selling in the public market better.' },
        poll: { question: 'What should the public market fix first?', options: ['Drainage and flooding', 'Cleanliness of walkways', 'Stall layout and space', 'Parking and loading areas'], state: 'closed' },
    },
    OCA: {
        discussion: { title: 'Understanding your property assessment', description: 'Many people find real property assessments confusing. What would you like explained, and how would you like to be informed of changes?' },
        poll: { question: 'How would you like to learn about changes to your property assessment?', options: ['A letter at home', 'A text message', 'A notice at the barangay hall', 'In this app'] },
    },
    OPS: {
        discussion: { title: 'Traffic and public safety in your barangay', description: 'Where do you feel unsafe, or see traffic problems that put people at risk? Tell us the place and the time of day.' },
        poll: { question: 'What would improve safety in your area the most?', options: ['More traffic enforcers at peak hours', 'More streetlights', 'Better pedestrian crossings', 'More patrols at night'] },
    },
    OSSP: {
        discussion: { title: 'Which local laws should the City look at?', description: 'The Sangguniang Panlungsod writes and reviews local ordinances. Is there a rule you think should change, or a new one the City needs?', state: 'expired' },
        poll: { question: 'Which topic should the next ordinance cover?', options: ['Traffic and parking', 'Waste and cleanliness', 'Noise and public order', 'Support for small business'] },
    },
    PDO: {
        discussion: { title: 'How should the city grow over the next ten years?', description: 'Housing, roads, parks and business areas all compete for space. Share what you would like your neighbourhood to look like.' },
        poll: { question: 'What should the City plan for first?', options: ['Affordable housing', 'More green space and parks', 'Better public transport', 'Areas for business'], state: 'expired' },
    },
    LEBDO: {
        discussion: { title: 'Getting a business permit: what slows you down?', description: 'Starting or renewing a business takes many steps. Tell us which step is the hardest, and what would make it simpler.' },
        poll: { question: 'What would make getting a business permit easier?', options: ['One window for all requirements', 'Applying fully online', 'A clear checklist up front', 'Faster approval'] },
    },
    REG: {
        discussion: { title: 'Civil registry documents: waiting and requirements', description: 'Birth, marriage and death records are needed often and urgently. Share what has been confusing or slow when requesting or correcting one.' },
        poll: { question: 'How would you like to request civil registry documents?', options: ['At the registrar\'s office', 'Online, delivered to me', 'Through my barangay', 'By mail'] },
    },
    CSWD: {
        discussion: { title: 'Help for senior citizens, persons with disabilities and solo parents', description: 'Which assistance programs do you know about, and which are hard to apply for? Tell us what support is missing.' },
        poll: { question: 'Which social support matters most to your family?', options: ['Assistance for senior citizens', 'Support for persons with disabilities', 'Help for solo parents', 'Programs for children and youth'] },
    },
    VET: {
        discussion: { title: 'Stray animals and pet care in the city', description: 'Stray dogs and cats worry many residents. Share what you would like the City to do about strays, and what pet owners need.' },
        poll: { question: 'What should the City do first about stray animals?', options: ['Free vaccination and spaying', 'Regular pickup of strays', 'Rules and fines for pet owners', 'A city animal shelter'] },
    },
};

// For an office this file does not know (one added later, or a test office): a general topic.
const generic = (office) => ({
    discussion: {
        title: `How can ${office.alias || office.name} serve you better?`,
        description: `Tell us what you need from ${office.name} and what would make its services easier to use.`,
    },
    poll: {
        question: `What should ${office.alias || office.name} improve first?`,
        options: ['Waiting time', 'Clearer information', 'Online services', 'Staff assistance'],
    },
});

const NAMES = [
    'Maria S.', 'Jose R.', 'Ana L.', 'Ramon C.', 'Liza M.', 'Pedro D.', 'Grace T.', 'Noel B.', 'Carla V.', 'Eric P.',
    'Joy A.', 'Mark G.', 'Rina F.', 'Ben O.', 'Tess H.',
];
const COMMENTS = [
    'This has been a problem in our area for a long time. Thank you for asking.',
    'I agree. A clear schedule or notice would already help a lot.',
    'In my experience the biggest issue is the waiting time. More staff at peak hours would help.',
    'Please also consider the barangays farther from the center, where services are harder to reach.',
    'I would suggest starting with a pilot in one area and asking residents how it went.',
    'Good topic. It would help to see updates here as things change.',
    'Our family has run into this more than once. A simple checklist would save us a trip.',
    'Thank you for making it easy to share our thoughts. I hope it leads to action.',
];

const DAY = 24 * 60 * 60 * 1000;

// What gets made for each office, worked out without touching the database (also what the test of
// this seeder looks at): the state of each discussion and poll, when it was opened, when it ends.
const plan = (offices, now = new Date()) => offices.map((office, i) => {
    const topic = TOPICS[office.alias] || generic(office);
    const dState = topic.discussion.state || 'open';
    const pState = topic.poll.state || 'open';
    const when = (daysAgo) => new Date(now.getTime() - daysAgo * DAY);
    const ends = (state, daysAhead) => (state === 'expired' ? new Date(now.getTime() - 9 * DAY) : new Date(now.getTime() + daysAhead * DAY));
    return {
        office,
        discussion: {
            ...topic.discussion,
            status: dState === 'closed' ? 'closed' : 'open',
            createdAt: when(18 - (i % 9)),
            expiresAt: dState === 'closed' ? null : ends(dState, 30 + (i % 5) * 12),
            commentCount: 2 + (i % 3),
        },
        poll: {
            ...topic.poll,
            status: pState === 'closed' ? 'closed' : 'open',
            createdAt: when(14 - (i % 7)),
            expiresAt: pState === 'closed' ? null : ends(pState, 21 + (i % 4) * 15),
            voteCount: 6 + (i % 5) * 3,
        },
    };
});

module.exports = {
    plan,

    async up() {
        // already run: do nothing the second time
        if (await DiscussionOffice.count({ where: { assignmentReason: MARK } })) return;

        const offices = await Office.findAll({ where: { isActive: true }, order: [['id', 'ASC']], raw: true });
        if (!offices.length) return;

        const maker = await User.findOne({ where: { role: 'super' }, order: [['id', 'ASC']], raw: true })
            || await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']], raw: true });
        const createdBy = maker ? maker.id : null;

        for (const item of plan(offices)) {
            const { office, discussion: d, poll: p } = item;

            // ---- the discussion, assigned to the office, with a few comments
            const discussion = await Discussion.create({
                title: d.title,
                description: d.description,
                status: d.status,
                expiresAt: d.expiresAt,
                createdBy,
                createdAt: d.createdAt,
                updatedAt: d.createdAt,
            });
            await DiscussionOffice.create({
                discussionId: discussion.id,
                officeId: office.id,
                isActive: true,
                assignedBy: 'admin',
                assignmentReason: MARK,
            });
            for (let n = 0; n < d.commentCount; n++) {
                // comments arrive over the days after it opened, but never after the end date
                const at = new Date(Math.min(d.createdAt.getTime() + (n + 1) * 2 * DAY, Date.now() - 60 * 1000));
                await DiscussionComment.create({
                    discussionId: discussion.id,
                    userId: null,
                    guestName: NAMES[(office.id + n * 4) % NAMES.length],
                    content: COMMENTS[(office.id + n * 3) % COMMENTS.length],
                    createdAt: at,
                    updatedAt: at,
                });
            }

            // ---- the poll, assigned to the office, with its choices and a spread of votes
            const poll = await Poll.create({
                question: p.question,
                status: p.status,
                expiresAt: p.expiresAt,
                createdBy,
                createdAt: p.createdAt,
                updatedAt: p.createdAt,
            });
            await PollOffice.create({
                pollId: poll.id,
                officeId: office.id,
                isActive: true,
                assignedBy: 'admin',
                assignmentReason: MARK,
            });
            // each demo poll is a one-question survey (multiple choice)
            const question = await PollQuestion.create({
                pollId: poll.id, type: 'radio', prompt: p.question, required: true, position: 0,
                createdAt: p.createdAt, updatedAt: p.createdAt,
            });
            const options = [];
            for (const label of p.options) options.push(await PollOption.create({ pollId: poll.id, questionId: question.id, label }));
            for (let v = 0; v < p.voteCount; v++) {
                // a lean towards the first choices, so the results are not all even
                const pick = options[[0, 0, 0, 1, 1, 2, 3][(v + office.id) % 7] % options.length];
                const at = new Date(Math.min(p.createdAt.getTime() + (v + 1) * 0.6 * DAY, Date.now() - 60 * 1000));
                const response = await PollVote.create({
                    pollId: poll.id,
                    optionId: null,
                    userId: null,
                    guestToken: `demo-seed-${poll.id}-${v}`,
                    createdAt: at,
                    updatedAt: at,
                });
                await PollAnswer.create({ voteId: response.id, questionId: question.id, optionId: pick.id, createdAt: at, updatedAt: at });
            }
        }
    },

    async down() {
        // exactly what this seeder made: the office assignments carry its mark
        const dLinks = await DiscussionOffice.findAll({ where: { assignmentReason: MARK }, attributes: ['discussionId'], raw: true });
        const pLinks = await PollOffice.findAll({ where: { assignmentReason: MARK }, attributes: ['pollId'], raw: true });
        const discussionIds = [...new Set(dLinks.map(l => l.discussionId))];
        const pollIds = [...new Set(pLinks.map(l => l.pollId))];

        if (discussionIds.length) {
            await DiscussionComment.destroy({ where: { discussionId: discussionIds } });
            await DiscussionOffice.destroy({ where: { discussionId: discussionIds } });
            await Discussion.destroy({ where: { id: discussionIds } });
        }
        if (pollIds.length) {
            await PollAnswer.destroy({ where: { questionId: (await PollQuestion.findAll({ where: { pollId: pollIds }, attributes: ['id'], raw: true })).map(q => q.id) } });
            await PollVote.destroy({ where: { pollId: pollIds } });
            await PollOption.destroy({ where: { pollId: pollIds } });
            await PollQuestion.destroy({ where: { pollId: pollIds } });
            await PollOffice.destroy({ where: { pollId: pollIds } });
            await Poll.destroy({ where: { id: pollIds } });
        }
    },
};
