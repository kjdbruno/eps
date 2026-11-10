const { Notification } = require('../models');

// Recent notifications for the signed-in user — read AND unread, newest first. The socket
// (utils/notifySocket) only ever pushes the UNREAD set for the live badge + toast, so once a
// notification is marked read it vanishes from that push; this endpoint is what a notifications
// tray/history reads instead, so seen items stay visible.
exports.list = async (req, res) => {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

    try {
        const notifications = await Notification.findAll({
            where: { receiverId: userId },
            order: [['createdAt', 'DESC']],
            limit
        });
        const unreadCount = await Notification.count({
            where: { receiverId: userId, isRead: false }
        });
        return res.json({ data: notifications, unreadCount });
    } catch (error) {
        console.error('Error listing notifications:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Mark every unread notification for this user as read (mirrors the socket 'readNotification'
// handler, but over HTTP so a client without a live socket can still clear its badge).
exports.markAllRead = async (req, res) => {
    const userId = req.userId;
    try {
        await Notification.update(
            { isRead: true },
            { where: { receiverId: userId, isRead: false } }
        );
        return res.json({ message: 'Notifications marked read.' });
    } catch (error) {
        console.error('Error marking notifications read:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Mark ONE notification read — what opening a single row in the bell menu does, so the rest stay
// unread. Scoped to the caller: nobody can mark someone else's.
exports.markRead = async (req, res) => {
    const userId = req.userId;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'A valid notification id is required.' });

    try {
        await Notification.update(
            { isRead: true },
            { where: { id, receiverId: userId, isRead: false } }
        );
        const unreadCount = await Notification.count({ where: { receiverId: userId, isRead: false } });
        return res.json({ message: 'Notification marked read.', unreadCount });
    } catch (error) {
        console.error('Error marking a notification read:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};
