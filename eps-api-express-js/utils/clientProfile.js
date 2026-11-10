const { QueryTypes } = require('sequelize');
const { User, Citizen, ClientInvite } = require('../models');

// Everything the system holds about one client, for the Client accounts page (Preference): the account, and what they did in
// each module (feedback, discussions, surveys, CSM reports).

const SQD_KEYS = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
const MAX_SQD = 5;

const round1 = (n) => Math.round(n * 10) / 10;

const clip = (text, n = 220) => {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

const buildClientProfile = async (userId) => {
    const sequelize = User.sequelize;
    const q = (sql) => sequelize.query(sql, { replacements: { userId }, type: QueryTypes.SELECT });

    const user = await User.findByPk(userId, {
        attributes: ['id', 'firstname', 'lastname', 'role', 'isActive', 'lastLoginAt', 'mustChangePassword', 'createdAt'],
    });
    if (!user || user.role !== 'citizen') return null;
    const citizen = await Citizen.findOne({ where: { userId }, attributes: ['email', 'phoneNo', 'isVerified', 'origin', 'verifiedAt'] });
    const email = citizen?.email || '';

    const [feedbackRows, offices, responseCounts, ratings, comments, polls, csmRows, devices, invites, notifications] = await Promise.all([
        q(`SELECT c.id, c.referenceNo, c.content, c.status, c.via, c.isAnonymous, c.createdAt, c.completedAt, c.resolutionDeadline
           FROM complaintdetails d JOIN complaints c ON c.id = d.complaintId
           WHERE d.userId = :userId ORDER BY c.createdAt DESC`),
        q(`SELECT co.complaintId, o.alias, co.isActive FROM complaintoffices co JOIN offices o ON o.id = co.officeId
           WHERE co.complaintId IN (SELECT complaintId FROM complaintdetails WHERE userId = :userId) ORDER BY co.id`),
        q(`SELECT r.complaintId, SUM(r.userId = :userId) AS own, SUM(r.userId <> :userId) AS fromOffices
           FROM responses r WHERE r.complaintId IN (SELECT complaintId FROM complaintdetails WHERE userId = :userId) GROUP BY r.complaintId`),
        q(`SELECT r.complaintId, AVG(rr.rate) AS avg, COUNT(*) AS n FROM responseratings rr JOIN responses r ON r.id = rr.responseId
           WHERE rr.userId = :userId GROUP BY r.complaintId`),
        q(`SELECT dc.id, dc.content, dc.createdAt, dc.discussionId, d.title, d.status
           FROM discussioncomments dc JOIN discussions d ON d.id = dc.discussionId WHERE dc.userId = :userId ORDER BY dc.createdAt DESC`),
        q(`SELECT pv.pollId, p.question, p.status, MIN(pv.createdAt) AS votedAt, COUNT(*) AS votes
           FROM pollvotes pv JOIN polls p ON p.id = pv.pollId WHERE pv.userId = :userId GROUP BY pv.pollId, p.question, p.status ORDER BY votedAt DESC`),
        email
            ? sequelize.query(
                `SELECT k.id, k.date, k.createdAt, k.entryFrom, k.serviceAvailed, k.suggestion, k.isActive, o.alias AS office, ${SQD_KEYS.map(k => `k.${k}`).join(', ')}
                 FROM kioskratings k LEFT JOIN offices o ON o.id = k.officeId WHERE LOWER(k.email) = LOWER(:email) ORDER BY k.date DESC`,
                { replacements: { email }, type: QueryTypes.SELECT })
            : [],
        q(`SELECT platform, MAX(updatedAt) AS lastSeen FROM devicetokens WHERE userId = :userId GROUP BY platform`),
        ClientInvite.findAll({ where: { userId }, order: [['id', 'DESC']], limit: 20, raw: true }),
        q(`SELECT COUNT(*) AS n, SUM(isRead = 0) AS unread FROM notifications WHERE receiverId = :userId`),
    ]);

    const officesOf = new Map();
    for (const o of offices) {
        if (!officesOf.has(o.complaintId)) officesOf.set(o.complaintId, []);
        officesOf.get(o.complaintId).push({ alias: o.alias, active: !!o.isActive });
    }
    const countsOf = new Map(responseCounts.map(r => [r.complaintId, r]));
    const ratingOf = new Map(ratings.map(r => [r.complaintId, r]));

    const feedback = feedbackRows.map((f) => {
        const rating = ratingOf.get(f.id);
        const counts = countsOf.get(f.id);
        const avg = rating ? round1(Number(rating.avg)) : null;
        return {
            id: f.id,
            referenceNo: f.referenceNo,
            content: clip(f.content),
            status: f.status,
            via: f.via,
            isAnonymous: !!f.isAnonymous,
            createdAt: f.createdAt,
            completedAt: f.completedAt,
            resolutionDeadline: f.resolutionDeadline,
            offices: officesOf.get(f.id) || [],
            fromOffices: counts ? Number(counts.fromOffices) : 0,
            followUps: counts ? Number(counts.own) : 0,
            ratingAvg: avg,
            ratingCount: rating ? Number(rating.n) : 0,
        };
    });

    const csm = csmRows.map((k) => {
        const sum = SQD_KEYS.reduce((s, key) => s + (Number(k[key]) || 0), 0);
        const satisfaction = round1((sum / SQD_KEYS.length) / MAX_SQD * 100);
        return {
            id: k.id,
            office: k.office || 'Unknown office',
            date: k.date || k.createdAt,
            entryFrom: k.entryFrom,
            serviceAvailed: clip(k.serviceAvailed, 160),
            suggestion: clip(k.suggestion),
            satisfaction,
        };
    });

    const rated = feedback.filter(f => f.ratingCount);

    return {
        account: {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email,
            phoneNo: citizen?.phoneNo || null,
            isVerified: !!citizen?.isVerified,
            isActive: !!user.isActive,
            origin: citizen?.origin || null,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            mustChangePassword: !!user.mustChangePassword,
            devices,
            notifications: Number(notifications[0]?.n || 0),
            unreadNotifications: Number(notifications[0]?.unread || 0),
        },
        invites,
        feedback,
        discussions: comments,
        surveys: polls.map(p => ({ ...p, votes: Number(p.votes) })),
        csm,
        summary: {
            feedback: {
                total: feedback.length,
                open: feedback.filter(f => !['completed', 'cancelled'].includes(f.status)).length,
                completed: feedback.filter(f => f.status === 'completed').length,
                cancelled: feedback.filter(f => f.status === 'cancelled').length,
                rated: rated.length,
                ratingAvg: rated.length ? round1(rated.reduce((s, f) => s + f.ratingAvg, 0) / rated.length) : null,
            },
            discussions: comments.length,
            discussionsJoined: new Set(comments.map(c => c.discussionId)).size,
            surveys: polls.length,
            csm: {
                total: csm.length,
                satisfactionAvg: csm.length ? round1(csm.reduce((s, k) => s + k.satisfaction, 0) / csm.length) : null,
            },
        },
    };
};

module.exports = { buildClientProfile };
