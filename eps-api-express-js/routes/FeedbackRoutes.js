const express = require('express');
const router = express.Router();

const { getAllFeedbacks, getFeedbackAnalytics, createFeedbackKiosk, getAllRatings, generatePDFRating } = require('../controllers/FeedbackController');
const { verifyToken, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/OfficeValidator');

router.get('/', verifyToken, getAllFeedbacks);
// Must come before /:id/:year for consistency with ComplaintRoutes, even though the two-segment
// shape below wouldn't actually collide with this single-segment one.
router.get('/analytics', verifyToken, getFeedbackAnalytics);
// Manual (staff-keyed) rating entry — this used to be verifyToken-only, which let ANY
// authenticated account, including a citizen's own, inject fabricated feedback for any office.
// monitoring is deliberately excluded (view-only, never transacts).
router.post('/kiosk', verifyToken, requireRole('workstation', 'super', 'admin'), createFeedbackKiosk);
router.get('/:id/:year', verifyToken, getAllRatings);
router.get('/pdf/rating/:id', verifyToken, generatePDFRating);

module.exports = router;