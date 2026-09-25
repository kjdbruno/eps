const { Op } = require('sequelize');
const { Message, User, Notification } = require('../models');
const { getUserSocketIds } = require('../utils/connectedUsers');
const { pushNotifications } = require('../utils/notifySocket');

let io;

// Direct one-to-one staff messaging, opened from the internal Dashboard's Team panel. Deliberately
// separate from Notification (a one-way system alert) — this is a real conversation thread.
module.exports = (_io) => {
    io = _io;

    return {
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
