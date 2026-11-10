const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { User } = require('../models');
const { verifyToken } = require('../middlewares/AuthMiddleware');
const rateLimit = require('express-rate-limit');

// An account choosing its own password: any signed-in role. It is also the one request an account with
// mustChangePassword may make (see verifyToken), so a seeded account is always able to get out of that state.
// The current password is checked here, so guessing it is throttled: 10 tries per 15 minutes for the account, counted after
// the token is checked. (Not per IP like the login: the staff of one office share an address, and every seeded account
// has to come through here once.)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.userId),
    validate: { keyGeneratorIpFallback: false },
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

const validate = [
    body('currentPassword').notEmpty().withMessage('Your current password is required.'),
    body('newPassword').notEmpty().withMessage('A new password is required.')
        .isLength({ min: 8 }).withMessage('The new password must be at least 8 characters.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), message: errors.array()[0].msg });
        next();
    },
];

const fail = (res, path, msg) => res.status(400).json({ errors: [{ type: 'field', msg, path, location: 'body' }], message: msg });

router.post('/', verifyToken, limiter, validate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (!user || !(await bcrypt.compare(currentPassword, user.password || ''))) {
            return fail(res, 'currentPassword', 'Your current password is not right.');
        }
        if (newPassword === currentPassword) return fail(res, 'newPassword', 'Choose a password different from the current one.');
        // a seeded staff account starts with its username as the password: that is not a new password either
        if (user.username && newPassword.toLowerCase() === user.username.toLowerCase()) {
            return fail(res, 'newPassword', 'Your password cannot be the same as your username.');
        }
        await user.update({ password: await bcrypt.hash(newPassword, 10), mustChangePassword: false });
        return res.json({ message: 'Your password was changed.' });
    } catch (error) {
        console.error('Error changing the password:', error);
        return res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
