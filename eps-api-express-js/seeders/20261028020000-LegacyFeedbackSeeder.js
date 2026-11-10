'use strict';

// The FEEDBACK of the previous system, in this app's structure. Needs the offices (OfficeSeeder) and the users
// (LegacyUserSeeder) first: a feedback is attached to its client by email, and what its staff did to their accounts.
//
// How an old feedback becomes a Complaint here:
//   - status      completed -> completed, being handled -> ongoing, just filed -> ongoing (unassigned when none of its
//                 offices exists here), switched off -> cancelled. Reference number: EPS + date + L + the old id.
//   - offices     each old office is matched to this app's office by code (EAS -> OCE, CPIO -> PIO, ...). An office that
//                 is missing here (the OfficeSeeder was not run) gets no row; the history says it was routed there. The
//                 acknowledgement of an office is its ComplaintOffice row (received at / by) plus the response it posted;
//                 deadlines follow today's rules (1 day to acknowledge, 3 more to resolve).
//   - responses   every reply stays a Response, with its attachment and the client's rating. The old system's "mark as
//                 completed" notice is the supervisor completing it here (completedAt + history), so it is not kept as
//                 a message, except when somebody rated it.
//   - people      the clients and the staff are the accounts made by LegacyUserSeeder, found by the old person. Should a
//                 staff account be missing (that seeder only did the clients), what the person did is attributed to this
//                 app's accounts instead: an office's staff to a workstation account of the matching office (any
//                 supervisor when the office has none), an old supervisor to one of the super/admin accounts, always
//                 the same one for the same person.
//
// The data is in seeders/data/legacy (see utils/legacy/buildSeedData.js for how it was made).
//
// Run it:    npx sequelize-cli db:seed --seed 20261028020000-LegacyFeedbackSeeder.js
// Undo it:   npx sequelize-cli db:seed:undo --seed 20261028020000-LegacyFeedbackSeeder.js
//
// Running it again first removes what an earlier run put in (the reference numbers EPS........L....), so it never
// piles up duplicates. Feedback made through the app, and the demo feedback (EPSDEMO...), is never touched.
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { Op } = require('sequelize');
const {
    Complaint, ComplaintDetail, ComplaintOffice, ComplaintHistory, ComplaintFile,
    Response, ResponseFile, ResponseRating, Office, User, Staff, Citizen,
} = require('../models');
const { computeReceiveDeadline, computeResolutionDeadline } = require('../utils/businessHours');

const DATA = path.join(__dirname, 'data/legacy');
const feedback = require('./data/legacy/feedback.json');
const legacyStaff = require('./data/legacy/staff.json');

const REF_PATTERN = '^EPS[0-9]{8}L[0-9]{4}$';
const MIME = { jpg: 'image/jpeg', png: 'image/png' };

const dataUri = (file) => {
    const ext = path.extname(file.path).slice(1).toLowerCase();
    return `data:${MIME[ext] || 'image/jpeg'};base64,${fs.readFileSync(path.join(DATA, file.path)).toString('base64')}`;
};
const fullName = (u) => `${u.firstname || ''} ${u.lastname || ''}`.trim();
const listOf = (items) => items.join(', ');

// ------------------------------------------------------------------------------ cleanup
const removeFeedback = async () => {
    const rows = await Complaint.findAll({ where: { referenceNo: { [Op.regexp]: REF_PATTERN } }, attributes: ['id'], raw: true });
    const ids = rows.map(r => r.id);
    if (!ids.length) return 0;
    const responseIds = (await Response.findAll({ where: { complaintId: ids }, attributes: ['id'], raw: true })).map(r => r.id);
    if (responseIds.length) {
        await ResponseRating.destroy({ where: { responseId: responseIds } });
        await ResponseFile.destroy({ where: { responseId: responseIds } });
    }
    await Response.destroy({ where: { complaintId: ids } });
    await ComplaintHistory.destroy({ where: { complaintId: ids } });
    await ComplaintFile.destroy({ where: { complaintId: ids } });
    await ComplaintOffice.destroy({ where: { complaintId: ids } });
    await ComplaintDetail.destroy({ where: { complaintId: ids } });
    await Complaint.destroy({ where: { id: ids } });
    return ids.length;
};

// ------------------------------------------------------------------------------ seed
const seedFeedback = async () => {
    const offices = await Office.findAll({ attributes: ['id', 'alias'], raw: true });
    const officeByAlias = new Map(offices.map(o => [o.alias, o]));
    const officeAlias = new Map(offices.map(o => [o.id, o.alias]));

    const citizens = await Citizen.findAll({ attributes: ['userId', 'email'], include: { model: User, as: 'user', attributes: ['firstname', 'lastname'] } });
    const clientByEmail = new Map(citizens.map(c => [c.email.toLowerCase(), { id: c.userId, name: fullName(c.user) }]));
    if (!clientByEmail.size) {
        console.log('LegacyFeedbackSeeder: there are no citizen accounts, run LegacyUserSeeder first.');
        return;
    }

    const supervisors = await User.findAll({ where: { role: ['super', 'admin'] }, attributes: ['id', 'firstname', 'lastname', 'role'], order: [['id', 'ASC']], raw: true });
    const workstations = await User.findAll({ where: { role: 'workstation' }, attributes: ['id', 'firstname', 'lastname', 'role'], order: [['id', 'ASC']], raw: true });
    if (!supervisors.length) {
        console.log('LegacyFeedbackSeeder: there is no super/admin account to attribute the old supervisors\' work to.');
        return;
    }
    const staffRows = await Staff.findAll({ attributes: ['userId', 'officeId'], raw: true });
    const officeOfUser = new Map(staffRows.map(s => [s.userId, s.officeId]));
    const userById = new Map([...supervisors, ...workstations].map(u => [u.id, u]));
    const staffOfOffice = new Map();
    for (const w of workstations) {
        const officeId = officeOfUser.get(w.id);
        if (!officeId) continue;
        if (!staffOfOffice.has(officeId)) staffOfOffice.set(officeId, []);
        staffOfOffice.get(officeId).push(w.id);
    }

    // the account made for each old staff member (by its username), when LegacyUserSeeder has been run
    const accountByUsername = new Map((await User.findAll({
        where: { username: legacyStaff.map(s => s.username) }, attributes: ['id', 'username', 'firstname', 'lastname', 'role'], raw: true,
    })).map(u => [u.username, u]));
    const accountOf = new Map(legacyStaff.filter(s => accountByUsername.has(s.username)).map(s => [s.legacyId, accountByUsername.get(s.username)]));
    for (const u of accountOf.values()) if (!userById.has(u.id)) userById.set(u.id, u);

    // "Name — OFFICE", the same label the app writes for an action of a staff member
    const labelOf = (userId) => {
        const u = userById.get(userId);
        if (!u) return null;
        const alias = officeAlias.get(officeOfUser.get(userId));
        return alias ? `${fullName(u)} — ${alias}` : fullName(u);
    };
    const supervisorFor = (author) => supervisors[(author.rank ?? author.key) % supervisors.length];
    // the account that stands for an old staff member: his/her office's workstation account, else a supervisor
    const staffFor = (office, key) => {
        const list = office ? staffOfOffice.get(office.id) : null;
        return list && list.length ? userById.get(list[key % list.length]) : null;
    };

    const counters = { complaints: 0, offices: 0, responses: 0, ratings: 0, files: 0, history: 0, noOffice: 0, skipped: 0, unmapped: 0 };

    for (const f of feedback) {
        const client = clientByEmail.get(f.clientEmail.toLowerCase());
        if (!client) { counters.skipped++; continue; }

        const filed = new Date(f.createdAt);
        const links = f.offices.map(l => ({ ...l, office: l.alias ? officeByAlias.get(l.alias) || null : null }));
        const mapped = links.filter(l => l.office);
        const lost = links.filter(l => !l.office);
        counters.unmapped += lost.length;
        if (links.length && !mapped.length) counters.noOffice++;

        const status = f.state === 'completed' ? 'completed'
            : f.state === 'cancelled' ? 'cancelled'
                : mapped.length ? 'ongoing'
                    : links.length ? 'unassigned' : 'pending';

        const routedAt = links.length ? new Date(Math.min(...links.map(l => new Date(l.createdAt)))) : null;
        const mappedRoutedAt = mapped.length ? new Date(Math.min(...mapped.map(l => new Date(l.createdAt)))) : null;
        const resolutionDeadline = mappedRoutedAt ? await computeResolutionDeadline(mappedRoutedAt) : null;
        const completedAt = status === 'completed' ? new Date(f.completedAt || f.updatedAt)
            : status === 'cancelled' ? new Date(f.updatedAt) : null;

        const history = [];
        const log = (at, role, label, action, description) => history.push({ at: new Date(at), role, label, action, description });

        // ---- the complaint
        const complaint = await Complaint.create({
            referenceNo: `EPS${moment(filed).format('YYYYMMDD')}L${String(f.legacyId).padStart(4, '0')}`,
            content: f.content,
            status,
            via: 'account',
            completedAt,
            resolutionDeadline,
            remarks: status === 'cancelled' ? 'Switched off in the previous system.' : null,
            isAnonymous: false,
            createdAt: filed,
            updatedAt: new Date(f.updatedAt),
        });
        await ComplaintDetail.create({ complaintId: complaint.id, userId: client.id, createdAt: filed, updatedAt: filed });

        if (f.files.length) {
            await ComplaintFile.bulkCreate(f.files.map(file => ({
                complaintId: complaint.id, filename: file.filename, file: dataUri(file), createdAt: filed, updatedAt: filed,
            })));
            counters.files += f.files.length;
        }

        log(filed, 'citizen', client.name, 'filed', 'Feedback filed.');

        // ---- routing
        if (mapped.length) {
            const lostNote = lost.length
                ? ` Also routed in the previous system to ${listOf(lost.map(l => l.name))}, which ${lost.length === 1 ? 'is not an office' : 'are not offices'} in this system.`
                : '';
            log(mappedRoutedAt, 'admin', null, 'reassigned',
                `Assigned to ${listOf(mapped.map(l => l.office.alias || l.alias))}. Acknowledge within 1 day, resolve by ${moment(resolutionDeadline).format('MMM D, YYYY h:mm A')}.${lostNote}`);
        } else if (links.length) {
            log(routedAt, 'admin', null, 'left_unassigned',
                `Routed in the previous system to ${listOf(lost.map(l => l.name))}, which ${lost.length === 1 ? 'is not an office' : 'are not offices'} in this system — left unassigned for manual routing.`);
        }

        // ---- the offices: the acknowledgement of each is the response it posted when it received the feedback
        const ackUsed = new Set();
        const actors = new Map(); // office id -> the account acting for it
        for (const l of mapped) {
            const ack = f.events.find(e => e.kind === 'ack' && !ackUsed.has(e.legacyId) && e.author.officeCode === l.code);
            if (ack) ackUsed.add(ack.legacyId);
            const actor = (ack && accountOf.get(ack.author.key))
                || staffFor(l.office, ack ? ack.author.key : f.legacyId) || supervisorFor(ack ? ack.author : { key: f.legacyId });
            actors.set(l.office.id, actor);
            const isReceived = l.isReceived || !!ack;
            const receivedAt = isReceived ? new Date(ack ? ack.at : l.updatedAt) : null;
            const done = status === 'completed';
            await ComplaintOffice.create({
                complaintId: complaint.id,
                officeId: l.office.id,
                isReceived,
                isActive: status !== 'cancelled',
                status: done ? 'completed' : status === 'cancelled' ? 'cancelled' : isReceived ? 'received' : 'pending',
                receivedAt,
                receiveDeadline: await computeReceiveDeadline(new Date(l.createdAt)),
                completedAt: done ? completedAt : null,
                assignedBy: 'admin',
                assignmentReason: 'Routed in the previous system.',
                receivedByUserId: isReceived ? actor.id : null,
                completedByUserId: done ? actor.id : null,
                createdAt: new Date(l.createdAt),
                updatedAt: done ? completedAt : (receivedAt || new Date(l.updatedAt)),
            });
            counters.offices++;
            if (isReceived) log(receivedAt, 'workstation', labelOf(actor.id), 'received', `${l.office.alias || l.alias} acknowledged the feedback.`);
        }

        // ---- the conversation
        const ownerOf = (author) => {
            if (author.role === 'client') return { id: client.id, label: client.name, role: 'citizen' };
            const office = author.office ? officeByAlias.get(author.office) : null;
            const user = accountOf.get(author.key)
                || (author.role === 'staff' ? (staffFor(office, author.key) || supervisorFor(author)) : supervisorFor(author));
            return { id: user.id, label: labelOf(user.id), role: user.role === 'workstation' ? 'workstation' : user.role };
        };
        for (const e of f.events) {
            // the "mark as completed" notice is the supervisor completing it (below); keep it only when it carries a rating
            if (e.kind === 'completion' && !e.rating) continue;
            const who = ownerOf(e.author);
            const at = new Date(e.at);
            const response = await Response.create({
                complaintId: complaint.id, userId: who.id, content: e.content, isActive: true, createdAt: at, updatedAt: at,
            });
            counters.responses++;
            if (e.file) {
                await ResponseFile.create({ responseId: response.id, filename: e.file.filename, file: dataUri(e.file), createdAt: at, updatedAt: at });
                counters.files++;
            }
            // an acknowledgement is already in the trail as "received"
            if (e.kind !== 'ack') {
                log(at, who.role, who.label, 'responded', who.role === 'citizen' ? 'Citizen added a follow-up.' : 'Posted a response to the citizen.');
            }
            if (e.rating) {
                const rated = new Date(e.rating.at);
                await ResponseRating.create({ responseId: response.id, userId: client.id, rate: e.rating.rate, createdAt: rated, updatedAt: rated });
                counters.ratings++;
                log(rated, 'citizen', client.name, 'rated', `Rated a response ${e.rating.rate} out of 5.`);
            }
        }

        // ---- the ending
        if (status === 'completed') {
            const completion = [...f.events].reverse().find(e => e.kind === 'completion');
            const by = (completion && accountOf.get(completion.author.key)) || (completion ? supervisorFor(completion.author) : supervisors[0]);
            log(completedAt, by.role, labelOf(by.id), 'completed', `Status changed from ongoing to completed by ${labelOf(by.id) || 'staff'}.`);
        } else if (status === 'cancelled') {
            log(completedAt, 'admin', null, 'cancelled', 'Switched off in the previous system.');
        }

        history.sort((a, b) => a.at - b.at);
        await ComplaintHistory.bulkCreate(history.map(h => ({
            complaintId: complaint.id, actorRole: h.role, actorLabel: h.label, action: h.action,
            description: h.description, createdAt: h.at, updatedAt: h.at,
        })));
        counters.history += history.length;
        counters.complaints++;
    }

    console.log(`LegacyFeedbackSeeder: ${counters.complaints} feedback, ${counters.offices} office assignments, ${counters.responses} responses, `
        + `${counters.ratings} ratings, ${counters.files} files, ${counters.history} history entries.`);
    if (counters.unmapped) console.log(`  ${counters.unmapped} routings to old offices that do not exist here were left out (${counters.noOffice} feedback had none of its offices here).`);
    if (counters.skipped) console.log(`  ${counters.skipped} feedback skipped: their client has no account.`);
};

module.exports = {
    async up() {
        const removed = await removeFeedback();
        if (removed) console.log(`LegacyFeedbackSeeder: replaced ${removed} feedback from an earlier run.`);
        await seedFeedback();
    },

    async down() {
        const removed = await removeFeedback();
        console.log(`LegacyFeedbackSeeder: ${removed} feedback removed.`);
    },
};
