'use strict';

// One demo-data seeder for the whole app. It REPLACES the older ComplaintDemoSeeder,
// KioskRatingDemoSeeder and DiscussionPollDemoSeeder, which are gone:
//
//   1. Feedback    ~300 feedback under the CURRENT rules (1 day to acknowledge, 3 days to resolve, one
//                  3-day extension, no complexity tier, anonymous only for a signed-in citizen), each
//                  with its office assignment(s), audit trail, staff responses, citizen follow-ups and
//                  response ratings.
//   2. CSM         client satisfaction measurement for every office.
//   3. Discussions and polls for every office (see utils/demo/discussionPollDemo.js).
//
// Run it:    npx sequelize-cli db:seed --seed 20261026030000-EpsDemoDataSeeder.js
// Undo it:   npx sequelize-cli db:seed:undo --seed 20261026030000-EpsDemoDataSeeder.js
//
// Running it again first removes what an earlier run (or the older seeders) put in, so it never
// piles up duplicates. What was created through the app itself is never touched: demo feedback is
// the reference numbers starting EPSDEMO, demo CSM is the rows with no email and the residence
// below, and demo discussions/polls carry their own mark.
const moment = require('moment');
const { Op } = require('sequelize');
const {
    Complaint, ComplaintDetail, ComplaintOffice, ComplaintHistory, ComplaintFile,
    Response, ResponseRating, KioskRating, Office, User, Staff,
} = require('../models');
const discussionsAndPolls = require('../utils/demo/discussionPollDemo');
const { computeReceiveDeadline, computeResolutionDeadline, EXTENSION_DAYS } = require('../utils/businessHours');

const REF_PREFIX = 'EPSDEMO';

// Illustrated sample photos (public/uploads/demo) attached to about half of the feedback, picked to fit
// what the feedback says when it mentions one of these, otherwise at random.
const SAMPLE_PHOTOS = [
    { name: 'sample-pothole.svg', words: ['pothole', 'road'] },
    { name: 'sample-streetlight.svg', words: ['streetlight', 'traffic light'] },
    { name: 'sample-flood.svg', words: ['flood', 'drainage', 'canal'] },
    { name: 'sample-garbage.svg', words: ['garbage', 'trash'] },
    { name: 'sample-tree.svg', words: ['tree'] },
    { name: 'sample-construction.svg', words: ['construction', 'sidewalk', 'parking'] },
];
const photosFor = (content) => {
    const text = String(content).toLowerCase();
    const fit = SAMPLE_PHOTOS.filter(p => p.words.some(w => text.includes(w)));
    const extra = SAMPLE_PHOTOS.filter(p => !fit.includes(p)).sort(() => Math.random() - 0.5);
    return [...fit, ...extra].slice(0, fit.length ? randInt(1, 2) : randInt(1, 3));
};
const CSM_RESIDENCE = 'San Fernando City';
const TOTAL_FEEDBACK = 300;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;
const weighted = (entries) => {
    const total = entries.reduce((s, [w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [w, v] of entries) {
        if (r < w) return v;
        r -= w;
    }
    return entries[entries.length - 1][1];
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const CONTENT = [
    'The streetlights along the main road have been out for over a week, making it unsafe to walk at night.',
    'Garbage collection was missed in our barangay this week and trash is piling up along the roadside.',
    'There is a large pothole near the intersection that has already caused two motorcycle accidents.',
    'I have been trying to get a business permit renewed for a month with no update on my application.',
    "The public market's drainage system floods every time it rains, damaging vendor stalls.",
    'A nearby establishment plays loud music past midnight on weekdays.',
    'Water supply in our area has been intermittent for two weeks with no advisory issued.',
    'The health center was closed during posted operating hours when I went for a scheduled checkup.',
    'Stray dogs have been roaming the school zone and one bit a child last week.',
    'A construction site is blocking the sidewalk entirely, forcing pedestrians onto a busy road.',
    'My request for a barangay clearance has been pending for three weeks without explanation.',
    'Illegal parking along the covered walkway blocks access for persons with disabilities.',
    'The public restroom at the plaza has been out of order and unclean for over a month.',
    'Fallen tree branches from the last storm are still blocking part of the road.',
    'I was charged an unofficial fee for a document that should have been free of charge.',
    'The traffic light at the corner stays on red for several minutes and causes a long jam every morning.',
    'The clinic ran out of basic medicines again, and we were told to buy them outside.',
    'A canal near our house is clogged and breeds mosquitoes; two neighbors already have dengue.',
    'The senior citizen pension release was delayed again and nobody can tell us the new date.',
    'Please add a pedestrian crossing near the school, cars do not slow down there.',
];

const STAFF_PROGRESS = [
    'We have received your feedback and our team has been assigned to look into it.',
    'A staff member visited the area today to check the situation. We will update you once we have more.',
    'We are coordinating with the other offices involved. Thank you for your patience.',
    'The needed materials have been requested and the work is scheduled for the coming days.',
    'We found the cause of the problem and we are now working on the fix.',
];
const STAFF_RESOLUTION = [
    'The concern has been addressed and checked on site. Thank you for letting us know.',
    'The work is done. If the problem comes back, please file it again and we will respond right away.',
    'We have resolved this and recorded the action taken. Thank you for your report.',
];
const STAFF_EXTENSION = [
    'The repair needs parts from another supplier, so we need a little more time.',
    'The work depends on a joint inspection with another office that is scheduled after the deadline.',
    'Weather delayed the field work, we are asking for the 3-day extension to finish it properly.',
];
const CITIZEN_FOLLOWUP = [
    'Thank you. Is there an update on this? It is still the same when I passed by today.',
    'Good day, may I ask when this will be done?',
    'I can confirm that someone came by. Please keep me posted.',
    'It looks better now, thank you for the quick action.',
];
const CITIZEN_CANCEL_REASON = [
    'It was already fixed by our barangay.',
    'I filed this twice by mistake.',
    'I no longer need this to be looked into.',
    null,
];
const ADMIN_CANCEL = [
    'Duplicate of an existing feedback, already being handled under another reference.',
    'Outside the jurisdiction of any city office, referred to the proper national agency.',
    'Not enough information to act on, and the citizen could not be reached.',
];
const COMPLETE_REMARKS = [
    'Issue resolved and verified on-site by office staff.',
    'Concern addressed; citizen confirmed the resolution.',
    'Corrective action completed and documented in the office log.',
];
const ROUTE_REASON_AI = [
    'Matched by content against the office mandate.',
    'Auto-routed from the feedback content.',
    'Assigned by similarity to the office charter.',
];
const ROUTE_REASON_ADMIN = [
    'Assigned by a supervisor after review.',
    'Reassigned to the office with jurisdiction over the concern.',
];
const GUESTS = [
    ['Maria', 'Santos'], ['Jose', 'Reyes'], ['Ana', 'Garcia'], ['Mark', 'Cruz'], ['Liza', 'Mendoza'],
    ['Paolo', 'Bautista'], ['Grace', 'Flores'], ['Ramon', 'Dizon'],
];

// ------------------------------------------------------------------------------ cleanup
const removeFeedback = async () => {
    const rows = await Complaint.findAll({
        where: { referenceNo: { [Op.like]: `${REF_PREFIX}%` } }, attributes: ['id'], raw: true,
    });
    const ids = rows.map(r => r.id);
    if (!ids.length) return 0;
    const responses = await Response.findAll({ where: { complaintId: ids }, attributes: ['id'], raw: true });
    const responseIds = responses.map(r => r.id);
    if (responseIds.length) await ResponseRating.destroy({ where: { responseId: responseIds } });
    await Response.destroy({ where: { complaintId: ids } });
    await ComplaintHistory.destroy({ where: { complaintId: ids } });
    await ComplaintFile.destroy({ where: { complaintId: ids } });
    await ComplaintOffice.destroy({ where: { complaintId: ids } });
    await ComplaintDetail.destroy({ where: { complaintId: ids } });
    await Complaint.destroy({ where: { id: ids } });
    return ids.length;
};

const removeCsm = () => KioskRating.destroy({ where: { email: null, residence: CSM_RESIDENCE } });

// ------------------------------------------------------------------------------ feedback
const seedFeedback = async (now) => {
    const offices = await Office.findAll({ where: { isActive: true }, attributes: ['id', 'alias', 'name'], raw: true });
    const citizens = await User.findAll({ where: { role: 'citizen' }, attributes: ['id', 'firstname', 'lastname'], raw: true });
    const supervisors = await User.findAll({ where: { role: ['super', 'admin'] }, attributes: ['id', 'firstname', 'lastname', 'role'], raw: true });
    const workstations = await User.findAll({ where: { role: 'workstation' }, attributes: ['id', 'firstname', 'lastname'], raw: true });
    const staffRows = await Staff.findAll({ attributes: ['userId', 'officeId'], raw: true });
    if (!offices.length || !citizens.length) {
        console.log('EpsDemoDataSeeder: no offices or citizens, skipped the feedback.');
        return;
    }

    const officeLabel = new Map(offices.map(o => [o.id, o.alias || o.name]));
    const userById = new Map([...citizens, ...supervisors, ...workstations].map(u => [u.id, u]));
    const nameOf = (id) => {
        const u = userById.get(id);
        return u ? `${u.firstname || ''} ${u.lastname || ''}`.trim() : null;
    };
    const staffOfOffice = new Map();
    for (const s of staffRows) {
        if (!workstations.some(w => w.id === s.userId)) continue;
        if (!staffOfOffice.has(s.officeId)) staffOfOffice.set(s.officeId, []);
        staffOfOffice.get(s.officeId).push(s.userId);
    }
    // the person acting for an office: one of its workstation accounts, else any supervisor
    const actorFor = (officeId) => {
        const list = staffOfOffice.get(officeId);
        const id = list && list.length ? pick(list) : pick(supervisors).id;
        const label = nameOf(id);
        return { id, label: label ? `${label} — ${officeLabel.get(officeId)}` : officeLabel.get(officeId) };
    };

    const STATUS = [
        [8, 'unverified'], [5, 'verified'], [7, 'unassigned'], [6, 'pending'],
        [22, 'ongoing'], [46, 'completed'], [6, 'cancelled'],
    ];
    const ageDaysFor = (status) => {
        switch (status) {
            case 'unverified': return randInt(0, 3);
            case 'verified': return randInt(0, 1);
            case 'unassigned': return randInt(0, 6);
            case 'pending': return randInt(0, 2);
            case 'ongoing': return chance(0.85) ? randInt(0, 9) : randInt(10, 30); // a few are overdue
            case 'completed': return weighted([[40, randInt(13, 60)], [35, randInt(61, 200)], [25, randInt(201, 430)]]);
            default: return randInt(1, 300);
        }
    };

    let created = 0;
    const counters = { responses: 0, ratings: 0, history: 0, extended: 0 };

    for (let i = 0; i < TOTAL_FEEDBACK; i++) {
        const status = weighted(STATUS);
        // unverified/verified only exist for a guest (OTP) filing
        const via = ['unverified', 'verified'].includes(status)
            ? 'otp'
            : weighted([[75, 'account'], [13, 'otp'], [12, 'staff']]);
        const isAccount = via === 'account';
        // anonymous is only for a signed-in citizen, and hides only who filed it
        const isAnonymous = isAccount && chance(0.2);

        const filedAt = moment(now).subtract(ageDaysFor(status), 'days')
            .hour(randInt(7, 18)).minute(randInt(0, 59)).second(randInt(0, 59));
        if (filedAt.isAfter(now)) filedAt.subtract(1, 'days');
        const filed = filedAt.toDate();

        const citizen = isAccount ? pick(citizens) : null;
        const guest = isAccount ? null : pick(GUESTS);
        const filerName = isAccount ? nameOf(citizen.id) : `${guest[0]} ${guest[1]}`;
        const history = []; // { at, role, label, action, description, target }
        const log = (at, role, label, action, description, target = null) =>
            history.push({ at: moment(at).toDate(), role, label, action, description, target });

        // ---- the filing
        const routable = ['pending', 'unassigned', 'ongoing', 'completed', 'cancelled'].includes(status);
        const routedAt = routable ? moment(filedAt).add(randInt(1, 25), 'minutes') : null;

        log(filedAt, 'citizen', isAnonymous ? null : filerName, 'filed',
            via === 'otp' ? 'Complaint filed as a guest — awaiting OTP verification.'
                : via === 'staff' ? 'Feedback filed by staff on behalf of a citizen.'
                    : `Feedback filed${isAnonymous ? ' anonymously' : ''}.`);
        if (['verified', 'pending', 'unassigned', 'ongoing', 'completed', 'cancelled'].includes(status) && via === 'otp') {
            log(moment(filedAt).add(randInt(1, 6), 'minutes'), 'citizen', filerName, 'verified', 'Email verified with the one-time code.');
        }

        // ---- the timeline of the rules: acknowledge 1 day, resolve +3, one 3-day extension
        let receiveDeadline = null;
        let resolutionDeadline = null;
        if (routedAt && status !== 'unassigned') {
            receiveDeadline = await computeReceiveDeadline(routedAt.toDate());
            resolutionDeadline = await computeResolutionDeadline(routedAt.toDate());
        }

        const officeCount = status === 'unassigned' ? 0 : chance(0.82) ? 1 : 2;
        const chosen = [];
        while (chosen.length < officeCount) {
            const o = pick(offices);
            if (!chosen.includes(o.id)) chosen.push(o.id);
        }
        const assignedBy = chance(0.7) ? 'ai' : 'admin';

        if (status === 'unassigned') {
            log(routedAt, null, 'AI Auto-Assignment', 'left_unassigned',
                'No office could be confidently matched to this feedback — left unassigned for manual routing.');
        } else if (routedAt) {
            log(routedAt, assignedBy === 'ai' ? null : 'admin', assignedBy === 'ai' ? 'AI Auto-Assignment' : nameOf(pick(supervisors).id),
                assignedBy === 'ai' ? 'auto_assigned' : 'reassigned',
                `Assigned to ${chosen.map(id => officeLabel.get(id)).join(', ')}. Acknowledge within 1 day, resolve by ${moment(resolutionDeadline).format('MMM D, YYYY h:mm A')}.`);
        }

        // ---- how this one plays out
        let completedAt = null;
        let remarks = null;
        let extensionGrantedAt = null;
        let extensionReason = null;
        let extensionRequestedBy = null;
        const officeRows = [];
        const responseRows = []; // { at, userId, content, citizen }
        const ratingRows = [];

        const futureCap = (m) => (m.isAfter(now) ? moment(now) : m);

        if (['pending', 'ongoing', 'completed'].includes(status)) {
            const scenario = status === 'completed'
                ? weighted([[62, 'onTime'], [16, 'extended'], [22, 'late']])
                : weighted([[55, 'onTime'], [20, 'extended'], [25, 'late']]);

            // acknowledgement: ~75% inside the 1-day window
            const ackWithin = scenario !== 'late' || chance(0.5);
            const ackMinutes = ackWithin ? randInt(20, 23 * 60) : randInt(26 * 60, 3 * 24 * 60);

            if (status !== 'pending' && scenario === 'extended' && resolutionDeadline) {
                const asked = futureCap(moment(routedAt).add(randInt(26, 70), 'hours'));
                if (asked.isBefore(moment(resolutionDeadline))) {
                    extensionGrantedAt = asked.toDate();
                    extensionRequestedBy = actorFor(chosen[0]).id;
                    extensionReason = pick(STAFF_EXTENSION);
                    resolutionDeadline = moment(resolutionDeadline).add(EXTENSION_DAYS, 'days').toDate();
                    counters.extended++;
                }
            }

            if (status === 'completed') {
                // inside 4 days; inside 7 if extended; otherwise late
                const hours = extensionGrantedAt ? randInt(4 * 24 + 2, 7 * 24 - 2)
                    : scenario === 'late' ? randInt(4 * 24 + 4, 12 * 24)
                        : randInt(3, 4 * 24 - 2);
                completedAt = futureCap(moment(routedAt).add(hours, 'hours')).toDate();
                remarks = pick(COMPLETE_REMARKS);
            }

            const oneCompleted = status === 'ongoing' && officeCount === 2 && chance(0.3);
            chosen.forEach((officeId, idx) => {
                const acked = status !== 'pending';
                const receivedAt = acked
                    ? futureCap(moment.min(moment(routedAt).add(ackMinutes + idx * 15, 'minutes'), completedAt ? moment(completedAt) : moment(now))).toDate()
                    : null;
                const done = status === 'completed' || (oneCompleted && idx === 0);
                const actor = actorFor(officeId);
                officeRows.push({
                    officeId,
                    isReceived: acked,
                    isActive: true,
                    status: done ? 'completed' : acked ? 'ongoing' : 'pending',
                    receivedAt,
                    receiveDeadline,
                    completedAt: done ? (completedAt || futureCap(moment(receivedAt).add(randInt(2, 40), 'hours')).toDate()) : null,
                    assignedBy,
                    assignmentReason: pick(assignedBy === 'ai' ? ROUTE_REASON_AI : ROUTE_REASON_ADMIN),
                    receivedByUserId: acked ? actor.id : null,
                    completedByUserId: done ? actor.id : null,
                    actor,
                });
            });

            // ---- the audit trail and the conversation
            for (const row of officeRows) {
                if (row.isReceived) {
                    log(row.receivedAt, 'workstation', row.actor.label, 'received',
                        `${officeLabel.get(row.officeId)} acknowledged the feedback.`);
                }
            }
            if (extensionGrantedAt) {
                log(extensionGrantedAt, 'workstation', officeRows[0].actor.label, 'extended',
                    `Extended by ${EXTENSION_DAYS} days: ${extensionReason}`);
            }

            if (status !== 'pending') {
                const first = officeRows[0];
                const t0 = moment(first.receivedAt);
                const endAt = completedAt ? moment(completedAt) : moment(now);
                const span = Math.max(endAt.diff(t0, 'minutes'), 30);
                const progressCount = status === 'completed' ? randInt(1, 2) : randInt(0, 2);
                for (let k = 0; k < progressCount; k++) {
                    const at = futureCap(moment(t0).add(Math.floor(span * (k + 1) / (progressCount + 2)), 'minutes'));
                    responseRows.push({ at: at.toDate(), userId: first.actor.id, content: pick(STAFF_PROGRESS), label: first.actor.label });
                }
                if (isAccount && chance(0.4) && responseRows.length) {
                    const at = futureCap(moment(responseRows[0].at).add(randInt(30, 600), 'minutes'));
                    responseRows.push({ at: at.toDate(), userId: citizen.id, content: pick(CITIZEN_FOLLOWUP), label: isAnonymous ? null : filerName, citizen: true });
                }
                if (status === 'completed') {
                    responseRows.push({ at: new Date(completedAt), userId: first.actor.id, content: pick(STAFF_RESOLUTION), label: first.actor.label, final: true });
                }
                responseRows.sort((a, b) => a.at - b.at);
            }
        } else if (status === 'cancelled') {
            const byCitizen = isAccount && chance(0.55);
            completedAt = futureCap(moment(filedAt).add(randInt(2, 90), 'hours')).toDate();
            if (byCitizen) {
                const reason = pick(CITIZEN_CANCEL_REASON);
                remarks = `Cancelled by the citizen.${reason ? ` Reason: ${reason}` : ''}`;
                log(completedAt, 'citizen', isAnonymous ? null : filerName, 'cancelled', remarks);
            } else {
                remarks = pick(ADMIN_CANCEL);
                log(completedAt, 'admin', nameOf(pick(supervisors).id), 'cancelled', remarks);
            }
            for (const officeId of chosen) {
                officeRows.push({
                    officeId, isReceived: false, isActive: false, status: 'cancelled', receivedAt: null, receiveDeadline,
                    completedAt: null, assignedBy, assignmentReason: pick(assignedBy === 'ai' ? ROUTE_REASON_AI : ROUTE_REASON_ADMIN),
                    receivedByUserId: null, completedByUserId: null, actor: actorFor(officeId),
                });
            }
            resolutionDeadline = routedAt ? resolutionDeadline : null;
        }

        // ---- write it
        const referenceNo = `${REF_PREFIX}${filedAt.format('YYYYMMDD')}${String(i).padStart(4, '0')}`;
        const complaint = await Complaint.create({
            referenceNo,
            content: pick(CONTENT),
            status,
            via,
            completedAt,
            resolutionDeadline,
            extensionGrantedAt,
            extensionReason,
            extensionRequestedBy,
            remarks,
            isAnonymous,
            createdAt: filed,
            updatedAt: completedAt || filed,
        });

        if (chance(0.5)) {
            await ComplaintFile.bulkCreate(photosFor(complaint.content).map(f => ({
                complaintId: complaint.id, filename: f.name, file: `/uploads/demo/${f.name}`, createdAt: filed, updatedAt: filed,
            })));
        }

        await ComplaintDetail.create({
            complaintId: complaint.id,
            userId: isAccount ? citizen.id : null,
            otp: status === 'unverified' ? String(randInt(100000, 999999)) : null,
            guestFirstName: guest ? guest[0] : null,
            guestLastName: guest ? guest[1] : null,
            guestEmail: guest ? `${guest[0]}.${guest[1]}@example.com`.toLowerCase() : null,
            guestPhone: guest ? `09${randInt(100000000, 999999999)}` : null,
            latitude: via === 'staff' ? null : (15.0286 + (Math.random() - 0.5) * 0.04).toFixed(7),
            longitude: via === 'staff' ? null : (120.6898 + (Math.random() - 0.5) * 0.04).toFixed(7),
            createdAt: filed,
            updatedAt: filed,
        });

        if (officeRows.length) {
            await ComplaintOffice.bulkCreate(officeRows.map(({ actor, ...r }) => ({
                ...r, complaintId: complaint.id, createdAt: routedAt ? routedAt.toDate() : filed,
                updatedAt: r.completedAt || r.receivedAt || filed,
            })));
        }

        const savedResponses = [];
        for (const r of responseRows) {
            const saved = await Response.create({
                complaintId: complaint.id, userId: r.userId, content: r.content, isActive: true,
                createdAt: r.at, updatedAt: r.at,
            });
            savedResponses.push({ saved, row: r });
            counters.responses++;
            log(r.at, r.citizen ? 'citizen' : 'workstation', r.label, 'responded',
                r.citizen ? 'Citizen added a follow-up.' : 'Posted a response to the citizen.');
        }

        // the citizen rates the office's answers on a finished feedback
        if (status === 'completed' && isAccount) {
            for (const { saved, row } of savedResponses) {
                if (row.citizen || !chance(0.6)) continue;
                const rate = weighted([[8, 3], [32, 4], [60, 5]]);
                const at = futureCap(moment(row.at).add(randInt(10, 2000), 'minutes')).toDate();
                ratingRows.push({ responseId: saved.id, userId: citizen.id, rate, createdAt: at, updatedAt: at });
                log(at, 'citizen', isAnonymous ? null : filerName, 'rated', `Rated a response ${rate} out of 5.`);
            }
            if (ratingRows.length) {
                await ResponseRating.bulkCreate(ratingRows);
                counters.ratings += ratingRows.length;
            }
        }

        if (status === 'completed') {
            log(completedAt, 'workstation', officeRows[0].actor.label, 'completed', `Marked as completed. ${remarks}`);
        }

        history.sort((a, b) => a.at - b.at);
        await ComplaintHistory.bulkCreate(history.map(h => ({
            complaintId: complaint.id, actorRole: h.role, actorLabel: h.label, action: h.action,
            description: h.description, targetUserId: h.target, createdAt: h.at, updatedAt: h.at,
        })));
        counters.history += history.length;
        created++;
    }

    console.log(`EpsDemoDataSeeder: ${created} feedback, ${counters.responses} responses, ${counters.ratings} ratings, `
        + `${counters.history} history entries, ${counters.extended} extended.`);
};

// ------------------------------------------------------------------------------ CSM
const seedCsm = async (now) => {
    const offices = await Office.findAll({ where: { isActive: true }, attributes: ['id'], raw: true });
    if (!offices.length) return;

    const SQD = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
    const TYPES = ['citizen', 'citizen', 'citizen', 'business', 'business', 'government'];
    const SEXES = ['Male', 'Female', 'Male', 'Female', 'Others'];
    const ENTRIES = ['kiosk', 'kiosk', 'kiosk', 'manual'];
    const SUGGESTIONS = [
        null, null, null,
        'Faster processing would help a lot.',
        'Staff were very accommodating, thank you.',
        'Please add more seating in the waiting area.',
        'The online form kept timing out.',
        'Great service, no complaints.',
    ];
    const monthsBack = 8;
    // more recent months weigh more; never in the future (it would fall outside the analytics window)
    const randomDate = () => {
        const offset = Math.min(randInt(0, monthsBack - 1), randInt(0, monthsBack - 1));
        const d = moment(now).subtract(offset, 'months').date(randInt(1, 28)).hour(randInt(8, 16)).minute(randInt(0, 59)).second(0);
        return d.isAfter(now) ? moment(now).subtract(randInt(0, 6), 'days').toDate() : d.toDate();
    };

    const rows = [];
    for (const office of offices) {
        // each office has its own baseline so the average by office actually varies
        const baseline = 2.8 + Math.random() * 2.1;
        const count = randInt(8, 20);
        for (let i = 0; i < count; i++) {
            const sqd = {};
            SQD.forEach((key) => { sqd[key] = clamp(Math.round(baseline + (Math.random() - 0.5) * 1.6), 1, 5); });
            const aware = Math.random() < baseline / 5;
            const cc1 = aware ? pick(['1', '1', '2']) : pick(['3', '4']);
            rows.push({
                email: null,
                officeId: office.id,
                type: pick(TYPES),
                date: randomDate(),
                sex: pick(SEXES),
                age: String(randInt(18, 70)),
                residence: CSM_RESIDENCE,
                serviceAvailed: null,
                cc1,
                cc2: cc1 === '4' ? '5' : pick(['1', '1', '2', '3']),
                cc3: cc1 === '4' ? '4' : pick(['1', '1', '2', '3']),
                ...sqd,
                suggestion: pick(SUGGESTIONS),
                isActive: true,
                entryFrom: pick(ENTRIES),
                createdAt: now,
                updatedAt: now,
            });
        }
    }
    await KioskRating.bulkCreate(rows);
    console.log(`EpsDemoDataSeeder: ${rows.length} CSM ratings.`);
};

module.exports = {
    async up() {
        const now = new Date();

        const removed = await removeFeedback();
        await removeCsm();
        await discussionsAndPolls.down();
        if (removed) console.log(`EpsDemoDataSeeder: replaced ${removed} earlier demo feedback.`);

        await seedFeedback(now);
        await seedCsm(now);
        await discussionsAndPolls.up();
        console.log('EpsDemoDataSeeder: discussions and polls added.');
    },

    async down() {
        await removeFeedback();
        await removeCsm();
        await discussionsAndPolls.down();
    },
};
