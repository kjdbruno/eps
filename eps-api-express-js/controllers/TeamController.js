const { Op, fn, col } = require('sequelize');
const { User, Staff, Office, UserLog, Message } = require('../models');
const { getUserSocketIds } = require('../utils/connectedUsers');

let io;

// Powers the internal Dashboard's "Team" panel — every staff account (never citizens) plus
// whether each one is currently online, and the force-logout action a super account can take
// from there. See sockets/index.js's 'authenticate' handler for where UserLog.isOnline/socketId
// actually get set now (they used to never be written on connect, only cleared on disconnect —
// this whole feature depended on a bug fix there first).
module.exports = (_io) => {
    io = _io;

    return {
        // Any authenticated staff role (workstation/admin/super/monitoring) — this is a read-only
        // roster, not the Preference > User management page (which stays super-only for actual
        // CRUD, see UserRoutes.js).
        getDirectory: async (req, res) => {
            try {
                const users = await User.findAll({
                    where: { role: { [Op.ne]: 'citizen' }, id: { [Op.ne]: req.userId } },
                    attributes: ['id', 'firstname', 'lastname', 'username', 'role', 'avatar', 'isActive', 'phoneNo', 'lastLoginAt', 'createdAt'],
                    include: [
                        { model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }] },
                    ],
                    order: [['firstname', 'ASC'], ['lastname', 'ASC']]
                });

                // Online status via a separate keyed lookup rather than an include/join on UserLog
                // — a join fans a parent row out once per matching child row, so if UserLog's
                // userId ever had more than one row for the same user (it did — see the
                // add-unique-constraint-userlogs-userid migration — the column was declared unique
                // on the model but the table itself never actually enforced it, and a connect race
                // produced two rows for one account), the SAME person would be listed twice, with
                // whichever row's isOnline the join happened to pick per duplicate. This shape
                // can't fan out no matter how many UserLog rows exist for a user — worst case it
                // just reads the wrong single one, never duplicates the roster.
                const logRows = await UserLog.findAll({ attributes: ['userId', 'isOnline'], raw: true });
                const onlineByUser = Object.fromEntries(logRows.map(r => [r.userId, !!r.isOnline]));

                // One grouped query for every unread count at once, rather than one query per row —
                // "unread FROM this person, addressed TO me" is what the Team list's per-row badge
                // means; getConversation clears a person's count to 0 the moment their thread is
                // actually opened.
                const unreadRows = await Message.findAll({
                    attributes: ['senderId', [fn('COUNT', col('id')), 'count']],
                    where: { receiverId: req.userId, isRead: false },
                    group: ['senderId'],
                    raw: true
                });
                const unreadBySender = Object.fromEntries(unreadRows.map(r => [r.senderId, parseInt(r.count, 10)]));

                const data = users.map(u => {
                    const json = u.toJSON();
                    return {
                        id: json.id,
                        firstname: json.firstname,
                        lastname: json.lastname,
                        username: json.username,
                        role: json.role,
                        avatar: json.avatar,
                        isActive: json.isActive,
                        phoneNo: json.phoneNo || null,
                        lastLoginAt: json.lastLoginAt || null,
                        createdAt: json.createdAt,
                        office: json.staff?.office?.alias || json.staff?.office?.name || null,
                        isOnline: !!onlineByUser[json.id],
                        unreadCount: unreadBySender[json.id] || 0,
                    };
                });

                return res.json({ data });
            } catch (error) {
                console.error('Error fetching team directory:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },

        // Super-only (see TeamRoutes.js). Sets forceLogoutAt (verifyToken then rejects any token
        // issued before this moment, on every subsequent request, everywhere it's used — see
        // AuthMiddleware.js) AND emits the existing 'force_logout' socket event to whatever
        // socket(s) that account has open right now, for an immediate kick rather than waiting for
        // their next API call.
        forceLogout: async (req, res) => {
            const { id } = req.params;

            if (String(id) === String(req.userId)) {
                return res.status(400).json({ message: 'You cannot force-logout your own account.' });
            }

            try {
                const user = await User.findByPk(id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                await user.update({ forceLogoutAt: new Date() });

                getUserSocketIds(user.id).forEach(socketId => {
                    io.to(socketId).emit('force_logout', { reason: 'admin_action' });
                });

                return res.json({ message: `${user.firstname || user.username} has been logged out.` });
            } catch (error) {
                console.error('Error forcing logout:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
    };
};
