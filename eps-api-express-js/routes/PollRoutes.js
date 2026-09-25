const express = require('express');

const { verifyToken, softAuth, validateApiKey, requireRole } = require('../middlewares/AuthMiddleware');

module.exports = (PollController) => {
    const router = express.Router();

    // Public (citizen/guest) reads/votes stay open via the API key — softAuth additionally
    // decodes a Bearer token when one is present (the internal staff app always sends both), so a
    // logged-in workstation viewer gets office-scoped results while everyone else still sees
    // everything.
    router.get('/', validateApiKey, softAuth, PollController.getAllPolls);
    router.get('/:id', validateApiKey, softAuth, PollController.getPoll);
    router.post('/:id/vote', validateApiKey, softAuth, PollController.vote);

    // Creating, closing, and reopening a poll is a super/admin-only action. A workstation user is
    // limited to viewing whatever's assigned to their own office; voting is reserved for
    // super/admin and the public (see vote's role check in the controller).
    router.post('/', verifyToken, requireRole('super', 'admin'), PollController.createPoll);
    router.post('/:id/close', verifyToken, requireRole('super', 'admin'), PollController.closePoll);
    router.post('/:id/reopen', verifyToken, requireRole('super', 'admin'), PollController.reopenPoll);

    // Office assignment is a super/admin-only module, same as the equivalent Complaint/Discussion
    // routes.
    router.get('/:id/suggest-office', verifyToken, requireRole('super', 'admin'), PollController.suggestOffice);
    router.patch('/:id/office', verifyToken, requireRole('super', 'admin'), PollController.reassignOffice);

    return router;
};
