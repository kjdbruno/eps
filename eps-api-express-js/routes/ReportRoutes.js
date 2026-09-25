const express = require('express');
const router = express.Router();

const { getResponseTimeReport, getOfficePerformanceReport, getAccountPerformanceReport, getCsmReport, getActivityLog, getClientOverview, getPrescriptions, exportPdf } = require('../controllers/ReportController');
const { verifyToken } = require('../middlewares/AuthMiddleware');

router.get('/response-time', verifyToken, getResponseTimeReport);
router.get('/office-performance', verifyToken, getOfficePerformanceReport);
router.get('/account-performance', verifyToken, getAccountPerformanceReport);
router.get('/csm', verifyToken, getCsmReport);
router.get('/activity-log', verifyToken, getActivityLog);
// Home dashboard "Client" tiles — super/admin/monitoring (controller re-checks); ?period=&year=.
router.get('/client-overview', verifyToken, getClientOverview);
// AI "Analyze Data" — super/admin only (the controller re-checks); respects ?period=&year=.
router.get('/prescriptions', verifyToken, getPrescriptions);
// POST (not GET) — carries the already-rendered report payload (title/kpis/sections) the
// frontend is currently displaying, not just a couple of query params.
router.post('/export-pdf', verifyToken, exportPdf);

module.exports = router;
