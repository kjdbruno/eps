const express = require('express');
const router = express.Router();

const { getAllOffices, getOfficeProfile, createOffice, updateOffice, disableOffice, enableOffice, getOffice } = require('../controllers/OfficeController');
const { verifyToken, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/OfficeValidator');

// Office management is for supervisors (super and admin): the core config that drives citywide
// complaint routing. (The User preference stays super-only.) This used to be verifyToken-only, which
// let any authenticated account (including workstation) create/edit/disable/enable offices.
router.get('/', verifyToken, requireRole('super', 'admin'), getAllOffices);
router.get('/:id/profile', verifyToken, requireRole('super', 'admin'), getOfficeProfile);
router.post('/', verifyToken, requireRole('super', 'admin'), validateForm, createOffice);
router.post('/:id/update', verifyToken, requireRole('super', 'admin'), validateForm, updateOffice);
router.post('/:id/disable', verifyToken, requireRole('super', 'admin'), disableOffice);
router.post('/:id/enable', verifyToken, requireRole('super', 'admin'), enableOffice);
// Unchanged — this is the public, unauthenticated office picker the citizen-facing complaint
// form uses (active offices only, name/alias only), gated by the shared API key like every other
// public read in this app.
router.get('/getOffice', validateApiKey, getOffice);

module.exports = router;