const moment = require('moment');
const { Holiday } = require('../models');

const RECEIVE_WINDOW_HOURS = 24;

const isWeekend = (m) => m.day() === 0 || m.day() === 6; // Sunday=0, Saturday=6

// Active holiday dates as a Set of 'YYYY-MM-DD' strings — loaded fresh each call since the
// table is small and the calendar can change; called once per deadline computation, never in
// a per-day loop.
const loadHolidaySet = async () => {
    const holidays = await Holiday.findAll({
        where: { isActive: true },
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

// Computes the 24-business-hour acknowledgement deadline for a ComplaintOffice going active
// `from` now (or a given moment). Frozen at call time — never recomputed retroactively.
const computeReceiveDeadline = async (from = new Date()) => {
    const holidaySet = await loadHolidaySet();
    return addBusinessHours(moment(from), RECEIVE_WINDOW_HOURS, holidaySet).toDate();
};

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

// ARTA/EODB complexity tiering — target resolution time in business days per tier.
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

// Computes the resolution deadline for a complaint classified as `complexity`, `from` now (or a
// given moment). Returns null for an unrecognized/missing complexity. Frozen at call time.
const computeResolutionDeadline = async (complexity, from = new Date()) => {
    const days = RESOLUTION_DAYS[complexity];
    if (!days) return null;
    const holidaySet = await loadHolidaySet();
    return addBusinessDays(moment(from), days, holidaySet).toDate();
};

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
    RECEIVE_WINDOW_HOURS,
    RESOLUTION_DAYS,
    addBusinessHours,
    addBusinessDays,
    computeReceiveDeadline,
    computeResolutionDeadline,
    getReceiveComplianceStatus,
    getResolutionComplianceStatus,
};
