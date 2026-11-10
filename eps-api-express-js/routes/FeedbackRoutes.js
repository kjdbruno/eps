const express = require('express');
const router = express.Router();

const { getAllFeedbacks, getFeedbackAnalytics, createFeedbackKiosk, getAllRatings, generatePDFRating } = require('../controllers/FeedbackController');
const { verifyToken, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/OfficeValidator');
const { KioskRating, Staff } = require('../models');

// One CSM report as a PDF holds what the client wrote (their email, comments): a supervisor or monitor may print any, an office only
// its own, and a citizen's account none.
const canPrintReport = async (req, res, next) => {
    try {
        if (['super', 'admin', 'monitoring'].includes(req.role)) return next();
        if (req.role === 'workstation') {
            const report = await KioskRating.findByPk(req.params.id, { attributes: ['officeId'] });
            const staff = await Staff.findOne({ where: { userId: req.userId }, attributes: ['officeId'] });
            if (report && staff && report.officeId === staff.officeId) return next();
        }
        return res.status(403).json({ message: 'You do not have access to this report.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error.' });
    }
};

router.get('/', verifyToken, getAllFeedbacks);
// Must come before /:id/:year for consistency with ComplaintRoutes, even though the two-segment
// shape below wouldn't actually collide with this single-segment one.
router.get('/analytics', verifyToken, getFeedbackAnalytics);
// Manual (staff-keyed) CSM report entry — this used to be verifyToken-only, which let ANY
// authenticated account, including a citizen's own, inject fabricated feedback for any office.
// Filing a CSM report is a supervisor task: workstation and monitoring accounts only read them.
router.post('/kiosk', verifyToken, requireRole('super', 'admin'), createFeedbackKiosk);
router.get('/:id/:year', verifyToken, getAllRatings);
router.get('/pdf/rating/:id', verifyToken, canPrintReport, generatePDFRating);

module.exports = router;