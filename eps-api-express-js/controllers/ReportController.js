const { Op } = require('sequelize');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const puppeteer = require('puppeteer');
const { ComplaintOffice, Office, Complaint, ComplaintDetail, Citizen, Staff, User, Response, ResponseRating, ComplaintHistory, KioskRating, ActivityLog, Discussion, DiscussionComment, Poll, PollVote } = require('../models');
const { resolvePeriodRange } = require('../utils/periodRange');
const { askLLM, hasLLM } = require('../utils/llm');

const SQD_KEYS = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
// The standard ARTA Citizen/Client Satisfaction Measurement (CSM) 8+1 dimensions (JMC 2019-003)
// — this app already collects exactly this survey via KioskRating, just never had these labels
// written down anywhere before.
const SQD_LABELS = [
    'Overall satisfaction',
    'Reasonable time spent',
    'Followed requirements & steps',
    'Steps were easy & simple',
    'Information was easy to find',
    'Reasonable fees paid',
    'Fair treatment ("walang palakasan")',
    'Courteous & helpful staff',
    'Got what was needed'
];

const yearRange = (year) => year
    ? { since: moment(`${year}-01-01`).startOf('year').toDate(), until: moment(`${year}-12-31`).endOf('year').toDate() }
    : null;

// Response time is measured per office, not per complaint, because a single complaint can be
// routed to several offices at different moments — each office's own clock starts when THAT
// office was assigned (ComplaintOffice.createdAt), not when the complaint was first filed.
// There's no per-office SLA/target turnaround here on purpose — every complaint's resolution
// deadline is governed by its ARTA/EODB complexity tier (Complaint.resolutionDeadline, see
// utils/businessHours.js), the same standard for every office, not something each office sets
// for itself. "Overdue" for a given assignment is judged against THAT deadline, not a per-office
// figure.
//
//   acknowledgmentHours = receivedAt   - assignedAt   (how long before the office opened it)
//   resolutionHours     = completedAt  - assignedAt   (how long before the office finished it)
exports.getResponseTimeReport = async (req, res) => {

    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }

    const officeId = req.query.office ? parseInt(req.query.office) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;

    try {
        const where = { isActive: true };
        if (officeId) where.officeId = officeId;

        const assignments = await ComplaintOffice.findAll({
            where,
            include: [
                { model: Office, as: 'office', attributes: ['id', 'name', 'alias'] },
                { model: Complaint, as: 'complaint', attributes: ['id', 'resolutionDeadline'] }
            ]
        });

        const filtered = year
            ? assignments.filter(a => moment(a.createdAt).year() === year)
            : assignments;

        const byOffice = {};

        for (const assignment of filtered) {
            const office = assignment.office;
            if (!office) continue;

            if (!byOffice[office.id]) {
                byOffice[office.id] = {
                    officeId: office.id,
                    officeName: office.name,
                    officeAlias: office.alias,
                    totalAssigned: 0,
                    totalReceived: 0,
                    totalCompleted: 0,
                    overdueCount: 0,
                    acknowledgmentHoursSum: 0,
                    acknowledgmentSamples: 0,
                    resolutionHoursSum: 0,
                    resolutionSamples: 0,
                };
            }

            const bucket = byOffice[office.id];
            bucket.totalAssigned += 1;

            const assignedAt = moment(assignment.createdAt);

            if (assignment.receivedAt) {
                bucket.totalReceived += 1;
                bucket.acknowledgmentHoursSum += moment(assignment.receivedAt).diff(assignedAt, 'hours', true);
                bucket.acknowledgmentSamples += 1;
            }

            if (assignment.status === 'completed' && assignment.completedAt) {
                bucket.totalCompleted += 1;
                const resolutionHours = moment(assignment.completedAt).diff(assignedAt, 'hours', true);
                bucket.resolutionHoursSum += resolutionHours;
                bucket.resolutionSamples += 1;

                // Judged against the complaint's own ARTA/EODB deadline — the one standard every
                // office is held to, not a figure each office would otherwise set for itself.
                const deadline = assignment.complaint?.resolutionDeadline;
                if (deadline && moment(assignment.completedAt).isAfter(moment(deadline))) {
                    bucket.overdueCount += 1;
                }
            }
        }

        const data = Object.values(byOffice).map(bucket => ({
            officeId: bucket.officeId,
            officeName: bucket.officeName,
            officeAlias: bucket.officeAlias,
            totalAssigned: bucket.totalAssigned,
            totalReceived: bucket.totalReceived,
            totalCompleted: bucket.totalCompleted,
            avgAcknowledgmentHours: bucket.acknowledgmentSamples ? +(bucket.acknowledgmentHoursSum / bucket.acknowledgmentSamples).toFixed(2) : null,
            avgResolutionHours: bucket.resolutionSamples ? +(bucket.resolutionHoursSum / bucket.resolutionSamples).toFixed(2) : null,
            overdueCount: bucket.overdueCount,
            overdueRate: bucket.totalCompleted ? +((bucket.overdueCount / bucket.totalCompleted) * 100).toFixed(2) : null
        })).sort((a, b) => (a.officeName || '').localeCompare(b.officeName || ''));

        return res.json({ data });
    } catch (error) {
        console.error('Error generating response time report:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Builds a { responseId -> officeId } map via the RESPONDING staff member's own office
// (Response.userId -> Staff.officeId) — same convention ComplaintController's own scoped
// satisfaction panel uses. A response from a citizen follow-up or a staff member with no Staff
// row (super/admin) contributes to no office's tally, same as elsewhere in this app.
const buildResponseOfficeMap = async () => {
    const staffRows = await Staff.findAll({ attributes: ['userId', 'officeId'], raw: true });
    const officeByUserId = new Map(staffRows.map(s => [s.userId, s.officeId]));
    const responses = await Response.findAll({ attributes: ['id', 'userId'], raw: true });
    const officeByResponseId = new Map();
    responses.forEach(r => {
        const officeId = officeByUserId.get(r.userId);
        if (officeId) officeByResponseId.set(r.id, officeId);
    });
    return officeByResponseId;
};

// Per-office complaint satisfaction (1-5 stars, from ResponseRating) for a given year window.
const getComplaintSatisfactionByOffice = async (year) => {
    const officeByResponseId = await buildResponseOfficeMap();
    const range = yearRange(year);
    const where = range ? { createdAt: { [Op.gte]: range.since, [Op.lte]: range.until } } : {};
    const ratings = await ResponseRating.findAll({ where, attributes: ['responseId', 'rate'], raw: true });

    const byOffice = {};
    ratings.forEach(r => {
        const officeId = officeByResponseId.get(r.responseId);
        if (!officeId) return;
        if (!byOffice[officeId]) byOffice[officeId] = { sum: 0, count: 0 };
        byOffice[officeId].sum += r.rate;
        byOffice[officeId].count += 1;
    });
    return byOffice;
};

// Per-office feedback satisfaction (0-100%, from KioskRating's SQD average) for a year window —
// also returns the raw rows so callers needing the full CSM (per-dimension) breakdown don't have
// to re-query.
const getFeedbackRowsByOffice = async (year) => {
    const range = yearRange(year);
    const where = { isActive: true };
    if (range) where.date = { [Op.gte]: range.since, [Op.lte]: range.until };
    return KioskRating.findAll({ where, attributes: ['officeId', ...SQD_KEYS], raw: true });
};
const sqdPercent = (row) => (SQD_KEYS.reduce((s, k) => s + (row[k] || 0), 0) / SQD_KEYS.length) / 5 * 100;

// Office Performance & Compliance — the flagship "which offices need attention" report. Blends
// response-time/ARTA-compliance (same math as getResponseTimeReport) with AI routing accuracy
// and both satisfaction channels into one per-office scorecard.
exports.getOfficePerformanceReport = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }
    const year = req.query.year ? parseInt(req.query.year) : null;

    try {
        const offices = await Office.findAll({ attributes: ['id', 'name', 'alias'], order: [['name', 'ASC']] });

        const assignments = await ComplaintOffice.findAll({
            where: { isActive: true },
            include: [{ model: Complaint, as: 'complaint', attributes: ['id', 'resolutionDeadline', 'status', 'completedAt'] }]
        });
        const filtered = year ? assignments.filter(a => moment(a.createdAt).year() === year) : assignments;

        const perf = {};
        offices.forEach(o => {
            perf[o.id] = {
                totalAssigned: 0, totalReceived: 0, totalCompleted: 0, overdueCount: 0,
                ackHoursSum: 0, ackSamples: 0, resHoursSum: 0, resSamples: 0,
                lagHoursSum: 0, lagSamples: 0,
                aiAssignedCount: 0, adminAssignedCount: 0,
            };
        });

        filtered.forEach(a => {
            const bucket = perf[a.officeId];
            if (!bucket) return;
            bucket.totalAssigned += 1;
            if (a.assignedBy === 'ai') bucket.aiAssignedCount += 1;
            else if (a.assignedBy === 'admin') bucket.adminAssignedCount += 1;

            const assignedAt = moment(a.createdAt);
            if (a.receivedAt) {
                bucket.totalReceived += 1;
                bucket.ackHoursSum += moment(a.receivedAt).diff(assignedAt, 'hours', true);
                bucket.ackSamples += 1;
            }
            if (a.status === 'completed' && a.completedAt) {
                bucket.totalCompleted += 1;
                bucket.resHoursSum += moment(a.completedAt).diff(assignedAt, 'hours', true);
                bucket.resSamples += 1;
                const deadline = a.complaint?.resolutionDeadline;
                if (deadline && moment(a.completedAt).isAfter(moment(deadline))) bucket.overdueCount += 1;

                // How long AFTER this office finished its own part did a supervisor actually
                // approve the whole complaint (Complaint.completedAt) — the same "approval lag"
                // ComplaintController.getAnalytics tracks system-wide, here broken out per office.
                // On a multi-office complaint this also reflects how long OTHER offices took, for
                // whichever office finished first — an honest side effect of measuring "how long
                // did our completed work sit before the case was actually closed", not a flaw.
                // >=0 guards legacy rows from before updateStatus stopped overwriting completedAt.
                if (a.complaint?.status === 'completed' && a.complaint?.completedAt) {
                    const lagHours = moment(a.complaint.completedAt).diff(moment(a.completedAt), 'hours', true);
                    if (lagHours >= 0) {
                        bucket.lagHoursSum += lagHours;
                        bucket.lagSamples += 1;
                    }
                }
            }
        });

        const complaintSat = await getComplaintSatisfactionByOffice(year);
        const feedbackRows = await getFeedbackRowsByOffice(year);
        const feedbackSat = {};
        feedbackRows.forEach(r => {
            if (!feedbackSat[r.officeId]) feedbackSat[r.officeId] = { sum: 0, count: 0 };
            feedbackSat[r.officeId].sum += sqdPercent(r);
            feedbackSat[r.officeId].count += 1;
        });

        // ComplaintHistory carries no officeId (a reassignment is a complaint-level event, not
        // tied to one office), so this stays a single system-wide figure rather than per-office.
        const reassignedRows = await ComplaintHistory.findAll({ where: { action: 'reassigned' }, attributes: ['complaintId'], raw: true });
        const systemReassignedCount = new Set(reassignedRows.map(r => r.complaintId)).size;
        const totalComplaints = await Complaint.count();
        const systemReassignmentRate = totalComplaints ? +(systemReassignedCount / totalComplaints * 100).toFixed(1) : 0;

        const data = offices.map(o => {
            const b = perf[o.id];
            const cs = complaintSat[o.id];
            const fs = feedbackSat[o.id];
            const aiTotal = b.aiAssignedCount + b.adminAssignedCount;
            return {
                officeId: o.id,
                officeName: o.name,
                officeAlias: o.alias,
                totalAssigned: b.totalAssigned,
                totalReceived: b.totalReceived,
                totalCompleted: b.totalCompleted,
                avgAcknowledgmentHours: b.ackSamples ? +(b.ackHoursSum / b.ackSamples).toFixed(2) : null,
                avgResolutionHours: b.resSamples ? +(b.resHoursSum / b.resSamples).toFixed(2) : null,
                avgApprovalLagHours: b.lagSamples ? +(b.lagHoursSum / b.lagSamples).toFixed(2) : null,
                overdueCount: b.overdueCount,
                overdueRate: b.totalCompleted ? +(b.overdueCount / b.totalCompleted * 100).toFixed(1) : null,
                aiAssignedCount: b.aiAssignedCount,
                adminAssignedCount: b.adminAssignedCount,
                aiAssignedRate: aiTotal ? +(b.aiAssignedCount / aiTotal * 100).toFixed(1) : null,
                avgComplaintSatisfaction: cs && cs.count ? +(cs.sum / cs.count).toFixed(2) : null,
                complaintRatingCount: cs ? cs.count : 0,
                avgFeedbackSatisfaction: fs && fs.count ? +(fs.sum / fs.count).toFixed(1) : null,
                feedbackCount: fs ? fs.count : 0,
            };
        }).sort((a, b) => (a.officeName || '').localeCompare(b.officeName || ''));

        return res.json({ data, systemReassignmentRate, year: year || null });
    } catch (error) {
        console.error('Error generating office performance report:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Client (citizen-account) picture for a window: how many people are registered and verified,
// how fresh complaints are arriving (registered account vs. guest OTP vs. staff walk-in), and how
// concentrated filing is (repeat filers). Shared by the Home "Client" tiles and the AI analysis
// so both read the same numbers. `since`/`until` are a resolvePeriodRange window.
const gatherClientData = async (since, until) => {
    const inWindow = { [Op.gte]: since, [Op.lte]: until };

    const [totalRegistered, verifiedTotal, newRegistrations, newVerified] = await Promise.all([
        Citizen.count(),
        Citizen.count({ where: { isVerified: true } }),
        Citizen.count({ where: { createdAt: inWindow } }),
        Citizen.count({ where: { verifiedAt: inWindow, isVerified: true } }),
    ]);

    const verifiedRows = await Citizen.findAll({
        where: { verifiedAt: inWindow, isVerified: true },
        attributes: ['createdAt', 'verifiedAt'], raw: true,
    });
    const verifyMins = verifiedRows
        .map(c => moment(c.verifiedAt).diff(moment(c.createdAt), 'minutes', true))
        .filter(m => m >= 0);
    const avgVerifyMinutes = verifyMins.length
        ? +(verifyMins.reduce((a, b) => a + b, 0) / verifyMins.length).toFixed(1)
        : null;

    // How complaints in the window came in (Complaint.via), plus repeat-filer concentration —
    // distinct filers keyed by account id, or by guest email for an unclaimed one.
    const windowComplaints = await Complaint.findAll({
        where: { createdAt: inWindow }, attributes: ['id', 'via'], raw: true,
    });
    const channelMix = { account: 0, otp: 0, staff: 0 };
    windowComplaints.forEach(c => { if (c.via in channelMix) channelMix[c.via] += 1; });

    const ids = windowComplaints.map(c => c.id);
    const details = ids.length
        ? await ComplaintDetail.findAll({ where: { complaintId: { [Op.in]: ids } }, attributes: ['userId', 'guestEmail'], raw: true })
        : [];
    const tally = {};
    details.forEach(d => {
        const key = d.userId ? `u${d.userId}` : (d.guestEmail ? `g${d.guestEmail.toLowerCase()}` : null);
        if (key) tally[key] = (tally[key] || 0) + 1;
    });
    const distinctFilers = Object.keys(tally).length;
    const repeatFilers = Object.values(tally).filter(n => n >= 2).length;

    return {
        totalRegistered,
        verifiedTotal,
        verifiedRate: totalRegistered ? +(verifiedTotal / totalRegistered * 100).toFixed(1) : null,
        newRegistrations,
        newVerified,
        avgVerifyMinutes,
        complaintsByChannel: channelMix,
        distinctFilers,
        repeatFilers,
        repeatFilerRate: distinctFilers ? +(repeatFilers / distinctFilers * 100).toFixed(1) : null,
    };
};

// Home dashboard "Client" tiles — the same picture gatherClientData builds, exposed on its own so
// the Home overview can fetch it alongside the complaint/feedback analytics. Super/admin/monitoring
// (system-wide oversight), matching how the other Home panels gate.
exports.getClientOverview = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this data.' });
    }
    const range = resolvePeriodRange(req.query.period, req.query.year);
    try {
        const client = await gatherClientData(range.since, range.until);
        return res.json({
            data: { ...client, range: { period: range.period, year: range.year, label: range.label } },
        });
    } catch (error) {
        console.error('Error building client overview:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// "Analyze Data" — feeds a compact per-period scorecard (city-wide totals, a per-office breakdown,
// and the client picture) to the model and asks for concrete, prioritized recommendations for
// improving the city as a whole and each office. Super/admin only (stricter than the other
// reports, which monitoring can also read — this one is an operational tool, not an oversight
// view). Respects the SAME period/year windowing the Home overview and Complaint/Feedback
// analytics use, via the shared resolvePeriodRange. Read-only: computes, summarizes, asks,
// returns — persists nothing.
exports.getPrescriptions = async (req, res) => {
    if (!['super', 'admin'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this analysis.' });
    }
    if (!hasLLM()) {
        return res.status(503).json({ message: 'AI analysis is unavailable — no model is configured.' });
    }

    const range = resolvePeriodRange(req.query.period, req.query.year);
    const { since, until } = range;
    const inWindow = { [Op.gte]: since, [Op.lte]: until };

    try {
        const offices = await Office.findAll({
            where: { isActive: true },
            attributes: ['id', 'name', 'alias', 'mandate'],
            raw: true,
        });

        // --- complaints filed in this window + their active office assignments ---
        const complaints = await Complaint.findAll({
            where: { createdAt: inWindow },
            attributes: ['id', 'status', 'complexity', 'completedAt', 'resolutionDeadline'],
            raw: true,
        });
        const complaintIds = complaints.map(c => c.id);
        const complaintById = Object.fromEntries(complaints.map(c => [c.id, c]));
        const complaintOffices = complaintIds.length
            ? await ComplaintOffice.findAll({
                where: { complaintId: { [Op.in]: complaintIds }, isActive: true },
                attributes: ['complaintId', 'officeId', 'status', 'receivedAt', 'completedAt', 'createdAt', 'assignedBy'],
                raw: true,
            })
            : [];

        // --- feedback (KioskRating, windowed by date of visit, same as FeedbackController) ---
        const feedbackRows = await KioskRating.findAll({
            where: { isActive: true, date: inWindow },
            attributes: ['officeId', ...SQD_KEYS],
            raw: true,
        });

        // --- complaint-response star ratings in window, mapped to the responding office ---
        const responseOfficeMap = await buildResponseOfficeMap();
        const windowRatings = await ResponseRating.findAll({
            where: { createdAt: inWindow },
            attributes: ['responseId', 'rate'],
            raw: true,
        });

        // --- civic engagement in window ---
        const [discussionsOpened, pollsCreated, discussionComments, pollVotes] = await Promise.all([
            Discussion.count({ where: { createdAt: inWindow } }),
            Poll.count({ where: { createdAt: inWindow } }),
            DiscussionComment.count({ where: { createdAt: inWindow } }),
            PollVote.count({ where: { createdAt: inWindow } }),
        ]);

        // --- per-office rollup ---
        const stat = {};
        offices.forEach(o => {
            stat[o.id] = {
                assigned: 0, received: 0, completed: 0, overdue: 0,
                ackHrs: [], resHrs: [], aiAssigned: 0, adminAssigned: 0,
                fbSum: 0, fbCount: 0, starSum: 0, starCount: 0,
            };
        });
        complaintOffices.forEach(a => {
            const s = stat[a.officeId];
            if (!s) return;
            s.assigned += 1;
            if (a.assignedBy === 'ai') s.aiAssigned += 1;
            else if (a.assignedBy === 'admin') s.adminAssigned += 1;
            const assignedAt = moment(a.createdAt);
            if (a.receivedAt) {
                s.received += 1;
                s.ackHrs.push(moment(a.receivedAt).diff(assignedAt, 'hours', true));
            }
            if (a.status === 'completed' && a.completedAt) {
                s.completed += 1;
                s.resHrs.push(moment(a.completedAt).diff(assignedAt, 'hours', true));
                const deadline = complaintById[a.complaintId]?.resolutionDeadline;
                if (deadline && moment(a.completedAt).isAfter(moment(deadline))) s.overdue += 1;
            }
        });
        feedbackRows.forEach(r => {
            const s = stat[r.officeId];
            if (!s) return;
            s.fbSum += sqdPercent(r);
            s.fbCount += 1;
        });
        windowRatings.forEach(r => {
            const officeId = responseOfficeMap.get(r.responseId);
            const s = officeId ? stat[officeId] : null;
            if (!s) return;
            s.starSum += r.rate;
            s.starCount += 1;
        });

        const avg = (arr) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null);

        const officeSummaries = offices
            .map(o => {
                const s = stat[o.id];
                const routed = s.aiAssigned + s.adminAssigned;
                return {
                    office: o.alias || o.name,
                    mandate: o.mandate ? o.mandate.slice(0, 200) : null,
                    complaintsAssigned: s.assigned,
                    received: s.received,
                    completed: s.completed,
                    stillOpen: s.assigned - s.completed,
                    overdueCompletions: s.overdue,
                    avgAckHours: avg(s.ackHrs),
                    avgResolutionHours: avg(s.resHrs),
                    aiRoutedPct: routed ? Math.round((s.aiAssigned / routed) * 100) : null,
                    feedbackResponses: s.fbCount,
                    avgFeedbackSatisfactionPct: s.fbCount ? Math.round(s.fbSum / s.fbCount) : null,
                    complaintStarRatings: s.starCount,
                    avgComplaintStars: s.starCount ? +(s.starSum / s.starCount).toFixed(2) : null,
                };
            })
            .filter(o => o.complaintsAssigned > 0 || o.feedbackResponses > 0)
            // Keep the model's job (and its output length) bounded — hand it the busiest offices,
            // which is also where the actionable findings are. Rarely more than this have any real
            // volume in a single window anyway.
            .sort((a, b) => (b.complaintsAssigned + b.feedbackResponses) - (a.complaintsAssigned + a.feedbackResponses))
            .slice(0, 12);

        // --- city-wide rollup ---
        const byStatus = {};
        complaints.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
        const overdueResolutions = complaints.filter(c =>
            c.status === 'completed' && c.resolutionDeadline && c.completedAt &&
            moment(c.completedAt).isAfter(moment(c.resolutionDeadline))
        ).length;
        const allAck = offices.flatMap(o => stat[o.id].ackHrs);
        const allRes = offices.flatMap(o => stat[o.id].resHrs);
        const cityFeedbackPct = feedbackRows.length
            ? Math.round(feedbackRows.reduce((sum, r) => sum + sqdPercent(r), 0) / feedbackRows.length)
            : null;
        const cityStars = windowRatings.length
            ? +(windowRatings.reduce((sum, r) => sum + r.rate, 0) / windowRatings.length).toFixed(2)
            : null;

        const citySummary = {
            period: range.label,
            complaintsFiled: complaints.length,
            byStatus,
            unassigned: byStatus.unassigned || 0,
            overdueResolutions,
            avgAckHours: avg(allAck),
            avgResolutionHours: avg(allRes),
            feedbackResponses: feedbackRows.length,
            avgFeedbackSatisfactionPct: cityFeedbackPct,
            complaintStarRatings: windowRatings.length,
            avgComplaintStars: cityStars,
            discussionsOpened,
            discussionComments,
            pollsCreated,
            pollVotes,
        };

        const client = await gatherClientData(since, until);
        const dataSummary = { city: citySummary, client, offices: officeSummaries };

        const system =
            'You are a local-government performance analyst for a Philippine city. You are given a JSON ' +
            'scorecard for ONE reporting window — city-wide totals, a "client" block (registered vs. verified ' +
            'citizen accounts, how complaints arrived: "account" = a signed-in citizen, "otp" = a guest, ' +
            '"staff" = a walk-in filed by staff; and repeat-filer concentration), plus a per-office breakdown ' +
            'of complaint handling (assignment, acknowledgement time in hours, resolution time in hours, count ' +
            'of completions that missed their ARTA/EODB resolution deadline), citizen satisfaction (0-100% CSM ' +
            'feedback and 1-5 star complaint ratings), and civic engagement. Produce concrete, prioritized, ' +
            'actionable recommendations for improving service AND for growing/verifying the citizen base where ' +
            'the client numbers point to a problem. Reply with ONLY a JSON object — no markdown ' +
            'fences, no prose outside it — in exactly this shape: {"city":{"headline":"<one-sentence overall ' +
            'assessment>","recommendations":[{"priority":"high"|"medium"|"low","area":"<short label>",' +
            '"recommendation":"<one specific action>","rationale":"<what in the data prompts this>"}]},' +
            '"offices":[{"office":"<alias EXACTLY as given>","assessment":"<one sentence>","recommendations":' +
            '[{"priority":"...","area":"...","recommendation":"...","rationale":"..."}]}]}. Give the city 3-5 ' +
            'recommendations. Only include an office in "offices" if its numbers show something worth acting ' +
            'on (strong OR weak) — skip offices that are unremarkable. Base every point strictly on the ' +
            'numbers given; if the window is too sparse to judge something, say so rather than inventing a ' +
            'trend. Keep each string under 40 words.';

        const raw = await askLLM({
            system,
            prompt: JSON.stringify(dataSummary),
            maxTokens: 8000,
            json: true,
        });
        if (!raw) {
            return res.status(503).json({ message: 'AI analysis returned nothing — please try again.' });
        }

        // Be forgiving about how the model wraps its answer: strip markdown fences, and if there's
        // any leading/trailing prose, carve out the outermost {...} before parsing.
        let candidate = raw.replace(/```(?:json)?/gi, '').trim();
        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace > 0 || lastBrace < candidate.length - 1) {
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                candidate = candidate.slice(firstBrace, lastBrace + 1);
            }
        }
        let parsed;
        try {
            parsed = JSON.parse(candidate);
        } catch (parseError) {
            console.error('Prescriptions: could not parse model output:', parseError.message, '\n---\n', raw.slice(0, 2000));
            return res.status(502).json({ message: 'AI analysis came back in an unreadable format — please try again.' });
        }

        return res.json({
            range: { period: range.period, year: range.year, label: range.label },
            generatedAt: new Date(),
            dataSummary,
            city: parsed.city || null,
            offices: Array.isArray(parsed.offices) ? parsed.offices : [],
        });
    } catch (error) {
        console.error('Error generating data analysis:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Per-Account Performance — how each admin/workstation account is doing individually, distinct
// from getOfficePerformanceReport's per-OFFICE view above (an office's numbers are a blend of
// everyone assigned to it; this is one person's own receive/completion timing, volume, citizen
// satisfaction, and "done" marks that got sent back). Built on receivedByUserId/completedByUserId
// (ComplaintOffice) and ComplaintHistory.targetUserId — real queryable FKs added specifically for
// this report — rather than actorLabel, which is a display-string snapshot, not aggregable.
// Super/monitoring accounts aren't scored: super is who reviews this report, monitoring never
// transacts at all (see AuthMiddleware's role gates elsewhere).
exports.getAccountPerformanceReport = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }
    const year = req.query.year ? parseInt(req.query.year) : null;
    const range = yearRange(year);
    // Filters by the ACTION's own timestamp (when this account actually received/completed/was
    // rated/was corrected), not the office assignment's createdAt like getOfficePerformanceReport
    // does — this report is about what an account DID in year Y, which can differ from when the
    // underlying complaint was first assigned.
    const inYear = (date) => !range || (date && moment(date).isBetween(range.since, range.until, null, '[]'));

    try {
        const accounts = await User.findAll({
            where: { role: { [Op.in]: ['admin', 'workstation'] } },
            attributes: ['id', 'firstname', 'lastname', 'username', 'role'],
            include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }] }],
            order: [['firstname', 'ASC'], ['lastname', 'ASC']]
        });
        const accountIds = accounts.map(a => a.id);
        if (!accountIds.length) return res.json({ data: [], year: year || null });

        const perf = {};
        accounts.forEach(a => {
            perf[a.id] = {
                totalReceived: 0, totalCompleted: 0, totalResponses: 0,
                ackHoursSum: 0, ackSamples: 0, resHoursSum: 0, resSamples: 0,
                overdueCount: 0, undoneCount: 0,
                ratingSum: 0, ratingCount: 0,
            };
        });

        // Receive/completion speed, sourced from ComplaintOffice rows THIS account personally
        // received/completed (see ResponseController.receive/complete).
        const officeRows = await ComplaintOffice.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { receivedByUserId: { [Op.in]: accountIds } },
                    { completedByUserId: { [Op.in]: accountIds } }
                ]
            },
            include: [{ model: Complaint, as: 'complaint', attributes: ['id', 'resolutionDeadline'] }]
        });

        officeRows.forEach(o => {
            const assignedAt = moment(o.createdAt);
            if (o.receivedByUserId && perf[o.receivedByUserId] && inYear(o.receivedAt)) {
                const bucket = perf[o.receivedByUserId];
                bucket.totalReceived += 1;
                bucket.ackHoursSum += moment(o.receivedAt).diff(assignedAt, 'hours', true);
                bucket.ackSamples += 1;
            }
            if (o.completedByUserId && perf[o.completedByUserId] && inYear(o.completedAt)) {
                const bucket = perf[o.completedByUserId];
                bucket.totalCompleted += 1;
                bucket.resHoursSum += moment(o.completedAt).diff(assignedAt, 'hours', true);
                bucket.resSamples += 1;
                const deadline = o.complaint?.resolutionDeadline;
                if (deadline && moment(o.completedAt).isAfter(moment(deadline))) bucket.overdueCount += 1;
            }
        });

        // Volume — every Response row authored (covers plain replies AND the response that comes
        // bundled with a "done" mark, see ResponseController.complete).
        const responseWhere = { userId: { [Op.in]: accountIds } };
        if (range) responseWhere.createdAt = { [Op.gte]: range.since, [Op.lte]: range.until };
        const responses = await Response.findAll({ where: responseWhere, attributes: ['id', 'userId'], raw: true });
        responses.forEach(r => { if (perf[r.userId]) perf[r.userId].totalResponses += 1; });

        // Citizen satisfaction — ratings left on THIS account's own responses. Direct
        // Response.userId join, no office-attribution map needed here unlike the per-office report
        // (buildResponseOfficeMap), since we're grouping by account, not office.
        const ratingWhere = range ? { createdAt: { [Op.gte]: range.since, [Op.lte]: range.until } } : {};
        const ratings = await ResponseRating.findAll({
            where: ratingWhere,
            include: [{ model: Response, as: 'response', attributes: ['userId'], where: { userId: { [Op.in]: accountIds } } }],
            attributes: ['rate'],
        });
        ratings.forEach(r => {
            const uid = r.response?.userId;
            if (uid && perf[uid]) { perf[uid].ratingSum += r.rate; perf[uid].ratingCount += 1; }
        });

        // Correction rate — how often this account's "done" mark got sent back by a supervisor
        // (ResponseController.reopenOffice), via ComplaintHistory.targetUserId.
        const undoneWhere = { action: 'office_reopened', targetUserId: { [Op.in]: accountIds } };
        if (range) undoneWhere.createdAt = { [Op.gte]: range.since, [Op.lte]: range.until };
        const undoneRows = await ComplaintHistory.findAll({ where: undoneWhere, attributes: ['targetUserId'], raw: true });
        undoneRows.forEach(r => { if (perf[r.targetUserId]) perf[r.targetUserId].undoneCount += 1; });

        const data = accounts.map(a => {
            const b = perf[a.id];
            // Denominator is completions CURRENTLY attributed to this account plus ones that got
            // undone — not a full historical count (a since-reassigned or re-completed-by-someone-
            // else office no longer counts toward either side), but honest about what it measures:
            // of this account's completions we can still see evidence of, how many got sent back.
            const correctionDenominator = b.totalCompleted + b.undoneCount;
            return {
                userId: a.id,
                name: `${a.firstname || ''} ${a.lastname || ''}`.trim() || a.username,
                role: a.role,
                office: a.staff?.office?.alias || a.staff?.office?.name || null,
                totalReceived: b.totalReceived,
                totalCompleted: b.totalCompleted,
                totalResponses: b.totalResponses,
                avgAcknowledgmentHours: b.ackSamples ? +(b.ackHoursSum / b.ackSamples).toFixed(2) : null,
                avgResolutionHours: b.resSamples ? +(b.resHoursSum / b.resSamples).toFixed(2) : null,
                overdueCount: b.overdueCount,
                overdueRate: b.totalCompleted ? +(b.overdueCount / b.totalCompleted * 100).toFixed(1) : null,
                avgSatisfaction: b.ratingCount ? +(b.ratingSum / b.ratingCount).toFixed(2) : null,
                ratingCount: b.ratingCount,
                undoneCount: b.undoneCount,
                correctionRate: correctionDenominator ? +(b.undoneCount / correctionDenominator * 100).toFixed(1) : null,
            };
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return res.json({ data, year: year || null });
    } catch (error) {
        console.error('Error generating account performance report:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Citizen Satisfaction / CSM — the formal ARTA Client Satisfaction Measurement breakdown, every
// office side by side (unlike FeedbackController.getFeedbackAnalytics, which only ever returns
// ONE scope at a time). Also returns a complaint-vs-feedback comparison for the same offices/
// window, since the two channels use different rating scales (1-5 stars vs. the SQD-derived %).
exports.getCsmReport = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }
    const year = req.query.year ? parseInt(req.query.year) : null;

    try {
        const offices = await Office.findAll({ attributes: ['id', 'name', 'alias'], order: [['name', 'ASC']] });
        const feedbackRows = await getFeedbackRowsByOffice(year);

        const byOffice = {};
        offices.forEach(o => {
            byOffice[o.id] = { count: 0, pctSum: 0, sqdSums: SQD_KEYS.map(() => 0), sqdCounts: SQD_KEYS.map(() => 0) };
        });
        feedbackRows.forEach(r => {
            const bucket = byOffice[r.officeId];
            if (!bucket) return;
            bucket.count += 1;
            bucket.pctSum += sqdPercent(r);
            SQD_KEYS.forEach((k, i) => {
                if (r[k]) { bucket.sqdSums[i] += r[k]; bucket.sqdCounts[i] += 1; }
            });
        });

        const csm = offices.map(o => {
            const b = byOffice[o.id];
            return {
                officeId: o.id,
                officeName: o.name,
                officeAlias: o.alias,
                totalRespondents: b.count,
                avgSatisfaction: b.count ? +(b.pctSum / b.count).toFixed(1) : null,
                sqdAverages: SQD_KEYS.map((k, i) => b.sqdCounts[i] ? +(b.sqdSums[i] / b.sqdCounts[i]).toFixed(2) : null),
            };
        }).sort((a, b) => (a.officeName || '').localeCompare(b.officeName || ''));

        const complaintSat = await getComplaintSatisfactionByOffice(year);
        const comparison = offices.map(o => {
            const c = complaintSat[o.id];
            const f = byOffice[o.id];
            return {
                officeId: o.id,
                officeName: o.name,
                officeAlias: o.alias,
                complaintSatisfaction: c && c.count ? +(c.sum / c.count).toFixed(2) : null, // 1-5 stars
                complaintRatingCount: c ? c.count : 0,
                feedbackSatisfaction: f.count ? +(f.pctSum / f.count).toFixed(1) : null, // 0-100%
                feedbackCount: f.count,
            };
        }).sort((a, b) => (a.officeName || '').localeCompare(b.officeName || ''));

        return res.json({ csm, comparison, sqdLabels: SQD_LABELS, year: year || null });
    } catch (error) {
        console.error('Error generating CSM report:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Exports the CURRENTLY DISPLAYED report tab to PDF. The frontend already computed every value
// shown on screen (KPI tiles, table rows, tone colors) to render its own Vue template — rather
// than re-deriving all of that a second time here (and risking the PDF silently drifting from
// what the user was actually looking at), it sends that same ready-to-print payload straight
// through. This function's only job is turning it into HTML (via the same Pug + Puppeteer
// pipeline FeedbackController.generatePDFRating already uses) and back into a PDF buffer.
exports.exportPdf = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }

    const { title, meta, kpis, sections } = req.body;
    if (!title || !Array.isArray(sections)) {
        return res.status(400).json({ message: 'title and sections are required.' });
    }

    let browser;
    try {
        const templatePath = path.join(__dirname, '../templates/reports/GovernanceReport.pug');
        const seal = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../templates/reports/seal.png')).toString('base64');

        const html = pug.renderFile(templatePath, {
            title,
            meta: meta || '',
            kpis: Array.isArray(kpis) ? kpis : [],
            sections,
            seal,
            generatedAt: moment().format('MMM DD, YYYY hh:mm A'),
        });

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        // A3 landscape — the widest report table here (CSM: office + respondents + overall +
        // all 9 SQD dimensions) needs more room than Letter/Legal comfortably gives at readable
        // font sizes.
        const pdfBuffer = await page.pdf({
            format: 'A3',
            landscape: true,
            margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' },
            printBackground: true
        });

        // inline, not attachment — the frontend previews this in an iframe (matching the Feedback
        // module's rating PDF) instead of forcing a download.
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`
        });
        res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error('Error exporting report PDF:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    } finally {
        if (browser) await browser.close();
    }
};

// "All internal activities", one feed — merges the two audit sources the app actually has:
// ComplaintHistory (complaints keep their own dedicated table) and the new ActivityLog (every
// other admin module: Discussion, Poll, Office, User, Holiday, manual Feedback entries). Neither
// table is large enough per year to need real pagination yet, so both are simply queried, tagged
// with a common shape, merged, and sorted newest-first here.
exports.getActivityLog = async (req, res) => {
    if (!['super', 'admin', 'monitoring'].includes(req.role)) {
        return res.status(403).json({ message: 'You do not have access to this report.' });
    }

    const range = yearRange(req.query.year);
    const where = range ? { createdAt: { [Op.between]: [range.since, range.until] } } : {};

    try {
        const [complaintRows, activityRows] = await Promise.all([
            ComplaintHistory.findAll({ where, order: [['createdAt', 'DESC']], limit: 500 }),
            ActivityLog.findAll({ where, order: [['createdAt', 'DESC']], limit: 500 }),
        ]);

        const merged = [
            ...complaintRows.map(r => ({
                module: 'complaint',
                entityId: r.complaintId,
                action: r.action,
                actorRole: r.actorRole,
                actorLabel: r.actorLabel,
                description: r.description,
                createdAt: r.createdAt,
            })),
            ...activityRows.map(r => ({
                module: r.module,
                entityId: r.entityId,
                action: r.action,
                actorRole: r.actorRole,
                actorLabel: r.actorLabel,
                description: r.description,
                createdAt: r.createdAt,
            })),
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 500);

        return res.json({ data: merged });
    } catch (error) {
        console.error('Error fetching activity log:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};
