const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { getClients, getStatus, getClientProfile, notifyClients, resendClient, testEmail } = require('../controllers/ClientAccountController');
const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');

const validEmail = [
    body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('email must be a valid email address'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), message: errors.array()[0].msg });
        next();
    },
];

// Sending the clients seeded from the previous system their account details is a supervisor task.
router.get('/', verifyToken, requireRole('super', 'admin'), getClients);
router.get('/status', verifyToken, requireRole('super', 'admin'), getStatus);
router.get('/:id', verifyToken, requireRole('super', 'admin'), getClientProfile);
router.post('/notify', verifyToken, requireRole('super', 'admin'), notifyClients);
router.post('/test', verifyToken, requireRole('super', 'admin'), validEmail, testEmail);
router.post('/:id/resend', verifyToken, requireRole('super', 'admin'), resendClient);

module.exports = router;
