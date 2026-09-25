// Shared userId -> Set<socketId> registry. A user can have more than one socket connected at
// once (multiple tabs/devices), so every entry is a set, not a single id. Lives in its own module
// (rather than inside sockets/index.js) so controllers can look up a user's live socket(s) to push
// a targeted update without requiring sockets/index.js and risking a circular require.
const connectedUsers = new Map();

const addUserSocket = (userId, socketId) => {
    if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
    connectedUsers.get(userId).add(socketId);
};

// Called on every socket disconnect — without this, a stale socketId lingers in the map forever
// (harmless to io.to(), which just silently delivers to nobody, but it's still a real, unbounded
// leak over the life of a long-running server).
const removeSocket = (socketId) => {
    for (const [userId, socketIds] of connectedUsers.entries()) {
        socketIds.delete(socketId);
        if (!socketIds.size) connectedUsers.delete(userId);
    }
};

const getUserSocketIds = (userId) => Array.from(connectedUsers.get(userId) || []);

module.exports = { addUserSocket, removeSocket, getUserSocketIds };
