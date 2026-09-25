const moment = require('moment');

// Shared week/month/year windowing — originally lived only in FeedbackController.js, now also
// used by DiscussionController.js. 'week' aligns to the ISO week (Monday) so it matches the
// trend-bucketing convention used everywhere this is consumed; month/year align to the calendar
// unit. `yearParam` lets a dashboard look at a past year instead of always "now": for the current
// year, everything is relative to the real current moment as usual; for any other year, "now"
// becomes Dec 31 of that year, so period='year' shows the whole year, and period='week'/'month'
// show that year's last week/month — a past year has no "current week" of its own, so this is the
// least surprising stand-in.
const resolvePeriodRange = (periodParam, yearParam) => {
    const period = ['week', 'month', 'year'].includes(periodParam) ? periodParam : 'month';
    const currentYear = moment().year();
    const year = Number.isInteger(Number(yearParam)) && Number(yearParam) > 0 ? Number(yearParam) : currentYear;
    const referenceMoment = year === currentYear ? moment() : moment(`${year}-12-31`, 'YYYY-MM-DD').endOf('day');
    const sinceMoment = period === 'week' ? moment(referenceMoment).startOf('isoWeek') : moment(referenceMoment).startOf(period);
    const until = referenceMoment.toDate();
    return {
        period,
        year,
        sinceMoment,
        referenceMoment,
        since: sinceMoment.toDate(),
        until,
        label: `${sinceMoment.format('MMM D')} – ${moment(until).format('MMM D, YYYY')}`
    };
};

module.exports = { resolvePeriodRange };
