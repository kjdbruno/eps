const express = require('express');
const router = express.Router();

const { verifyToken, validateApiKey } = require('../middlewares/AuthMiddleware');
const NotificationController = require('../controllers/NotificationController');

// Notifications are per-account, so they need a real token (not just the API key).
router.get('/', validateApiKey, verifyToken, NotificationController.list);
router.post('/read', validateApiKey, verifyToken, NotificationController.markAllRead);

module.exports = router;
