const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken'); // Need jwt for socket auth
const { User, Staff, UserLog, Office, Notification } = require("../models");
const { addUserSocket, removeSocket, getUserSocketIds } = require('../utils/connectedUsers');

const onlineUsers = {};

// Store mapping from socket.id to its expiration timer
const socketExpirationTimers = new Map();

// jwt.verify only proves the token's SIGNATURE and EXPIRY are still valid — it says nothing about
// whether the account has since been disabled or force-logged-out (a super admin disabling the
// account, or a self-service logout — see AuthController.logout/UserController.disableUser). Those
// are revoked application-side (User.isActive/forceLogoutAt), which is exactly what
// AuthMiddleware.verifyToken already re-checks on every HTTP request — but 'authenticate'/
// 'register' below never did, so a device that was already kicked could still reconnect its
// socket later (browser reopened, network restored, laptop woken up) using its old, cryptographically-
// still-valid-looking token, get marked online again, and keep receiving live pushes — a "past
// session" slipping back in rather than staying logged out. Shared here so both handlers enforce
// the exact same rule verifyToken does.
const isAccountStillValid = async (decoded) => {
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'isActive', 'forceLogoutAt'] });
    if (!user || !user.isActive) return false;
    if (user.forceLogoutAt && decoded.iat * 1000 < new Date(user.forceLogoutAt).getTime()) return false;
    return true;
};

module.exports = function (io) {

    io.on('connection', (socket) => {

        console.log(`Socket ${socket} connected`);

        // Function to clear existing timer for a socket
        const clearSocketTimer = (socketId) => {
            if (socketExpirationTimers.has(socketId)) {
                clearTimeout(socketExpirationTimers.get(socketId));
                socketExpirationTimers.delete(socketId);
                console.log(`Cleared expiration timer for socket ${socketId}`);
            }
        };

        // Event to authenticate the socket connection with a JWT
        socket.on('authenticate', (data) => {
            clearSocketTimer(socket.id); // Clear any previous timer if re-authenticating

            const token = data.token;
            if (!token) {
                socket.emit('auth_error', { message: 'No token provided' });
                socket.emit('force_logout', { reason: 'no_token_provided' }); // Force logout if no token
                return;
            }

            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    console.error('Socket authentication failed for', socket.id, ':', err.message);
                    socket.emit('auth_error', { message: 'Invalid or expired token', error: err.name });
                    socket.emit('force_logout', { reason: 'invalid_token' }); // Force logout if invalid/expired
                    return;
                }

                if (!(await isAccountStillValid(decoded))) {
                    console.log(`Socket ${socket.id} presented a revoked session for user ${decoded.id} — rejecting.`);
                    socket.emit('auth_error', { message: 'Session no longer valid' });
                    socket.emit('force_logout', { reason: 'session_revoked' });
                    return;
                }

                const userId = decoded.id;
                socket.userId = userId; // Attach userId to the socket

                // Add socket to connected users
                addUserSocket(userId, socket.id);
                console.log(`Socket ${socket.id} authenticated as user ${userId}. Total sockets for user ${userId}: ${getUserSocketIds(userId).length}`);

                // UserLog.isOnline/socketId used to only ever get CLEARED (see 'disconnect' below)
                // — nothing ever set them true on a successful connect, so emitLoggedUsers()'s
                // `WHERE isOnline = true` query always came back empty and 'loadLogs' never
                // actually reflected who was online. findOrCreate covers a user's very first
                // connection too, when no UserLog row exists for them yet.
                //
                // userId now has a real unique DB constraint (see the
                // add-unique-constraint-userlogs-userid migration — the column was only ever a
                // plain index before, so two near-simultaneous connects from the same user, e.g.
                // two browser tabs opening within the same tick, could each pass findOrCreate's
                // own SELECT before either INSERT landed and both create their own row; that's
                // exactly how one account ended up listed twice on the Team panel). With the
                // constraint in place a genuine race now surfaces as a
                // SequelizeUniqueConstraintError instead of a silent duplicate — caught here by
                // re-fetching the row the other connect just created and updating that one instead.
                try {
                    const [log] = await UserLog.findOrCreate({
                        where: { userId },
                        defaults: { isOnline: true, socketId: socket.id }
                    });
                    await log.update({ isOnline: true, socketId: socket.id });
                } catch (logError) {
                    if (logError.name === 'SequelizeUniqueConstraintError') {
                        try {
                            await UserLog.update({ isOnline: true, socketId: socket.id }, { where: { userId } });
                        } catch (retryError) {
                            console.error(`Failed to mark user ${userId} online (retry after race):`, retryError);
                        }
                    } else {
                        console.error(`Failed to mark user ${userId} online:`, logError);
                    }
                }

                socket.emit('authenticated', { userId: userId });

                //emit loggedUsers
                emitLoggedUsers();

                //fetch notification
                emitNotifications(userId);

                // Set a timer for token expiration
                const expiresInSeconds = decoded.exp - (Date.now() / 1000); // Calculate remaining time in seconds
                if (expiresInSeconds > 0) {
                    const timer = setTimeout(() => {
                        console.log(`Socket ${socket.id} (user ${userId}) token expired. Forcing logout.`);
                        socket.emit('force_logout', { reason: 'token_expired' });
                        // Optionally, you might want to disconnect the socket from the server side too:
                        // socket.disconnect(true);
                    }, expiresInSeconds * 1000); // Convert to milliseconds
                    socketExpirationTimers.set(socket.id, timer);
                    console.log(`Set expiration timer for socket ${socket.id} to ${expiresInSeconds} seconds.`);
                } else {
                    console.log(`Token for socket ${socket.id} (user ${userId}) already expired on authentication.`);
                    socket.emit('force_logout', { reason: 'token_already_expired' });
                }
            });
        });

        //on register socket
        socket.on('register', async (data ) => {
            const token = data.token;
            if (!token) {
                socket.emit('auth_error', { message: 'No token provided' });
                socket.emit('force_logout', { reason: 'no_token_provided' }); // Force logout if no token
                return;
            }

            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    console.error('Socket authentication failed for', socket.id, ':', err.message);
                    socket.emit('auth_error', { message: 'Invalid or expired token', error: err.name });
                    socket.emit('force_logout', { reason: 'invalid_token' }); // Force logout if invalid/expired
                    return;
                }

                if (!(await isAccountStillValid(decoded))) {
                    console.log(`Socket ${socket.id} presented a revoked session for user ${decoded.id} — rejecting.`);
                    socket.emit('auth_error', { message: 'Session no longer valid' });
                    socket.emit('force_logout', { reason: 'session_revoked' });
                    return;
                }

                const userId = decoded.id;
                console.log(`Socket ${socket.id} registered for user ${userId}`);

                //Emit logged users
                emitLoggedUsers();

                //emit notifications
                emitNotifications(userId);
            });
        });

        //disconnect socket
        socket.on('disconnect', async () => {

            console.log(`Socket disconnected: ${socket.id}`);

            removeSocket(socket.id); // stop targeting this socket for future notification pushes
            clearSocketTimer(socket.id);

            const log = await UserLog.findOne({ where: { socketId: socket.id } });
            if (log) {
                await log.update({ isOnline: false, socketId: null });
                emitLoggedUsers();
            }

            for (const [uid, sid] of Object.entries(onlineUsers)) {
              if (sid === socket.id) delete onlineUsers[uid];
            }

        });

        socket.on('readNotification', async ({ id }) => {
            await Notification.update(
                { 
                    isRead: true 
                },
                { 
                    where: { 
                        receiverId: id 
                    } 
                }
            );
            emitNotifications(id);
        });

    });

    async function emitLoggedUsers() {
        const users = await UserLog.findAll({
            where: { 
                isOnline: true 
            },
            include: {
                model: User,
                as: 'user',
                attributes: { exclude: ['password'] },
                include: {
                    model: Staff,
                    as: 'staff',
                    include: {
                        model: Office,
                        as: 'office'
                    }
                }
            }
        });
        io.emit('loadLogs', users);
    };

    // Pushes ONLY to receiverId's own connected socket(s) — NOT a global io.emit(), which used to
    // hand every other connected staff member this same receiver's notification count/list on
    // every authenticate/register/readNotification (a real cross-user data leak: whoever happened
    // to be online would see their own badge overwritten by someone else's).
    async function emitNotifications(receiverId) {
        const notificationCount = await Notification.count({
            where: {
                receiverId: receiverId,
                isRead: false
            }
        });
        const notifications = await Notification.findAll({
            where: {
                isRead: false,
                receiverId
            },
            order: [
                ['createdAt', 'DESC'] // 'DESC' for latest first (descending order)
            ]
        });

        getUserSocketIds(receiverId).forEach(socketId => {
            io.to(socketId).emit('loadNotifications', notificationCount, notifications);
        });
    }

}