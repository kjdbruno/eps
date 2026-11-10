const express = require('express');
const router = express.Router();

const { getAllCannedMessages, createCannedMessage, updateCannedMessage, disableCannedMessage, enableCannedMessage } = require('../controllers/CannedMessageController');
const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/CannedMessageValidator');

// Reading is for the staff who answer citizens (an office gets only the active ones, see the controller); changing the
// list is a supervisor concern, same as the holiday calendar.
router.get('/', verifyToken, requireRole('super', 'admin', 'workstation'), getAllCannedMessages);
router.post('/', verifyToken, requireRole('super', 'admin'), validateForm, createCannedMessage);
router.post('/:id/update', verifyToken, requireRole('super', 'admin'), validateForm, updateCannedMessage);
router.post('/:id/disable', verifyToken, requireRole('super', 'admin'), disableCannedMessage);
router.post('/:id/enable', verifyToken, requireRole('super', 'admin'), enableCannedMessage);

module.exports = router;
