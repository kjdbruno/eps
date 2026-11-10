const { Op, QueryTypes } = require('sequelize');
const { Message, User, Notification } = require('../models');
const { getUserSocketIds } = require('../utils/connectedUsers');
const { pushNotifications } = require('../utils/notifySocket');

let io;

// Direct one-to-one staff messaging, opened from the internal Dashboard's Team panel. Deliberately
// separate from Notification (a one-way system alert) — this is a real conversation thread.
module.exports = (_io) => {
    io = _io;

    return {
        // One row per person the caller has exchanged messages with, most recent first: the last
        // message, who sent it, and how many of theirs are still unread — what the header's chat
        // menu and the Messages page list. Worked out by the database (the id of the latest
        // message and the unread count per person) rather than by reading the whole history.
        getConversations: async (req, res) => {
            const me = req.userId;

            try {
                const threads = await Message.sequelize.query(
                    `SELECT x.other AS other, MAX(x.id) AS lastId, SUM(x.unread) AS unread
                     FROM (
                         SELECT receiverId AS other, id, 0 AS unread FROM messages WHERE senderId = :me
                         UNION ALL
                         SELECT senderId AS other, id, (isRead = 0) AS unread FROM messages WHERE receiverId = :me
                     ) x
                     GROUP BY x.other`,
                    { replacements: { me }, type: QueryTypes.SELECT }
                );
                if (!threads.length) return res.json({ data: [] });

                const lasts = await Message.findAll({
                    where: { id: threads.map(t => t.lastId) },
                    attributes: ['id', 'senderId', 'receiverId', 'content', 'createdAt'],
                    order: [['createdAt', 'DESC'], ['id', 'DESC']],
                });
                const unreadOf = new Map(threads.map(t => [Number(t.lastId), Number(t.unread)]));

                const data = lasts.map(m => ({
                    userId: m.senderId === me ? m.receiverId : m.senderId,
                    lastMessage: m.content,
                    lastMessageAt: m.createdAt,
                    fromMe: m.senderId === me,
                    unreadCount: unreadOf.get(m.id) || 0,
                }));

                return res.json({ data });
            } catch (error) {
                console.error('Error listing conversations:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },

        // Full history between the caller and :userId, oldest first (chat reading order). Marks
        // every message the OTHER person sent as read, since opening the thread is what "reading"
        // it means here — mirrors NotificationController.markAllRead's same-request-as-read-receipt
        // convention.
        getConversation: async (req, res) => {
            const otherUserId = parseInt(req.params.userId, 10);
            if (!otherUserId) {
                return res.status(400).json({ message: 'A valid user id is required.' });
            }

            try {
                const otherUser = await User.findByPk(otherUserId, { attributes: ['id', 'firstname', 'lastname', 'username', 'role', 'avatar'] });
                if (!otherUser) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                const messages = await Message.findAll({
                    where: {
                        [Op.or]: [
                            { senderId: req.userId, receiverId: otherUserId },
                            { senderId: otherUserId, receiverId: req.userId },
                        ]
                    },
                    order: [['createdAt', 'ASC']],
                    limit: 200
                });

                await Message.update(
                    { isRead: true },
                    { where: { senderId: otherUserId, receiverId: req.userId, isRead: false } }
                );

                return res.json({ data: messages, user: otherUser });
            } catch (error) {
                console.error('Error fetching conversation:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },

        // Persists the message, then pushes it live to the receiver's own connected socket(s) only
        // — same targeted-push convention as utils/notifySocket.js's pushNotifications, never a
        // global io.emit() (which would hand every other online staff member this conversation).
        sendMessage: async (req, res) => {
            const { receiverId, content } = req.body;

            if (!receiverId || !content || !content.trim()) {
                return res.status(400).json({ message: 'receiverId and content are both required.' });
            }
            if (String(receiverId) === String(req.userId)) {
                return res.status(400).json({ message: 'You cannot message yourself.' });
            }

            try {
                const [receiver, sender] = await Promise.all([
                    User.findByPk(receiverId),
                    User.findByPk(req.userId, { attributes: ['firstname', 'lastname', 'username'] }),
                ]);
                if (!receiver) {
                    return res.status(404).json({ message: 'Recipient not found.' });
                }

                const trimmed = content.trim();
                const message = await Message.create({
                    senderId: req.userId,
                    receiverId,
                    content: trimmed,
                });

                getUserSocketIds(receiverId).forEach(socketId => {
                    io.to(socketId).emit('message:new', message);
                });

                // Rides the existing bell/notification tray (NotificationController, the socket
                // 'loadNotifications' push) instead of a second, parallel unread system — a new
                // message is "new activity for you" the exact same way a complaint update or
                // discussion comment already is.
                const senderName = sender ? (`${sender.firstname || ''} ${sender.lastname || ''}`.trim() || sender.username) : 'Someone';
                const preview = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
                await Notification.create({
                    receiverId,
                    content: `New message from ${senderName}: "${preview}"`,
                });
                await pushNotifications(io, receiverId);

                return res.status(201).json({ data: message });
            } catch (error) {
                console.error('Error sending message:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
    };
};
