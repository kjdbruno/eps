const { QueryTypes } = require('sequelize');
const { User, Staff, Office, UserLog } = require('../models');

// Everything the system holds about one STAFF account, for the User preference dialog (the counterpart of the Client accounts
// profile): the account, and what they did in each module (feedback they answered or handled, discussions, surveys, messages,
// and the activity log with their name on it).

const clip = (text, n = 200) => {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const round1 = (n) => Math.round(n * 10) / 10;

const buildUserProfile = async (userId) => {
    const sequelize = User.sequelize;
    const q = (sql) => sequelize.query(sql, { replacements: { userId }, type: QueryTypes.SELECT });

    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }] }],
    });
    if (!user || user.role === 'citizen') return null;
    const log = await UserLog.findOne({ where: { userId }, attributes: ['isOnline'], raw: true });

    const [answered, counts, ratings, discussionsMade, comments, pollsMade, votes, messages, devices, activity] = await Promise.all([
        // the feedback they replied to, newest reply first (one row per feedback)
        q(`SELECT c.id, c.referenceNo, c.content, c.status, MAX(r.createdAt) AS lastReplyAt, COUNT(r.id) AS replies
           FROM responses r JOIN complaints c ON c.id = r.complaintId
           WHERE r.userId = :userId GROUP BY c.id, c.referenceNo, c.content, c.status ORDER BY lastReplyAt DESC LIMIT 40`),
        q(`SELECT
             (SELECT COUNT(*) FROM responses WHERE userId = :userId) AS replies,
             (SELECT COUNT(DISTINCT complaintId) FROM responses WHERE userId = :userId) AS replied,
             (SELECT COUNT(*) FROM complaintoffices WHERE receivedByUserId = :userId) AS received,
             (SELECT COUNT(*) FROM complaintoffices WHERE completedByUserId = :userId) AS completed,
             (SELECT COUNT(*) FROM complaintoffices WHERE reassignedByUserId = :userId) AS rerouted`),
        // how the citizens rated their replies
        q(`SELECT AVG(rr.rate) AS avg, COUNT(*) AS n FROM responseratings rr JOIN responses r ON r.id = rr.responseId WHERE r.userId = :userId`),
        q(`SELECT id, title, status, createdAt FROM discussions WHERE createdBy = :userId ORDER BY createdAt DESC LIMIT 40`),
        q(`SELECT dc.id, dc.content, dc.createdAt, d.id AS discussionId, d.title, d.status
           FROM discussioncomments dc JOIN discussions d ON d.id = dc.discussionId WHERE dc.userId = :userId ORDER BY dc.createdAt DESC LIMIT 40`),
        q(`SELECT id, question, status, createdAt FROM polls WHERE createdBy = :userId ORDER BY createdAt DESC LIMIT 40`),
        q(`SELECT pv.pollId, p.question, p.status, MIN(pv.createdAt) AS votedAt
           FROM pollvotes pv JOIN polls p ON p.id = pv.pollId WHERE pv.userId = :userId GROUP BY pv.pollId, p.question, p.status ORDER BY votedAt DESC LIMIT 40`),
        q(`SELECT SUM(senderId = :userId) AS sent, SUM(receiverId = :userId) AS received, SUM(receiverId = :userId AND isRead = 0) AS unread
           FROM messages WHERE senderId = :userId OR receiverId = :userId`),
        q(`SELECT platform, MAX(updatedAt) AS lastSeen FROM devicetokens WHERE userId = :userId GROUP BY platform`),
        q(`SELECT id, module, action, description, createdAt FROM activitylogs WHERE actorId = :userId ORDER BY createdAt DESC LIMIT 15`),
    ]);

    const json = user.toJSON();
    const c = counts[0] || {};
    const rating = ratings[0] || {};
    const m = messages[0] || {};

    return {
        account: {
            id: json.id,
            firstname: json.firstname,
            lastname: json.lastname,
            username: json.username,
            role: json.role,
            avatar: json.avatar,
            phoneNo: json.phoneNo || null,
            isActive: !!json.isActive,
            isOnline: !!log?.isOnline,
            mustChangePassword: !!json.mustChangePassword,
            lastLoginAt: json.lastLoginAt || null,
            createdAt: json.createdAt,
            officeId: json.staff?.officeId || null,
            office: json.staff?.office?.alias || json.staff?.office?.name || null,
            devices,
        },
        feedback: answered.map(f => ({
            id: f.id, referenceNo: f.referenceNo, content: clip(f.content), status: f.status,
            lastReplyAt: f.lastReplyAt, replies: Number(f.replies),
        })),
        discussions: {
            made: discussionsMade,
            comments: comments.map(x => ({ ...x, content: clip(x.content) })),
        },
        surveys: {
            made: pollsMade.map(p => ({ ...p, question: clip(p.question, 160) })),
            answered: votes.map(p => ({ ...p, question: clip(p.question, 160) })),
        },
        activity,
        summary: {
            feedback: {
                replies: Number(c.replies || 0),
                replied: Number(c.replied || 0),
                received: Number(c.received || 0),
                completed: Number(c.completed || 0),
                rerouted: Number(c.rerouted || 0),
                ratingAvg: rating.n ? round1(Number(rating.avg)) : null,
                ratingCount: Number(rating.n || 0),
            },
            discussions: { made: discussionsMade.length, comments: comments.length },
            surveys: { made: pollsMade.length, answered: votes.length },
            messages: { sent: Number(m.sent || 0), received: Number(m.received || 0), unread: Number(m.unread || 0) },
        },
    };
};

module.exports = { buildUserProfile };
