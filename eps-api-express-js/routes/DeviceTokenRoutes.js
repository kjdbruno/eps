const express = require('express');
const router = express.Router();

const { verifyToken, validateApiKey } = require('../middlewares/AuthMiddleware');
const DeviceTokenController = require('../controllers/DeviceTokenController');

// Per-account, same as notifications — needs a real token, not just the API key.
router.post('/', validateApiKey, verifyToken, DeviceTokenController.register);
router.delete('/', validateApiKey, verifyToken, DeviceTokenController.unregister);

module.exports = router;
