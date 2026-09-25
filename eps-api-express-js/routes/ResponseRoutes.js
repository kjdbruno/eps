const express = require('express');

const multer = require('multer');

const storage = multer.memoryStorage();
// Evidence attached to a follow-up response — images or PDFs only, matching what
// saveResponseFiles in ResponseController actually knows how to store as a blob.
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Only image or PDF files are allowed.'));
    }
});

const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');

module.exports = (ResponseController) => {

    const router = express.Router();

    // Receive is per-office, resolved from the caller's OWN Staff row (see
    // getStaffComplaintOffice in the controller — 404s if it doesn't match one of this
    // complaint's assigned offices), so it's safe to open to super/admin too: an account that
    // also belongs to an office (e.g. an IT-department admin) can receive on that office's
    // behalf the same way a workstation user would; a super/admin with no office of their own,
    // or an unrelated one, is rejected by the controller exactly like any other mismatch.
    // Complete stays workstation-only — inherently a per-office action. Posting a response is
    // also open to super/admin (not tied to any single office) and to citizen (a follow-up on
    // their own complaint — ownership is checked in the controller, since a citizen isn't scoped
    // to a single complaint the way a route param could express).
    router.post('/receive', verifyToken, requireRole('workstation', 'super', 'admin'), ResponseController.receive);
    router.post('/respond', verifyToken, requireRole('workstation', 'super', 'admin', 'citizen'), upload.array('files', 5), ResponseController.respond);
    router.post('/complete', verifyToken, requireRole('workstation'), ResponseController.complete);
    // Send-back for a single office's own "completed" mark, before the whole complaint is
    // finalized — see reopen on ComplaintController for after it's already finalized.
    router.post('/reopen', verifyToken, requireRole('super', 'admin'), ResponseController.reopenOffice);

    // Citizen-only: rate a response to their own complaint.
    router.post('/rate', verifyToken, requireRole('citizen'), ResponseController.rate);

    router.get('/:id', verifyToken, ResponseController.getAllResponses);

    return router;

};
