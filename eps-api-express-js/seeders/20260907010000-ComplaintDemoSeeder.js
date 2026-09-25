'use strict';

// Demo complaints with COMPLETE workflow detail — complexity tier, resolution deadline, office
// assignment(s) with realistic acknowledgement timing, and (for completed ones) a completion
// time — spread from ~14 months ago through today. The handful of complaints already in the DB
// were created through the app itself during earlier testing and mostly never got classified or
// acknowledged, so every SLA-dependent panel on the Complaint dashboard (avg. resolution time,
// SLA compliance, ack vs. resolution rate by office, and the "vs last period" trend badges) had
// nothing to compute from. This seeder exists to backfill that with plausible, varied data
// instead of hand-writing one complaint at a time.
//
// Uses the ORM (not queryInterface.bulkInsert) because ComplaintDetail/ComplaintOffice rows need
// to reference each newly-created Complaint's auto-generated id.
const moment = require('moment');
const { Complaint, ComplaintDetail, ComplaintOffice, Office, User, Holiday } = require('../models');
const { addBusinessHours, addBusinessDays, RESOLUTION_DAYS, RECEIVE_WINDOW_HOURS } = require('../utils/businessHours');

const REF_PREFIX = 'EPSDEMO';

const CONTENT_TEMPLATES = [
    'The streetlights along the main road have been out for over a week, making it unsafe to walk at night.',
    'Garbage collection was missed in our barangay this week and trash is piling up along the roadside.',
    'There is a large pothole near the intersection that has already caused two motorcycle accidents.',
    'I have been trying to get a business permit renewed for a month with no update on my application status.',
    'The public market\'s drainage system floods every time it rains, damaging vendor stalls.',
    'Noise complaint: a nearby establishment plays loud music past midnight on weekdays.',
    'Water supply in our area has been intermittent for the past two weeks with no advisory issued.',
    'The health center was closed during posted operating hours when I went for a scheduled checkup.',
    'Stray dogs have been roaming the school zone and have bitten a child last week.',
    'A construction site is blocking the sidewalk entirely, forcing pedestrians onto a busy road.',
    'My request for a barangay clearance has been pending for three weeks without explanation.',
    'Illegal parking along the covered walkway blocks access for persons with disabilities.',
    'The public restroom at the plaza has been out of order and unclean for over a month.',
    'Fallen tree branches from the last storm are still blocking a portion of the road.',
    'I was charged an unofficial fee for a document that should have been free of charge.',
];

const ASSIGNMENT_REASONS_AI = [
    'Matched by keyword overlap with office mandate.',
    'Auto-routed based on complaint content classification.',
    'Assigned by content-similarity match against office charter.',
];
const ASSIGNMENT_REASONS_ADMIN = [
    'Manually assigned by supervisor after review.',
    'Reassigned to the office with jurisdiction over the concern.',
    'Routed by admin based on prior similar cases.',
];
const CANCEL_REMARKS = [
    'Duplicate of an existing complaint, already being tracked under another reference.',
    'Withdrawn by the citizen after the concern was resolved informally.',
    'Outside the jurisdiction of any city office — referred to the appropriate national agency.',
];
const COMPLETE_REMARKS = [
    'Issue resolved and verified on-site by office staff.',
    'Concern addressed; citizen confirmed resolution via follow-up call.',
    'Corrective action completed and documented in the office\'s activity log.',
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;

// Weighted pick: entries as [weight, value].
const weightedPick = (entries) => {
    const total = entries.reduce((s, [w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [w, v] of entries) {
        if (r < w) return v;
        r -= w;
    }
    return entries[entries.length - 1][1];
};

module.exports = {
    async up() {
        const now = new Date('2026-09-07T10:00:00Z');

        const offices = await Office.findAll({ where: { isActive: true }, attributes: ['id'], raw: true });
        const citizens = await User.findAll({ where: { role: 'citizen' }, attributes: ['id'], raw: true });
        if (!offices.length || !citizens.length) return;

        const holidayRows = await Holiday.findAll({ where: { isActive: true }, attributes: ['date'], raw: true });
        const holidaySet = new Set(holidayRows.map(h => moment(h.date).format('YYYY-MM-DD')));

        // Spread createdAt so every comparison window used by the "vs last period" trend has real
        // data on both sides: this/last ISO week, this/last calendar month, this/last calendar
        // year — biased toward more recent dates like real filing volume would be.
        const AGE_BUCKETS = [
            [25, [0, 7]],     // this week (and the edge of last week)
            [15, [7, 14]],    // last week
            [20, [14, 60]],   // rest of this/last month
            [20, [60, 250]],  // earlier this year
            [20, [250, 600]], // last year
        ];
        const randomCreatedAt = () => {
            const [minDays, maxDays] = weightedPick(AGE_BUCKETS.map(([w, r]) => [w, r]));
            const daysAgo = randInt(minDays, maxDays);
            const d = moment(now).subtract(daysAgo, 'days');
            d.hour(randInt(7, 18)).minute(randInt(0, 59)).second(randInt(0, 59));
            return d.isAfter(now) ? moment(now) : d;
        };

        // Duration from filing to completion — deliberately wide (minutes through weeks) so the
        // avg. resolution time KPI has to handle every unit, not just days.
        const COMPLETION_DELAY_MINUTES = [
            [15, [5, 55]],          // minutes
            [30, [60, 8 * 60]],     // hours (same day)
            [35, [24 * 60, 5 * 24 * 60]],   // a few days
            [20, [6 * 24 * 60, 20 * 24 * 60]], // slow, up to ~3 weeks
        ];
        const randomCompletionMinutes = () => {
            const [min, max] = weightedPick(COMPLETION_DELAY_MINUTES.map(([w, r]) => [w, r]));
            return randInt(min, max);
        };

        const STATUS_WEIGHTS = [
            [10, 'unverified'],
            [8, 'verified'],
            [10, 'unassigned'],
            [5, 'pending'],
            [27, 'ongoing'],
            [35, 'completed'],
            [5, 'cancelled'],
        ];
        const COMPLEXITY_WEIGHTS = [[55, 'simple'], [30, 'complex'], [15, 'highly_technical']];

        const TOTAL = 260;
        let created = 0;

        for (let i = 0; i < TOTAL; i++) {
            const createdAtMoment = randomCreatedAt();
            const createdAt = createdAtMoment.toDate();
            const status = weightedPick(STATUS_WEIGHTS.map(([w, v]) => [w, v]));
            const via = chance(0.6) ? 'account' : 'otp';
            const isAnonymous = via === 'otp' && chance(0.5);

            // Only complaints that have moved past intake get classified — matches the real
            // workflow, where complexity/resolutionDeadline are set once an office picks it up.
            const isClassified = ['pending', 'ongoing', 'completed', 'cancelled'].includes(status);
            const complexity = isClassified ? weightedPick(COMPLEXITY_WEIGHTS) : null;
            const resolutionDeadline = complexity
                ? addBusinessDays(moment(createdAt), RESOLUTION_DAYS[complexity], holidaySet).toDate()
                : null;

            let completedAt = null;
            let remarks = null;
            if (status === 'completed') {
                const finishMoment = moment(createdAt).add(randomCompletionMinutes(), 'minutes');
                completedAt = (finishMoment.isAfter(now) ? moment(now) : finishMoment).toDate();
                remarks = pick(COMPLETE_REMARKS);
            } else if (status === 'cancelled') {
                remarks = pick(CANCEL_REMARKS);
            }

            const referenceNo = `${REF_PREFIX}${createdAtMoment.format('YYYYMMDD')}${String(i).padStart(4, '0')}`;

            const complaint = await Complaint.create({
                referenceNo,
                content: pick(CONTENT_TEMPLATES),
                status,
                via,
                completedAt,
                complexity,
                resolutionDeadline,
                remarks,
                isAnonymous,
                createdAt,
                updatedAt: completedAt || createdAt,
            });

            await ComplaintDetail.create({
                complaintId: complaint.id,
                userId: pick(citizens).id,
                otp: via === 'otp' ? String(randInt(100000, 999999)) : null,
                createdAt,
                updatedAt: createdAt,
            });

            // 'unverified'/'verified'/'unassigned' complaints have no office yet — matches the
            // real system's own rule (see ComplaintController.getAnalytics's unassignedCount
            // comment) that an unassigned complaint by definition has no ComplaintOffice row.
            if (!isClassified) { created++; continue; }

            const officeCount = chance(0.8) ? 1 : 2;
            const usedOfficeIds = new Set();
            for (let j = 0; j < officeCount; j++) {
                let office = pick(offices);
                let guard = 0;
                while (usedOfficeIds.has(office.id) && guard++ < 10) office = pick(offices);
                usedOfficeIds.add(office.id);

                const assignedBy = chance(0.7) ? 'ai' : 'admin';
                const assignmentReason = pick(assignedBy === 'ai' ? ASSIGNMENT_REASONS_AI : ASSIGNMENT_REASONS_ADMIN);
                const receiveDeadline = addBusinessHours(moment(createdAt), RECEIVE_WINDOW_HOURS, holidaySet).toDate();

                let officeStatus = 'pending';
                let isReceived = false;
                let receivedAt = null;
                let officeCompletedAt = null;
                let isActive = true;

                if (status === 'pending') {
                    // stays unreceived
                } else if (status === 'ongoing') {
                    isReceived = true;
                    officeStatus = 'ongoing';
                    // ~65% acknowledged inside the 24-business-hour window, ~35% late.
                    const ackMinutes = chance(0.65) ? randInt(10, 20 * 60) : randInt(30 * 60, 96 * 60);
                    const ackMoment = moment(createdAt).add(ackMinutes, 'minutes');
                    receivedAt = (ackMoment.isAfter(now) ? moment(now) : ackMoment).toDate();
                } else if (status === 'completed') {
                    isReceived = true;
                    officeStatus = 'completed';
                    const ackMinutes = chance(0.65) ? randInt(10, 20 * 60) : randInt(30 * 60, 96 * 60);
                    const ackMoment = moment(createdAt).add(ackMinutes, 'minutes');
                    const completedMoment = moment(completedAt);
                    receivedAt = (ackMoment.isAfter(completedMoment) ? completedMoment : ackMoment).toDate();
                    officeCompletedAt = completedAt;
                } else if (status === 'cancelled') {
                    officeStatus = 'cancelled';
                    isActive = chance(0.5);
                    if (chance(0.5)) {
                        const ackMoment = moment(createdAt).add(randInt(10, 600), 'minutes');
                        receivedAt = (ackMoment.isAfter(now) ? moment(now) : ackMoment).toDate();
                        isReceived = true;
                    }
                }

                await ComplaintOffice.create({
                    complaintId: complaint.id,
                    officeId: office.id,
                    isReceived,
                    isActive,
                    status: officeStatus,
                    receivedAt,
                    receiveDeadline,
                    completedAt: officeCompletedAt,
                    assignedBy,
                    assignmentReason,
                    createdAt,
                    updatedAt: officeCompletedAt || receivedAt || createdAt,
                });
            }

            created++;
        }

        console.log(`ComplaintDemoSeeder: created ${created} complaints.`);
    },

    async down() {
        const { Op } = require('sequelize');
        const demoComplaints = await Complaint.findAll({
            where: { referenceNo: { [Op.like]: `${REF_PREFIX}%` } },
            attributes: ['id'],
            raw: true
        });
        const ids = demoComplaints.map(c => c.id);
        if (!ids.length) return;
        await ComplaintOffice.destroy({ where: { complaintId: { [Op.in]: ids } } });
        await ComplaintDetail.destroy({ where: { complaintId: { [Op.in]: ids } } });
        await Complaint.destroy({ where: { id: { [Op.in]: ids } } });
    }
};
