const { Op, Sequelize  } = require("sequelize");
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars'); // Import Handlebars
const pug = require('pug');
const moment = require('moment');
const { Office, KioskRating, Sex, Rating, Staff } = require('../models');
const { tagReport } = require('../utils/sentiment');
const { resolvePeriodRange } = require('../utils/periodRange');
const { logActivity } = require('../utils/activityLog');

const MAX_SQD_VALUE = 5;
const SQD_KEYS = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];

// Buckets a satisfaction % into the same 70/85 severity thresholds already used elsewhere in the
// app (office rail, rating-list pills), plus a top "excellent" band since satisfaction data
// tends to skew high. Shared by getFeedbackAnalytics (system/office-wide) and getAllRatings (one
// office's own detail modal) so both "satisfaction distribution" charts read the same way.
const RATING_BANDS = [
    { label: 'Needs improvement', min: 0, max: 70 },
    { label: 'Fair', min: 70, max: 85 },
    { label: 'Good', min: 85, max: 95 },
    { label: 'Excellent', min: 95, max: Infinity },
];
const bucketRatingDistribution = (percentages) => RATING_BANDS.map(band => ({
    label: band.label,
    count: percentages.filter(pct => pct >= band.min && pct < band.max).length
}));

// Super/admin/monitoring see every office's feedback; workstation staff see only their own
// office's — the same split ComplaintController.getAnalytics uses. Returns null to signal "no
// access at all" (no Staff row and not super/admin/monitoring — e.g. a citizen token, which has
// no business here).
const resolveOfficeScope = async (req) => {
    if (['super', 'admin', 'monitoring'].includes(req.role)) {
        return { officeId: null, label: null };
    }
    const staff = await Staff.findOne({
        where: { userId: req.userId },
        include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }]
    });
    if (!staff) return null;
    return { officeId: staff.officeId, label: staff.office?.alias || staff.office?.name || null };
};

// Office list backing the Feedback page's rail — one row per office (or just their own, for a
// scoped workstation view), each carrying this period's avg. rating and feedback count.
exports.getAllFeedbacks = async (req, res) => {

    const scope = await resolveOfficeScope(req);
    if (scope === null) {
        return res.status(403).json({ message: 'You do not have access to this data.' });
    }

    const range = resolvePeriodRange(req.query.period, req.query.year);
    const sinceStr = moment(range.since).format('YYYY-MM-DD HH:mm:ss');
    const untilStr = moment(range.until).format('YYYY-MM-DD HH:mm:ss');

    try {
        const officeWhere = {};
        if (scope.officeId) officeWhere.id = scope.officeId;

        const feedbacks = await Office.findAll({
            where: officeWhere,
            attributes: {
                include: [
                    [
                        Sequelize.literal(`
                            (SELECT
                                (AVG(
                                    COALESCE(sqd0, 0) + COALESCE(sqd1, 0) + COALESCE(sqd2, 0) +
                                    COALESCE(sqd3, 0) + COALESCE(sqd4, 0) + COALESCE(sqd5, 0) +
                                    COALESCE(sqd6, 0) + COALESCE(sqd7, 0) + COALESCE(sqd8, 0)
                                ) / 9.0) / ${MAX_SQD_VALUE} * 100
                            FROM kioskratings AS kr
                            WHERE kr.officeId = Office.id AND kr.isActive = true AND kr.date >= '${sinceStr}' AND kr.date <= '${untilStr}')
                        `),
                        'averageSqdPercentage'
                    ],
                    [
                        Sequelize.literal(`
                            (SELECT COUNT(*) FROM kioskratings AS kr2
                             WHERE kr2.officeId = Office.id AND kr2.isActive = true AND kr2.date >= '${sinceStr}' AND kr2.date <= '${untilStr}')
                        `),
                        'totalFeedback'
                    ],
                    [
                        Sequelize.literal(`
                            (SELECT COUNT(*) FROM kioskratings AS kr3
                             WHERE kr3.officeId = Office.id AND kr3.isActive = true AND kr3.sentiment = 'negative' AND kr3.date >= '${sinceStr}' AND kr3.date <= '${untilStr}')
                        `),
                        'negativeFeedback'
                    ]
                ]
            },
            order: [['name', 'ASC']]
        });
        res.json({ data: feedbacks, range: { period: range.period, year: range.year, label: range.label } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// System-wide (or, for a scoped workstation, office-wide) analytics for the Feedback page's
// dashboard — everything derived from KioskRating directly, computed fresh on each call.
exports.getFeedbackAnalytics = async (req, res) => {

    const scope = await resolveOfficeScope(req);
    if (scope === null) {
        return res.status(403).json({ message: 'You do not have access to this data.' });
    }

    const range = resolvePeriodRange(req.query.period, req.query.year);

    try {
        // A workstation account is always looking at its own office. A supervisor looks at the whole system, or, when
        // an office is chosen on the page (officeId), at that one office: the same figures, scoped.
        let officeId = scope.officeId;
        let officeLabel = scope.label;
        let office = null;
        if (!officeId && req.query.officeId) {
            officeId = parseInt(req.query.officeId, 10) || null;
        }
        if (officeId) {
            office = await Office.findByPk(officeId, { attributes: ['id', 'name', 'alias', 'mandate'], raw: true });
            if (!office) {
                return res.status(404).json({ message: 'Office not found.' });
            }
            officeLabel = office.alias || office.name;
        }

        const where = { isActive: true, date: { [Op.gte]: range.since, [Op.lte]: range.until } };
        if (officeId) where.officeId = officeId;

        const rows = await KioskRating.findAll({
            where,
            attributes: ['id', 'officeId', 'date', 'type', 'sex', 'age', 'entryFrom', 'cc1', 'cc2', 'cc3', 'sentiment', 'sentimentReason', ...SQD_KEYS],
            raw: true
        });

        const ratingPercent = (row) => {
            const sum = SQD_KEYS.reduce((s, k) => s + (row[k] || 0), 0);
            return (sum / SQD_KEYS.length) / MAX_SQD_VALUE * 100;
        };

        const totalFeedback = rows.length;
        const avgSatisfaction = totalFeedback
            ? +(rows.reduce((s, r) => s + ratingPercent(r), 0) / totalFeedback).toFixed(1)
            : null;

        const kioskCount = rows.filter(r => r.entryFrom === 'kiosk').length;
        const manualCount = rows.filter(r => r.entryFrom === 'manual').length;

        // cc1 '4' = "I do not know what a Citizen's Charter is and did not see one" — everything
        // else means some level of awareness.
        const charterAwareCount = rows.filter(r => r.cc1 && r.cc1 !== '4').length;
        const charterAwareRate = totalFeedback ? +(charterAwareCount / totalFeedback * 100).toFixed(1) : null;

        // Filing volume trend, bucketed to fit the selected period — same adaptive granularity
        // ComplaintController.getAnalytics uses (daily/weekly/monthly).
        let bucketDefs;
        if (range.period === 'week') {
            bucketDefs = Array.from({ length: 7 }, (_, i) => {
                const day = moment(range.sinceMoment).add(i, 'days');
                return { label: day.format('ddd D'), start: moment(day).startOf('day'), end: moment(day).endOf('day') };
            });
        } else if (range.period === 'year') {
            bucketDefs = Array.from({ length: 12 }, (_, i) => {
                const m = moment(range.sinceMoment).add(i, 'months');
                return { label: m.format('MMM'), start: moment(m).startOf('month'), end: moment(m).endOf('month') };
            });
        } else {
            const weekSpan = Math.max(1, Math.ceil(moment(range.until).diff(range.sinceMoment, 'days') / 7) + 1);
            bucketDefs = Array.from({ length: weekSpan }, (_, i) => {
                const w = moment(range.sinceMoment).add(i, 'weeks');
                return { label: w.format('MMM D'), start: moment(w).startOf('day'), end: moment(w).add(6, 'days').endOf('day') };
            });
        }
        const volumeTrend = bucketDefs.map(b => ({ label: b.label, count: 0 }));
        const trendSums = bucketDefs.map(() => ({ sum: 0, count: 0 }));
        rows.forEach(r => {
            const d = moment(r.date);
            const idx = bucketDefs.findIndex(b => d.isBetween(b.start, b.end, null, '[]'));
            if (idx >= 0) {
                volumeTrend[idx].count++;
                trendSums[idx].sum += ratingPercent(r);
                trendSums[idx].count++;
            }
        });
        // how satisfied they were, over the same buckets (a bucket with no report has no average)
        const satisfactionTrend = bucketDefs.map((b, i) => ({
            label: b.label,
            avgPercentage: trendSums[i].count ? +(trendSums[i].sum / trendSums[i].count).toFixed(1) : null
        }));

        // Avg. rating by office — the panel that actually flags which offices need attention.
        // For a scoped workstation view this naturally comes back as a single row (their own),
        // same as ComplaintController's officeBacklog; the frontend skips the panel there.
        const byOffice = {};
        rows.forEach(r => {
            if (!byOffice[r.officeId]) byOffice[r.officeId] = { sum: 0, count: 0 };
            byOffice[r.officeId].sum += ratingPercent(r);
            byOffice[r.officeId].count++;
        });
        const officeIds = Object.keys(byOffice).map(Number);
        const offices = officeIds.length
            ? await Office.findAll({ where: { id: officeIds }, attributes: ['id', 'name', 'alias'], raw: true })
            : [];
        const officesById = Object.fromEntries(offices.map(o => [o.id, o]));
        const ratingByOffice = officeIds
            .map(id => ({
                officeId: id,
                label: officesById[id]?.alias || officesById[id]?.name || 'Unknown office',
                avgRating: +(byOffice[id].sum / byOffice[id].count).toFixed(1),
                count: byOffice[id].count
            }))
            .sort((a, b) => a.avgRating - b.avgRating); // worst first — where attention is needed

        // Per-dimension averages (SQD0-8) — shows which specific dimension (speed, cost,
        // courtesy, fairness...) is dragging scores down, not visible from the overall % alone.
        // 0 means "not answered" (see the frontend's own N/A handling), so it's excluded from
        // the average rather than counted as a 0-star rating.
        const sqdAverages = SQD_KEYS.map((key, i) => {
            const values = rows.map(r => r[key]).filter(v => v != null && v > 0);
            return {
                dimension: `SQD${i}`,
                avg: values.length ? +(values.reduce((s, v) => s + v, 0) / values.length).toFixed(2) : null
            };
        });

        const countBy = (key, labelMap) => {
            const counts = {};
            rows.forEach(r => {
                const v = r[key] || 'unknown';
                counts[v] = (counts[v] || 0) + 1;
            });
            return Object.entries(counts).map(([value, count]) => ({ label: labelMap?.[value] || value, count }));
        };

        const clientTypeMix = countBy('type', { citizen: 'Citizen', business: 'Business', government: 'Government' });
        const sexMix = countBy('sex');
        const entryMethodMix = countBy('entryFrom', { kiosk: 'Kiosk', manual: 'Manual' });
        const cc1Mix = countBy('cc1', {
            '1': 'Saw the charter',
            '2': 'Knows, but did not see',
            '3': 'Learned only upon seeing',
            '4': "Didn't know / didn't see"
        });

        const ageMix = [
            { label: 'Young dependents (0-14)', min: 0, max: 14 },
            { label: 'Working age (15-64)', min: 15, max: 64 },
            { label: 'Older (65+)', min: 65, max: Infinity },
        ].map(b => ({
            label: b.label,
            count: rows.filter(r => r.age != null && r.age !== '' && Number(r.age) >= b.min && Number(r.age) <= b.max).length
        }));
        const cc2Mix = countBy('cc2', { '1': 'Easy to see', '2': 'Somewhat easy to see', '3': 'Difficult to see', '4': 'Not visible at all', '5': 'N/A' });
        const cc3Mix = countBy('cc3', { '1': 'Helped very much', '2': 'Somewhat helped', '3': 'Did not help', '4': 'N/A' });

        // The reports themselves, newest first: only for one office (the list the office works from)
        const reports = officeId
            ? rows
                .map(r => ({ id: r.id, date: r.date, entryFrom: r.entryFrom, averageSqdPercentage: +ratingPercent(r).toFixed(2), sentiment: r.sentiment, sentimentReason: r.sentimentReason }))
                .sort((a, b) => new Date(b.date) - new Date(a.date))
            : [];

        // Spread of individual ratings, not just the overall average — an 80% average can hide a
        // 50/50 split between "excellent" and "needs improvement" that the average alone masks.
        const ratingDistribution = bucketRatingDistribution(rows.map(ratingPercent));

        // how the reports read (positive / neutral / negative, see utils/sentiment.js)
        const sentimentMix = { positive: 0, neutral: 0, negative: 0, unread: 0 };
        rows.forEach(r => { sentimentMix[r.sentiment || 'unread']++; });

        return res.json({
            data: {
                range: { period: range.period, year: range.year, label: range.label, since: range.since, until: range.until },
                scope: { officeId, label: officeLabel, locked: !!scope.officeId },
                office,
                kpis: { totalFeedback, avgSatisfaction, kioskCount, manualCount, charterAwareRate },
                volumeTrend,
                satisfactionTrend,
                ageMix,
                cc2Mix,
                cc3Mix,
                reports,
                ratingByOffice,
                sqdAverages,
                clientTypeMix,
                sexMix,
                entryMethodMix,
                cc1Mix,
                ratingDistribution,
                sentimentMix
            }
        });
    } catch (error) {
        console.error('Error generating feedback analytics:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

exports.createFeedbackKiosk = async (req, res) => {
    const { 
        date,
        email,
        officeId,
        type,
        sex,
        age,
        residence,
        serviceAvailed,
        cc1,
        cc2,
        cc3,
        sqd0,
        sqd1,
        sqd2,
        sqd3,
        sqd4,
        sqd5,
        sqd6,
        sqd7,
        sqd8,
        suggestion,
    } = req.body;
    try {
        // save kiosk rating
        const kiosk = await KioskRating.create({
            email,
            officeId,
            type,
            date,
            sex,
            age,
            residence,
            serviceAvailed,
            cc1,
            cc2,
            cc3,
            sqd0,
            sqd1,
            sqd2,
            sqd3,
            sqd4,
            sqd5,
            sqd6,
            sqd7,
            sqd8,
            entryFrom: 'manual',
            suggestion
        });
        //save rating
        const ratings = [sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8];
        const validRatings = ratings.filter(r => r !== 0);
        const total = validRatings.reduce((sum, r) => sum + r, 0);
        const rate = validRatings.length ? total / validRatings.length : 0;

        const rating = await Rating.create({
            officeId,
            rating: rate
        });

        // io.emit('assessmentCreated', { message: "assessment created successfully.", queue, assessment, item, payor });

        const office = await Office.findByPk(officeId);
        logActivity({
            module: 'feedback', entityId: kiosk.id, action: 'created',
            actorId: req.userId, actorRole: req.role,
            description: `Recorded a manual CSM report entry for ${office ? (office.alias || office.name) : `office #${officeId}`}`
        });

        tagReport(kiosk.id); // read in the background
        res.status(201).json({ message: "Rating Created Successfully.", kiosk, rating });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllRatings = async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // req.params.year used to be concatenated straight into a raw Sequelize.literal() SQL
    // string below — a SQL injection hole (CWE-89). Sequelize.where(...) is the parameterized
    // equivalent already used for the same "filter by year" comparison elsewhere in this file
    // (getFeedbackAnalytics etc.) — the value here is bound, never interpolated into SQL text.
    const year = parseInt(req.params.year, 10);
    if (!year) {
        return res.status(400).json({ message: 'A valid year is required.' });
    }
    const yearFilter = Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), year);

    // A workstation user may only open the modal for their own office — mirrors the same check
    // ComplaintController.getComplaintDetail applies.
    const scope = await resolveOfficeScope(req);
    if (scope === null) {
        return res.status(403).json({ message: 'You do not have access to this data.' });
    }
    if (scope.officeId && String(scope.officeId) !== String(req.params.id)) {
        return res.status(403).json({ message: 'You do not have access to this office.' });
    }

    try {
        const { count, rows } = await KioskRating.findAndCountAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [yearFilter]
            },
            attributes: {
                include: [
                    [
                        Sequelize.literal(`
                            (SELECT
                                (AVG(
                                    COALESCE(sqd0, 0) + COALESCE(sqd1, 0) + COALESCE(sqd2, 0) +
                                    COALESCE(sqd3, 0) + COALESCE(sqd4, 0) + COALESCE(sqd5, 0) +
                                    COALESCE(sqd6, 0) + COALESCE(sqd7, 0) + COALESCE(sqd8, 0)
                                ) / 9.0) / ${MAX_SQD_VALUE} * 100
                            FROM kioskratings AS kr
                            WHERE kr.id = KioskRating.id)
                        `),
                        'averageSqdPercentage'
                    ],
                ],
                
            },
            limit,
            offset,
            order: [
                ['createdAt', 'DESC'] // 'DESC' for latest first (descending order)
            ]
        });
        /**
         * 
         * 
         * FREQUENCY
         * 
         */
        const frequencies = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [yearFilter]
            }
        });
        
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthlyCounts = {};
        const monthlyPercentSums = {};
        const monthlyRatedCounts = {};

        monthNames.forEach(month => {
            monthlyCounts[month] = 0;
            monthlyPercentSums[month] = 0;
            monthlyRatedCounts[month] = 0;
        });

        // Was comparing against the real current year regardless of which year was actually
        // requested — every "frequency" chart silently showed nothing for any past year. Use
        // the requested year instead.
        const targetYear = parseInt(req.params.year, 10);
        const ratingPercentages = [];
        frequencies.forEach(rating => {
            const ratingDate = new Date(rating.date);
            if (ratingDate.getFullYear() === targetYear) {
                const monthName = monthNames[ratingDate.getMonth()];
                monthlyCounts[monthName]++;

                const sum = SQD_KEYS.reduce((s, k) => s + (rating[k] || 0), 0);
                const pct = (sum / SQD_KEYS.length) / MAX_SQD_VALUE * 100;
                monthlyPercentSums[monthName] += pct;
                monthlyRatedCounts[monthName]++;
                ratingPercentages.push(pct);
            }
        });

        const result = Object.keys(monthlyCounts).map(month => {
            return {
                label: month,
                count: monthlyCounts[month]
            };
        });

        // Satisfaction trend — avg. rating per month, not just how many came in. The frequency
        // chart above already shows volume; this is the one that actually shows whether this
        // office is improving or slipping.
        const satisfactionTrend = monthNames.map(month => ({
            label: month,
            avgPercentage: monthlyRatedCounts[month]
                ? +(monthlyPercentSums[month] / monthlyRatedCounts[month]).toFixed(1)
                : null
        }));

        // Spread of this office's own ratings, not just its overall average — same bands as the
        // system-wide version on FeedbackPage.vue (getFeedbackAnalytics above).
        const ratingDistribution = bucketRatingDistribution(ratingPercentages);
        /**
         * 
         * CLIENT TYPE
         * 
         */
        const expectedTypes = {
            citizen: { label: 'Citizen', count: 0 },
            business: { label: 'Business', count: 0 },
            government: { label: 'Government', count: 0 },
        };

        const types = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                'type',
                [Sequelize.fn('COUNT', Sequelize.col('type')), 'count'],
            ],
            group: ['type'],
        });

        types.forEach((item) => {
            const type = item.get('type');
            const count = item.get('count');
            if (expectedTypes[type]) {
                expectedTypes[type].count = count;
            }
        });

        const clientType = Object.values(expectedTypes);

        /**
         * 
         * SEX
         * 
         */
        const expectedSexes = {
            Male:   { label: 'Male', count: 0 },
            Female: { label: 'Female', count: 0 },
            Others: { label: 'Others', count: 0 },
        };

        const clientSexRatings = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(
                        Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')),
                        req.params.year
                    )
                ]
            },
            attributes: [
                'sex', // assuming column stores 'Male', 'Female', 'Others'
                [Sequelize.fn('COUNT', Sequelize.col('sex')), 'count'],
            ],
            group: ['sex'],
        });

        clientSexRatings.forEach(item => {
            const sex = item.get('sex');
            const count = Number(item.get('count'));

            if (expectedSexes[sex]) {
                expectedSexes[sex].count = count;
            }
        });

        const clientSexDistribution = Object.values(expectedSexes);


        /**
         * 
         * 
         * AGE BRACKET
         * 
         */
        const expectedAgeBrackets = [
            { label: 'Young Dependents', min: 0, max: 14 },
            { label: 'Working-Age Population', min: 15, max: 64 },
            { label: 'Old Population', min: 65, max: Infinity }
        ];

        const ageBracketCounts = expectedAgeBrackets.reduce((acc, bracket) => {
            acc[bracket.label] = { label: bracket.label, count: 0 };
            return acc;
        }, {});

        const ages = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: ['age']
        });

        ages.forEach(item => {
            const age = item.get('age');
            const bracket = expectedAgeBrackets.find(b => age >= b.min && age <= b.max);

            if (bracket) {
                ageBracketCounts[bracket.label].count++;
            }
        });

        const clientAgeDistribution = Object.values(ageBracketCounts);

        /**
         * 
         * 
         * ENTRY
         * 
         */
        const expectedEntry = {
            kiosk: { label: 'Kiosk', count: 0 },
            manual: { label: 'Manual', count: 0 }
        };

        const entry = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                'entryFrom',
                [Sequelize.fn('COUNT', Sequelize.col('entryFrom')), 'count'],
            ],
            group: ['entryFrom'],
        });

        entry.forEach((item) => {
            const entry = item.get('entryFrom');
            const count = item.get('count');
            if (expectedEntry[entry]) {
                expectedEntry[entry].count = count;
            }
        });

        const clientEntryFrom = Object.values(expectedEntry);

        /**
         * 
         * CC1
         * 
         */
        const expectedCC1 = {
            1: { label: 'I know what a CC is and I saw this office`s CC', count: 0 },
            2: { label: 'I know what a CC is but I did not see this office`s CC', count: 0 },
            3: { label: 'I learned of the CC only when I saw this office`s CC', count: 0 },
            4: { label: 'I do not know what a CC is and I did not see one in this office', count: 0 }
        };

        const cc1s = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                'cc1',
                [Sequelize.fn('COUNT', Sequelize.col('cc1')), 'count'],
            ],
            group: ['cc1'],
        });

        cc1s.forEach((item) => {
            const cc1 = item.get('cc1');
            const count = item.get('count');
            if (expectedCC1[cc1]) {
                expectedCC1[cc1].count = count;
            }
        });

        const cc1 = Object.values(expectedCC1);

        /**
         * 
         * CC2
         * 
         */
        const expectedCC2 = {
            1: { label: 'Easy to see', count: 0 },
            2: { label: 'Somewhat easy to see', count: 0 },
            3: { label: 'Difficult to see', count: 0 },
            4: { label: 'Not visible at all', count: 0 },
            5: { label: 'N/A', count: 0 }
        };

        const cc2s = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                'cc2',
                [Sequelize.fn('COUNT', Sequelize.col('cc2')), 'count'],
            ],
            group: ['cc2'],
        });

        cc2s.forEach((item) => {
            const cc2 = item.get('cc2');
            const count = item.get('count');
            if (expectedCC2[cc2]) {
                expectedCC2[cc2].count = count;
            }
        });

        const cc2 = Object.values(expectedCC2);

        /**
         * 
         * CC3
         * 
         */
        const expectedCC3 = {
            1: { label: 'Helped very much', count: 0 },
            2: { label: 'Somewhat helped', count: 0 },
            3: { label: 'Did not helped', count: 0 },
            4: { label: 'N/A', count: 0 }
        };

        const cc3s = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                'cc3',
                [Sequelize.fn('COUNT', Sequelize.col('cc3')), 'count'],
            ],
            group: ['cc3'],
        });

        cc3s.forEach((item) => {
            const cc3 = item.get('cc3');
            const count = item.get('count');
            if (expectedCC3[cc3]) {
                expectedCC3[cc3].count = count;
            }
        });

        const cc3 = Object.values(expectedCC3);

        /**
         * 
         * SQD
         * 
         */
        const sqd = await KioskRating.findAll({
            where: {
                isActive: true,
                officeId: req.params.id,
                // Filter ratings for the specific year
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                // Calculate average for sqd0 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd0, 0)))`),
                    'avgSqd0'
                ],
                // Calculate average for sqd1 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd1, 0)))`),
                    'avgSqd1'
                ],
                // Calculate average for sqd2 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd2, 0)))`),
                    'avgSqd2'
                ],
                // Calculate average for sqd3 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd3, 0)))`),
                    'avgSqd3'
                ],
                // Calculate average for sqd4 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd4, 0)))`),
                    'avgSqd4'
                ],
                // Calculate average for sqd5 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd5, 0)))`),
                    'avgSqd5'
                ],
                // Calculate average for sqd6 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd6, 0)))`),
                    'avgSqd6'
                ],
                // Calculate average for sqd7 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd7, 0)))`),
                    'avgSqd7'
                ],
                // Calculate average for sqd8 and round to a whole number
                [
                    Sequelize.literal(`ROUND(AVG(COALESCE(sqd8, 0)))`),
                    'avgSqd8'
                ]
            ],
        });

        /**
         * 
         * TOTAL RATING
         * 
         */
        const finalRate = await KioskRating.findAll({
            where: {
                isActive: true,
                // Filter by the specific office ID
                officeId: req.params.id,
                // Filter by the specific year of the rating
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM date')), req.params.year)
                ]
            },
            attributes: [
                [
                    Sequelize.literal(`
                        (AVG(
                            COALESCE(sqd0, 0) + COALESCE(sqd1, 0) + COALESCE(sqd2, 0) +
                            COALESCE(sqd3, 0) + COALESCE(sqd4, 0) + COALESCE(sqd5, 0) +
                            COALESCE(sqd6, 0) + COALESCE(sqd7, 0) + COALESCE(sqd8, 0)
                        ) / 9.0) / ${MAX_SQD_VALUE} * 100
                    `),
                    'averageSqdPercentage' // This is the alias for the calculated overall percentage
                ]
            ],
            // We remove 'group' and 'order' clauses because we are looking for a single,
            // aggregated average across all matching records, not individual records
            // or grouped results.
        });

        // The 'result' array will contain a single object if there are matching ratings.
        // If no ratings match the criteria, it will be an empty array.
        // We extract the percentage value, defaulting to 0 if no data is found.
        const averagePercentage = finalRate[0] ? finalRate[0].get('averageSqdPercentage') : 0;


        res.json({
            ratings: {
                data: rows,
                meta: {
                    TotalItems: count,
                    TotalPages: Math.ceil(count / limit),
                    CurrentPage: page
                }
            },
            frequencies: result,
            satisfactionTrend,
            ratingDistribution,
            types: clientType,
            sexes: clientSexDistribution,
            ages: clientAgeDistribution,
            entry: clientEntryFrom,
            cc1,
            cc2,
            cc3,
            sqd,
            averagePercentage
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.generatePDFRating = async (req, res) => {
    let browser;
    try {
        const ratings = await KioskRating.findAll({
            where: {
                isActive: true,
                id: req.params.id
            },
            attributes: {
                include: [
                    [
                        Sequelize.literal(`
                            (SELECT
                                (AVG(
                                    COALESCE(sqd0, 0) + COALESCE(sqd1, 0) + COALESCE(sqd2, 0) +
                                    COALESCE(sqd3, 0) + COALESCE(sqd4, 0) + COALESCE(sqd5, 0) +
                                    COALESCE(sqd6, 0) + COALESCE(sqd7, 0) + COALESCE(sqd8, 0)
                                ) / 9.0) / ${MAX_SQD_VALUE} * 100
                            FROM kioskratings AS kr
                            WHERE kr.id = KioskRating.id)
                        `),
                        'averageSqdPercentage'
                    ]
                ]
            },
            order: [
                ['createdAt', 'DESC'] // 'DESC' for latest first (descending order)
            ]
        });

        const templatePath = path.join(__dirname, '../templates/reports/Rating.pug');

        const seal = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../templates/reports/seal.png')).toString('base64');

        const type = ratings[0].type;
        const date = moment(ratings[0].date).format('MMM DD, YYYY hh:mm A'); 
        const sex = ratings[0].sex;
        const age = ratings[0].age;
        const residence = ratings[0].residence;
        const serviceAvailed = ratings[0].serviceAvailed;
        const cc1 = ratings[0].cc1;
        const cc2 = ratings[0].cc2;
        const cc3 = ratings[0].cc3;
        const sqd0 = ratings[0].sqd0;
        const sqd1 = ratings[0].sqd1;
        const sqd2 = ratings[0].sqd2;
        const sqd3 = ratings[0].sqd3;
        const sqd4 = ratings[0].sqd4;
        const sqd5 = ratings[0].sqd5;
        const sqd6 = ratings[0].sqd6;
        const sqd7 = ratings[0].sqd7;
        const sqd8 = ratings[0].sqd8;
        const suggestion = ratings[0].suggestion;
        const email = ratings[0].email;

        const html = pug.renderFile(templatePath, { 
            seal, 
            type, 
            date, 
            sex, 
            age, 
            residence, 
            serviceAvailed, 
            cc1, 
            cc2, 
            cc3, 
            sqd0, 
            sqd1, 
            sqd2, 
            sqd3, 
            sqd4, 
            sqd5, 
            sqd6, 
            sqd7, 
            sqd8, 
            suggestion,
            email
        });
        
        const browser = await puppeteer.launch({
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
``
        const width = '6.5in'
        const height = '8.5in'
    
        const pdfBuffer = await page.pdf({
            width: width, 
            height: height, 
            landscape: false, 
            margin: {
                top: '25px',
                bottom: '25px',
                left: '25px',
                right: '25px'
            }, 
            preferCSSPageSize: true,
            printBackground: true
        });
        
        const buffer = Buffer.from(pdfBuffer);
        console.log(buffer)
        res.send(buffer)

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// exports.generatePDFRating = async (req, res) => {
//     let browser;
//     try {
//         const ratings = await KioskRating.findAll({
//             where: {
//                 isActive: true,
//                 id: req.params.id
//             },
//             attributes: {
//                 include: [
//                     [
//                         Sequelize.literal(`
//                             (SELECT
//                                 (AVG(
//                                     COALESCE(sqd0, 0) + COALESCE(sqd1, 0) + COALESCE(sqd2, 0) +
//                                     COALESCE(sqd3, 0) + COALESCE(sqd4, 0) + COALESCE(sqd5, 0) +
//                                     COALESCE(sqd6, 0) + COALESCE(sqd7, 0) + COALESCE(sqd8, 0)
//                                 ) / 9.0) / ${MAX_SQD_VALUE} * 100
//                             FROM kioskratings AS kr
//                             WHERE kr.id = KioskRating.id)
//                         `),
//                         'averageSqdPercentage'
//                     ]
//                 ]
//             },
//             order: [['createdAt', 'DESC']]
//         });

//         const templatePath = path.join(__dirname, '../templates/reports/Rating.pug');

//         const seal = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../templates/reports/seal.png')).toString('base64');

//         const html = pug.renderFile(templatePath, { 
//             seal,
//             type: ratings[0].type,
//             date: moment(ratings[0].date).format('MMMM DD, YYYY hh:mm A'),
//             sex: ratings[0].sex,
//             age: ratings[0].age,
//             residence: ratings[0].residence,
//             serviceAvailed: ratings[0].serviceAvailed,
//             cc1: ratings[0].cc1,
//             cc2: ratings[0].cc2,
//             cc3: ratings[0].cc3,
//             sqd0: ratings[0].sqd0,
//             sqd1: ratings[0].sqd1,
//             sqd2: ratings[0].sqd2,
//             sqd3: ratings[0].sqd3,
//             sqd4: ratings[0].sqd4,
//             sqd5: ratings[0].sqd5,
//             sqd6: ratings[0].sqd6,
//             sqd7: ratings[0].sqd7,
//             sqd8: ratings[0].sqd8,
//             suggestion: ratings[0].suggestion,
//             email: ratings[0].email
//         });
        
//         // ✅ no redeclare
//         const browser = await puppeteer.launch({
//             headless: 'new',
//             executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', // adjust if different
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--disable-gpu',
//                 '--single-process'
//             ]
//         });

    
//         const page = await browser.newPage();
//         await page.setContent(html, { waitUntil: 'networkidle0' });
//         await page.emulateMediaType('print');
    
//         const pdfBuffer = await page.pdf({
//             width: '6.5in', 
//             height: '8.5in', 
//             landscape: false, 
//             margin: {
//                 top: '25px',
//                 bottom: '25px',
//                 left: '25px',
//                 right: '25px'
//             }, 
//             preferCSSPageSize: true,
//             printBackground: true
//         });
        
//         // ✅ Set correct headers so browser knows it’s PDF
//         res.set({
//             'Content-Type': 'application/pdf',
//             'Content-Disposition': 'inline; filename="rating.pdf"',
//             'Content-Length': pdfBuffer.length
//         });
//         res.send(pdfBuffer);

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     } finally {
//         if (browser) {
//             await browser.close();
//         }
//     }
// };
