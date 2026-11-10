const { QueryTypes } = require('sequelize');
const { Office } = require('../models');

// Everything the system holds about one OFFICE, for the Office preference dialog: who works in it, the feedback routed to it,
// its CSM reports and the discussions and surveys sent to it.

const clip = (text, n = 200) => {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const round1 = (n) => Math.round(n * 10) / 10;
const SQD = 'COALESCE(sqd0,0)+COALESCE(sqd1,0)+COALESCE(sqd2,0)+COALESCE(sqd3,0)+COALESCE(sqd4,0)+COALESCE(sqd5,0)+COALESCE(sqd6,0)+COALESCE(sqd7,0)+COALESCE(sqd8,0)';

const buildOfficeProfile = async (officeId) => {
    const office = await Office.findByPk(officeId, { raw: true });
    if (!office) return null;
    const q = (sql) => Office.sequelize.query(sql, { replacements: { officeId }, type: QueryTypes.SELECT });

    const [staff, counts, feedback, csm, csmRecent, discussions, polls] = await Promise.all([
        q(`SELECT u.id, u.firstname, u.lastname, u.username, u.role, u.avatar, u.isActive, u.lastLoginAt, COALESCE(l.isOnline, 0) AS isOnline
           FROM staffs s JOIN users u ON u.id = s.userId LEFT JOIN userlogs l ON l.userId = u.id
           WHERE s.officeId = :officeId ORDER BY u.isActive DESC, u.firstname`),
        q(`SELECT COUNT(*) AS total, SUM(co.isActive = 1) AS active,
                  SUM(co.isActive = 1 AND co.status = 'completed') AS completed,
                  SUM(co.isActive = 1 AND co.status IN ('received','ongoing')) AS ongoing,
                  SUM(co.isActive = 1 AND (co.isReceived = 0 OR co.isReceived IS NULL) AND co.status = 'pending') AS toReceive
           FROM complaintoffices co WHERE co.officeId = :officeId`),
        q(`SELECT c.id, c.referenceNo, c.content, c.status, c.sentiment, c.createdAt, co.status AS officeStatus, co.isActive
           FROM complaintoffices co JOIN complaints c ON c.id = co.complaintId
           WHERE co.officeId = :officeId ORDER BY c.createdAt DESC LIMIT 40`),
        q(`SELECT COUNT(*) AS total, AVG((${SQD}) / 9 / 5 * 100) AS avgScore,
                  SUM(sentiment = 'positive') AS positive, SUM(sentiment = 'neutral') AS neutral, SUM(sentiment = 'negative') AS negative
           FROM kioskratings WHERE officeId = :officeId AND isActive = 1`),
        q(`SELECT id, date, entryFrom, serviceAvailed, suggestion, sentiment, ROUND((${SQD}) / 9 / 5 * 100, 1) AS score
           FROM kioskratings WHERE officeId = :officeId AND isActive = 1 ORDER BY date DESC LIMIT 20`),
        q(`SELECT d.id, d.title, d.status, d.createdAt FROM discussionoffices x JOIN discussions d ON d.id = x.discussionId
           WHERE x.officeId = :officeId AND x.isActive = 1 ORDER BY d.createdAt DESC LIMIT 30`),
        q(`SELECT p.id, p.question, p.status, p.createdAt FROM polloffices x JOIN polls p ON p.id = x.pollId
           WHERE x.officeId = :officeId AND x.isActive = 1 ORDER BY p.createdAt DESC LIMIT 30`),
    ]);

    const c = counts[0] || {};
    const k = csm[0] || {};
    return {
        office,
        staff: staff.map(s => ({ ...s, isActive: !!s.isActive, isOnline: !!s.isOnline })),
        feedback: feedback.map(f => ({ ...f, content: clip(f.content), isActive: !!f.isActive })),
        csm: csmRecent.map(r => ({ ...r, serviceAvailed: clip(r.serviceAvailed, 140), suggestion: clip(r.suggestion) })),
        discussions,
        surveys: polls.map(p => ({ ...p, question: clip(p.question, 160) })),
        summary: {
            staff: { total: staff.length, active: staff.filter(s => s.isActive).length, online: staff.filter(s => s.isOnline).length },
            feedback: {
                total: Number(c.total || 0), active: Number(c.active || 0), completed: Number(c.completed || 0),
                ongoing: Number(c.ongoing || 0), toReceive: Number(c.toReceive || 0),
            },
            csm: {
                total: Number(k.total || 0),
                avgScore: k.total ? round1(Number(k.avgScore)) : null,
                positive: Number(k.positive || 0), neutral: Number(k.neutral || 0), negative: Number(k.negative || 0),
            },
            discussions: discussions.length,
            surveys: polls.length,
        },
    };
};

module.exports = { buildOfficeProfile };
