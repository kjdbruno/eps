const express = require('express');
const router = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
// Evidence photos are processed by sharp (see saveComplaintFiles in the controller), which only
// ever produces PNG/JPEG output — images only, and capped, so this couldn't be used to buffer
// arbitrarily large or arbitrary-type files into memory (memoryStorage) unauthenticated.
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed.'));
    }
});

const { verifyToken, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/ComplaintValidator');
const { otpLimiter } = require('../middlewares/rateLimiter');

module.exports = (ComplaintController) => {

    const router = express.Router();

    // validateApiKey before upload.array — an unauthenticated/wrong-key request should be
    // rejected before multer spends any effort parsing (and buffering into memory) its body.
    // otpLimiter on every endpoint that takes an OTP (alone, for /otp/validate, or paired with a
    // reference number for track/claim) as its proof — all guess-able short codes, throttled per IP.
    router.post('/otp/send', validateApiKey, otpLimiter, upload.array('files', 5), validateForm, ComplaintController.sendOTP);
    router.post('/otp/validate', validateApiKey, otpLimiter, ComplaintController.validateOTP);
    router.get('/track/:referenceNo', validateApiKey, otpLimiter, ComplaintController.trackComplaint);

    router.post('/account', verifyToken, upload.array('files', 5), ComplaintController.createAccountComplaint);
    router.post('/claim', verifyToken, otpLimiter, ComplaintController.claimComplaint);
    // Super/admin filing a complaint on a citizen's behalf (walk-in/phone) — distinct from
    // createComplaint below, which assigns offices to a complaint that already exists.
    router.post('/staff', verifyToken, requireRole('super', 'admin'), upload.array('files', 5), ComplaintController.createStaffComplaint);
    // Editing a staff-filed complaint's content/citizen info/evidence — see editStaffComplaint's
    // own via==='staff' + not-finalized guard for why this can't touch a citizen-filed one.
    router.patch('/:id/edit', verifyToken, requireRole('super', 'admin'), upload.array('files', 5), ComplaintController.editStaffComplaint);
    router.post('/', verifyToken, requireRole('super', 'admin'), ComplaintController.createComplaint);

    router.get('/', verifyToken, ComplaintController.getAllComplaints);
    // Must come before /:id — otherwise Express would treat "analytics" as an :id. Open to every
    // staff role — getAnalytics itself scopes the data (whole system for super/admin, one
    // office for workstation).
    router.get('/analytics', verifyToken, ComplaintController.getAnalytics);
    router.post('/sentiments/read', verifyToken, requireRole('super', 'admin'), ComplaintController.readSentiments);
    router.get('/sentiments/read', verifyToken, requireRole('super', 'admin'), ComplaintController.getSentimentRun);
    // Also before /:id, same reasoning — feeds the overview's "feedback locations" map. Open to
    // every staff role, scoped the same way getAnalytics is (own office only for workstation).
    router.get('/locations', verifyToken, ComplaintController.getComplaintLocations);
    // The random current feedback shown to visitors who are not signed in (API key only). Before /:id.
    router.get('/public/feed', validateApiKey, ComplaintController.publicFeed);
    router.get('/:id', verifyToken, ComplaintController.getComplaintDetail);
    // Assignment is a super/admin-only module.
    router.get('/:id/suggest-office', verifyToken, requireRole('super', 'admin'), ComplaintController.suggestOffice);
    router.patch('/:id/office', verifyToken, requireRole('super', 'admin'), ComplaintController.reassignOffice);
    // The one-time 3-day extension: the office handling the feedback (or a super/admin) asks for it.
    router.post('/:id/extension', verifyToken, requireRole('workstation', 'super', 'admin'), ComplaintController.requestExtension);
    // An office hands the feedback over to other offices, with a reason; its own part of the trail ends there.
    router.post('/:id/handoff', verifyToken, requireRole('workstation'), ComplaintController.handOff);
    // A signed-in citizen cancels their own feedback before it is completed.
    router.post('/:id/cancel', verifyToken, ComplaintController.cancelOwnComplaint);
    router.patch('/:id/status', verifyToken, requireRole('super', 'admin'), ComplaintController.updateStatus);
    // Advisory-only read, same audience as the status action it feeds (see
    // utils/completionSuggestion.js) — never changes anything itself.
    router.get('/:id/completion-suggestion', verifyToken, requireRole('super', 'admin'), ComplaintController.getCompletionSuggestion);
    // Super/admin — same audience as updateStatus/completion-suggestion above; reversing an
    // already-completed, citizen-notified finalization stays supervisor-only, just not narrower
    // than finalizing one in the first place.
    router.patch('/:id/reopen', verifyToken, requireRole('super', 'admin'), ComplaintController.reopen);

    return router;

};
