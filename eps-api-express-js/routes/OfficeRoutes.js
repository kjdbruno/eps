const express = require('express');
const router = express.Router();

const { getAllOffices, createOffice, updateOffice, disableOffice, enableOffice, getOffice } = require('../controllers/OfficeController');
const { verifyToken, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/OfficeValidator');

// Office management is super-only (admin excluded, same reasoning as UserRoutes) — the core
// config that drives citywide complaint routing. This used to be verifyToken-only, which let any
// authenticated account (including workstation) create/edit/disable/enable offices.
router.get('/', verifyToken, requireRole('super'), getAllOffices);
router.post('/', verifyToken, requireRole('super'), validateForm, createOffice);
router.post('/:id/update', verifyToken, requireRole('super'), validateForm, updateOffice);
router.post('/:id/disable', verifyToken, requireRole('super'), disableOffice);
router.post('/:id/enable', verifyToken, requireRole('super'), enableOffice);
// Unchanged — this is the public, unauthenticated office picker the citizen-facing complaint
// form uses (active offices only, name/alias only), gated by the shared API key like every other
// public read in this app.
router.get('/getOffice', validateApiKey, getOffice);

module.exports = router;