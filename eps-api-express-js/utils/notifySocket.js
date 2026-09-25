const { Notification } = require('../models');
const { getUserSocketIds } = require('./connectedUsers');
const { sendPushToUser } = require('./push');

// Recomputes one user's unread notification count/list and pushes it ONLY to that user's own
// connected socket(s) — never a global io.emit(), which would hand every staff member currently
// online everyone else's notifications (a real bug this replaces, previously duplicated across
// sockets/index.js, ComplaintController, and DiscussionController). A user with no live socket
// right now (not connected, or on a different session) is a silent no-op here for the socket
// half — they'll get the current state on their next connect/register (see sockets/index.js).
//
// Also fires an FCM push (utils/push.js) using the just-created notification's own content —
// every call site here already calls this immediately after Notification.create, so `notifications[0]`
// (freshest first) IS that row, with no extra parameter needed at any of the ~30 call sites across
// the controllers. Reaches the mobile app even when it isn't open/connected, unlike the socket
// emit above; a silent no-op when push isn't configured or this user has no registered device.
const pushNotifications = async (io, userId) => {
    const notificationCount = await Notification.count({ where: { receiverId: userId, isRead: false } });
    const notifications = await Notification.findAll({
        where: { isRead: false, receiverId: userId },
        order: [['createdAt', 'DESC']]
    });
    getUserSocketIds(userId).forEach(socketId => {
        io.to(socketId).emit('loadNotifications', notificationCount, notifications);
    });

    const latest = notifications[0];
    if (latest) {
        await sendPushToUser(userId, {
            body: latest.content,
            data: { notificationId: String(latest.id) },
        });
    }
};

// Broadcasts to every connected client that the complaint list has materially changed (new
// filing, OTP verification, office reassignment, status change, an office receiving/responding/
// completing) so the internal desk's ComplaintPage can re-fetch instead of rendering stale rows.
// Payload is just a hint; it's a global emit and the citizen mobile app has no listener for it.
// Best-effort — never throws, the DB write it follows is already committed.
const broadcastComplaintsChanged = (io, reason) => {
    try {
        io.emit('complaints:changed', { reason });
    } catch (error) {
        console.error('Failed to broadcast complaints:changed:', error);
    }
};

module.exports = { pushNotifications, broadcastComplaintsChanged };
