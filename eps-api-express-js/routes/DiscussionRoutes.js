const express = require('express');

const { verifyToken, softAuth, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');

module.exports = (DiscussionController) => {
    const router = express.Router();

    // Public (citizen/guest) reads stay open via the API key — softAuth additionally decodes a
    // Bearer token when one is present (the internal staff app always sends both), so a logged-in
    // workstation viewer gets office-scoped results while everyone else still sees everything.
    router.get('/', validateApiKey, softAuth, DiscussionController.getAllDiscussions);
    router.get('/:id', validateApiKey, softAuth, DiscussionController.getDiscussion);
    // Joining a discussion needs an account: guests can read a thread but not post (citizens, and
    // staff via the internal app, all send a Bearer token).
    router.post('/:id/comment', validateApiKey, verifyToken, DiscussionController.addComment);

    // Creating, closing, and reopening a discussion is a super/admin-only action. A workstation
    // user is limited to viewing and commenting on whatever's assigned to their own office (see
    // addComment's office-scope check in the controller).
    router.post('/', verifyToken, requireRole('super', 'admin'), DiscussionController.createDiscussion);
    router.post('/:id/close', verifyToken, requireRole('super', 'admin'), DiscussionController.closeDiscussion);
    router.post('/:id/reopen', verifyToken, requireRole('super', 'admin'), DiscussionController.reopenDiscussion);

    // Office assignment is a super/admin-only module, same as the equivalent Complaint routes.
    router.get('/:id/suggest-office', verifyToken, requireRole('super', 'admin'), DiscussionController.suggestOffice);
    router.patch('/:id/office', verifyToken, requireRole('super', 'admin'), DiscussionController.reassignOffice);

    return router;
};
