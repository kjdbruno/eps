'use strict';

// Sample SURVEYS: polls with several questions, one of each answer type (short answer, paragraph, multiple choice,
// checkboxes), assigned to offices and answered by a spread of residents, so the survey screens have something to
// show beyond the one-question polls the main demo seeder makes.
//
// Run it:    npx sequelize-cli db:seed --seed 20261027020000-SurveyDemoSeeder.js
// Undo it:   npx sequelize-cli db:seed:undo --seed 20261027020000-SurveyDemoSeeder.js
//
// Running it again first removes what an earlier run made (the office assignments carry the mark below), and what
// was created through the app is never touched.
const {
    Poll, PollQuestion, PollOption, PollVote, PollAnswer, PollOffice, Office, User,
} = require('../models');

const MARK = 'Demo data (SurveyDemoSeeder).';
const DAY = 24 * 60 * 60 * 1000;

const SURVEYS = [
    {
        office: 'CICTO',
        title: 'How do you use the city\'s online services?',
        description: 'A short survey to learn which online services residents use, and what stops them from using more of them.',
        daysAgo: 20, endsInDays: 30, responses: 34,
        questions: [
            { type: 'short', prompt: 'Which barangay do you live in?', required: true,
              texts: ['Poblacion', 'Santo Rosario', 'San Jose', 'Dolores', 'Sindalan', 'Del Pilar', 'Lara', 'Telabastagan'] },
            { type: 'radio', prompt: 'How often do you use the city website or this app?', required: true,
              options: ['Almost every day', 'A few times a month', 'Only when I have to', 'Never'], lean: [1, 3, 4, 2] },
            { type: 'checkbox', prompt: 'Which online services have you used?', required: true,
              options: ['Filing feedback', 'Business permit', 'Civil registry request', 'Paying taxes and fees', 'Reading announcements'], lean: [5, 3, 3, 2, 4] },
            { type: 'paragraph', prompt: 'What would make the online services easier for you?', required: false,
              texts: [
                  'A simpler login and fewer steps to file something.',
                  'Text message updates so I do not have to keep checking.',
                  'More services I can finish fully online without going to city hall.',
                  'Tagalog instructions on every page, and clearer requirements.',
                  'It is already good, but sometimes the pages load slowly on my phone.',
              ] },
        ],
    },
    {
        office: 'CHO',
        title: 'Your experience at the city health centers',
        description: 'Tell us how your last visit went so the health centers can improve.',
        daysAgo: 12, endsInDays: 45, responses: 28,
        questions: [
            { type: 'radio', prompt: 'How long did you wait before being attended to?', required: true,
              options: ['Less than 15 minutes', '15 to 30 minutes', '30 minutes to an hour', 'More than an hour'], lean: [3, 4, 3, 1] },
            { type: 'checkbox', prompt: 'What did you go to the health center for?', required: true,
              options: ['Check-up', 'Vaccination', 'Maternal and child care', 'Medicines', 'Laboratory'], lean: [4, 3, 2, 3, 1] },
            { type: 'radio', prompt: 'Would you recommend your health center to a neighbor?', required: true,
              options: ['Yes', 'Maybe', 'No'], lean: [5, 2, 1] },
            { type: 'paragraph', prompt: 'Anything the health center should do differently?', required: false,
              texts: [
                  'Open earlier on weekdays so workers can come before their shift.',
                  'More chairs in the waiting area, and shade outside.',
                  'The staff are kind. Please keep the medicine supply stocked.',
                  'A number system so we know when we will be called.',
              ] },
            { type: 'short', prompt: 'Which health center did you visit?', required: false,
              texts: ['Poblacion', 'San Agustin', 'Dolores', 'Lara', 'Santo Nino'] },
        ],
    },
    {
        office: 'CTO',
        title: 'Paying your city taxes and fees',
        description: 'Help us make paying taxes and fees faster and easier.',
        daysAgo: 6, endsInDays: 20, responses: 22,
        questions: [
            { type: 'checkbox', prompt: 'How have you paid city taxes or fees before?', required: true,
              options: ['At the treasurer\'s counter', 'At a partner bank', 'Online', 'Through a collector'], lean: [5, 2, 3, 1] },
            { type: 'radio', prompt: 'How long did your last payment take, from arriving to receipt?', required: true,
              options: ['Under 15 minutes', '15 to 30 minutes', '30 to 60 minutes', 'More than an hour'], lean: [2, 4, 3, 2] },
            { type: 'short', prompt: 'What was the payment for?', required: false,
              texts: ['Real property tax', 'Business permit renewal', 'Market stall fee', 'Cedula', 'Garbage fee'] },
            { type: 'paragraph', prompt: 'What would make paying easier?', required: false,
              texts: [
                  'Show the computed amount online before I go to the counter.',
                  'More windows open during the busy last days of the month.',
                  'Let me pay by e-wallet.',
              ] },
        ],
    },
];

// a repeatable pick from a list, leaning towards the heavier weights
const weightedPick = (weights, seed) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let n = (seed * 7919) % total;
    for (let i = 0; i < weights.length; i++) {
        if (n < weights[i]) return i;
        n -= weights[i];
    }
    return 0;
};

const removePrevious = async () => {
    const links = await PollOffice.findAll({ where: { assignmentReason: MARK }, attributes: ['pollId'], raw: true });
    const ids = [...new Set(links.map(l => l.pollId))];
    if (!ids.length) return;
    const questions = await PollQuestion.findAll({ where: { pollId: ids }, attributes: ['id'], raw: true });
    await PollAnswer.destroy({ where: { questionId: questions.map(q => q.id) } });
    await PollVote.destroy({ where: { pollId: ids } });
    await PollOption.destroy({ where: { pollId: ids } });
    await PollQuestion.destroy({ where: { pollId: ids } });
    await PollOffice.destroy({ where: { pollId: ids } });
    await Poll.destroy({ where: { id: ids } });
};

module.exports = {
    async up() {
        await removePrevious();

        const creator = await User.findOne({ where: { role: 'super' }, attributes: ['id'] })
            || await User.findOne({ attributes: ['id'] });
        const createdBy = creator ? creator.id : null;

        for (const [index, def] of SURVEYS.entries()) {
            const office = await Office.findOne({ where: { alias: def.office } });
            if (!office) continue;

            const createdAt = new Date(Date.now() - def.daysAgo * DAY);
            const poll = await Poll.create({
                question: def.title,
                description: def.description,
                status: 'open',
                expiresAt: new Date(Date.now() + def.endsInDays * DAY),
                createdBy,
                createdAt,
                updatedAt: createdAt,
            });
            await PollOffice.create({ pollId: poll.id, officeId: office.id, isActive: true, assignedBy: 'admin', assignmentReason: MARK });

            const questions = [];
            for (const [position, q] of def.questions.entries()) {
                const row = await PollQuestion.create({
                    pollId: poll.id, type: q.type, prompt: q.prompt, required: q.required, position, createdAt, updatedAt: createdAt,
                });
                const options = [];
                for (const label of q.options || []) options.push(await PollOption.create({ pollId: poll.id, questionId: row.id, label }));
                questions.push({ def: q, row, options });
            }

            for (let r = 0; r < def.responses; r++) {
                const at = new Date(Math.min(createdAt.getTime() + (r + 1) * (def.daysAgo / (def.responses + 1)) * DAY, Date.now() - 60 * 1000));
                const response = await PollVote.create({
                    pollId: poll.id, optionId: null, userId: null, guestToken: `demo-survey-${poll.id}-${r}`, createdAt: at, updatedAt: at,
                });
                const answers = [];
                for (const [qi, q] of questions.entries()) {
                    const seed = r * 31 + qi * 17 + index * 5 + 3;
                    // a few people skip the questions that are not required
                    if (!q.def.required && seed % 5 === 0) continue;
                    if (q.def.type === 'radio') {
                        answers.push({ optionId: q.options[weightedPick(q.def.lean, seed)].id });
                    } else if (q.def.type === 'checkbox') {
                        const chosen = new Set();
                        q.options.forEach((o, oi) => { if ((seed * (oi + 3)) % 7 < q.def.lean[oi]) chosen.add(o.id); });
                        if (!chosen.size) chosen.add(q.options[seed % q.options.length].id);
                        chosen.forEach(optionId => answers.push({ optionId }));
                    } else {
                        answers.push({ text: q.def.texts[seed % q.def.texts.length] });
                    }
                    answers.slice(-1)[0].questionId = q.row.id;
                    // the checkbox rows above were pushed without it
                    answers.forEach(a => { if (!a.questionId) a.questionId = q.row.id; });
                }
                await PollAnswer.bulkCreate(answers.map(a => ({
                    voteId: response.id, questionId: a.questionId, optionId: a.optionId || null, text: a.text || null, createdAt: at, updatedAt: at,
                })));
            }
        }
    },

    async down() {
        await removePrevious();
    },
};
