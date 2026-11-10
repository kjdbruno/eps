const moment = require('moment');
const { Holiday } = require('../models');

// The timeline every feedback is held to, counted in calendar days from the moment it is routed to
// an office: the office acknowledges it within ACK_WINDOW_DAYS, then has RESOLUTION_WINDOW_DAYS to
// resolve it (so it is due on day 4), and may ask ONCE for EXTENSION_DAYS more (day 7 at most).
// There is no complexity tier any more — it is the same for every feedback.
const ACK_WINDOW_DAYS = 1;
const RESOLUTION_WINDOW_DAYS = 3;
const EXTENSION_DAYS = 3;

// Legacy (business-hour) figure — only the old demo seeder still reads it.
const RECEIVE_WINDOW_HOURS = 24;

const isWeekend = (m) => m.day() === 0 || m.day() === 6; // Sunday=0, Saturday=6

// Active holiday dates as a Set of 'YYYY-MM-DD' strings — loaded fresh each call since the
// table is small and the calendar can change; called once per deadline computation, never in
// a per-day loop.
const loadHolidaySet = async () => {
    const holidays = await Holiday.findAll({
        // a special working day is an ordinary working day: it never pushes a deadline
        where: { isActive: true, category: { [require('sequelize').Op.ne]: 'working' } },
        attributes: ['date'],
        raw: true
    });
    return new Set(holidays.map(h => moment(h.date).format('YYYY-MM-DD')));
};

const isHoliday = (m, holidaySet) => holidaySet.has(m.format('YYYY-MM-DD'));

// Adds `hours` raw hours to `start`, then rolls the result forward a day at a time past any
// Saturday/Sunday/holiday it lands on — so weekends and holidays don't count against the
// window, matching "24hrs excluding weekends and holidays" literally (a Friday-afternoon
// assignment lands Monday afternoon; a holiday the next day rolls one day further still).
const addBusinessHours = (start, hours, holidaySet) => {
    const deadline = moment(start).add(hours, 'hours');
    while (isWeekend(deadline) || isHoliday(deadline, holidaySet)) {
        deadline.add(1, 'day');
    }
    return deadline;
};

// The acknowledgement deadline for a ComplaintOffice going active `from` now (or a given moment):
// one calendar day. Frozen at call time — never recomputed retroactively.
const computeReceiveDeadline = async (from = new Date()) => (
    moment(from).add(ACK_WINDOW_DAYS, 'days').toDate()
);

// co: a ComplaintOffice-shaped object with isActive, receivedAt, receiveDeadline.
// Purely derived from stored timestamps — never itself stored, so it can't go stale.
const getReceiveComplianceStatus = (co) => {
    if (!co || !co.isActive || !co.receiveDeadline) return 'not_applicable';

    const deadline = moment(co.receiveDeadline);
    if (co.receivedAt) {
        return moment(co.receivedAt).isSameOrBefore(deadline) ? 'on_time' : 'late';
    }
    return moment().isAfter(deadline) ? 'overdue' : 'awaiting';
};

// Legacy complexity tiers (business days) — no longer used for any deadline; only the old demo
// seeder still reads this.
const RESOLUTION_DAYS = { simple: 3, complex: 7, highly_technical: 20 };

// Adds `days` whole business days to `start` (skipping weekends/holidays entirely rather than
// just rolling past a single landing day, since this can span multiple weeks for the
// highly_technical tier) — the standard "N working days from X" calculation.
const addBusinessDays = (start, days, holidaySet) => {
    const cursor = moment(start);
    let remaining = days;
    while (remaining > 0) {
        cursor.add(1, 'day');
        if (!isWeekend(cursor) && !isHoliday(cursor, holidaySet)) {
            remaining--;
        }
    }
    return cursor;
};

// The resolution deadline for a feedback routed `from` now (or a given moment): the day-long
// acknowledgement window plus the 3 days to resolve it. Frozen at call time; an extension moves the
// stored date later by EXTENSION_DAYS (see ComplaintController.requestExtension).
const computeResolutionDeadline = async (from = new Date()) => (
    moment(from).add(ACK_WINDOW_DAYS + RESOLUTION_WINDOW_DAYS, 'days').toDate()
);

// complaint: a Complaint-shaped object with status, completedAt, resolutionDeadline.
// A cancelled complaint is never judged for resolution timeliness, regardless of completedAt.
const getResolutionComplianceStatus = (complaint) => {
    if (!complaint || !complaint.resolutionDeadline) return 'not_applicable';
    if (complaint.status === 'cancelled') return 'not_applicable';

    const deadline = moment(complaint.resolutionDeadline);
    if (complaint.completedAt) {
        return moment(complaint.completedAt).isSameOrBefore(deadline) ? 'on_time' : 'late';
    }
    return moment().isAfter(deadline) ? 'overdue' : 'awaiting';
};

module.exports = {
    ACK_WINDOW_DAYS,
    RESOLUTION_WINDOW_DAYS,
    EXTENSION_DAYS,
    RECEIVE_WINDOW_HOURS,
    RESOLUTION_DAYS,
    addBusinessHours,
    addBusinessDays,
    computeReceiveDeadline,
    computeResolutionDeadline,
    getReceiveComplianceStatus,
    getResolutionComplianceStatus,
};
