const express = require('express');
const router = express.Router();

const { getAllHolidays, createHoliday, updateHoliday, disableHoliday, enableHoliday } = require('../controllers/HolidayController');
const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/HolidayValidator');

// Holiday-calendar management is a supervisor concern, same as Office management.
router.get('/', verifyToken, requireRole('super', 'admin'), getAllHolidays);
router.post('/', verifyToken, requireRole('super', 'admin'), validateForm, createHoliday);
router.post('/:id/update', verifyToken, requireRole('super', 'admin'), validateForm, updateHoliday);
router.post('/:id/disable', verifyToken, requireRole('super', 'admin'), disableHoliday);
router.post('/:id/enable', verifyToken, requireRole('super', 'admin'), enableHoliday);

module.exports = router;
