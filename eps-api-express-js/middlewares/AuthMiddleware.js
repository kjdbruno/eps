const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Assuming "Bearer TOKEN" format
    if (!token) {
        return res.status(403).json({ error: 'Token not properly formatted' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            // Specific error messages for better debugging
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired', message: 'Your session has expired. Please log in again.' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Failed to authenticate token', message: 'Invalid token. Please log in again.' });
            }
            return res.status(500).json({ error: 'Failed to authenticate token', message: 'An unexpected authentication error occurred.' });
        }

        // id/role are baked into the token at login and would otherwise stay stale for up to its
        // full 4h lifetime — re-reading both from the DB on every request means a disabled
        // account, or a role change (e.g. workstation promoted to admin, or demoted), takes effect
        // on the very next request instead of waiting for the old token to expire.
        try {
            const user = await User.findByPk(decoded.id, { attributes: ['id', 'role', 'isActive', 'forceLogoutAt'] });
            if (!user || !user.isActive) {
                return res.status(401).json({ error: 'Account disabled', message: 'This account is no longer active. Please log in again.' });
            }
            // decoded.iat is seconds since epoch (JWT standard); forceLogoutAt is a JS Date — any
            // token issued BEFORE this marker is rejected here, permanently (a fresh login issues
            // a new token with a newer iat, which passes again). Set by TWO call sites, both a
            // real logout, not just a live-app nicety: TeamController.forceLogout (an admin
            // kicking someone else, which also emits a live 'force_logout' socket event) and
            // AuthController.logout (self-service — otherwise a token stayed fully valid on the
            // server for the rest of its 4h lifetime regardless of the client deleting its own
            // copy). The message stays generic since either case can land here.
            if (user.forceLogoutAt && decoded.iat * 1000 < new Date(user.forceLogoutAt).getTime()) {
                return res.status(401).json({ error: 'Session invalidated', message: 'Your session has ended. Please log in again.' });
            }
            req.userId = user.id;
            req.role = user.role;
            next();
        } catch (dbError) {
            console.error('verifyToken account check failed:', dbError);
            return res.status(500).json({ error: 'Failed to authenticate token', message: 'An unexpected authentication error occurred.' });
        }
    });
};

// Discussion comments and poll votes are open to guests AND citizens on the same endpoint — this
// decodes a JWT when one is present (so the request can be attributed to that account) but never
// rejects the request for having none. An invalid/expired token is treated the same as no token
// at all (just falls back to guest) rather than erroring, since being logged out shouldn't block
// someone from participating as a guest.
exports.softAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : null;
    if (!token) return next();

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err && decoded) {
            req.userId = decoded.id;
            req.role = decoded.role;
        }
        next();
    });
};

// Applied after verifyToken (needs req.role already decoded). Rejects with 403 when the
// authenticated user's role isn't one of the allowed ones for this route.
exports.requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.role)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
};

exports.validateApiKey = (req, res, next) => {
    const apiKey = req.headers['api'];
    if (!apiKey) {
        return res.status(403).json({ error: 'API key is missing' });
    }
    const key = apiKey.replace(/^"(.*)"$/, '$1');
    if (key !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
};