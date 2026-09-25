const express = require('express');

const { validateForm } = require('../middlewares/AuthValidator');
const { verifyToken } = require('../middlewares/AuthMiddleware');
const { loginLimiter } = require('../middlewares/rateLimiter');

module.exports = (AuthController) => {
    const router = express.Router();

    router.post('/login', loginLimiter, validateForm, AuthController.login);
    // verifyToken so logout can actually invalidate the session server-side (see AuthController.
    // logout) — previously a pure no-op, "logout" meant nothing more than the client choosing to
    // delete its own copy of a token that remained fully valid, on the server, for the rest of its
    // 4h lifetime regardless (a real gap if that token had ever leaked — XSS, a shared computer,
    // a copied Authorization header — logging out wouldn't have revoked it).
    router.post('/logout', verifyToken, AuthController.logout);
    // Was missing verifyToken entirely — checkToken read req.userId (never set) and always
    // responded "Token is valid", even with no Authorization header at all.
    router.get('/check-token', verifyToken, AuthController.checkToken);

    return router;
};