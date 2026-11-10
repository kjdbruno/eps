const express = require('express');

const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');

// Messaging is between staff accounts. A citizen's account is signed in too, but has no business reading or writing here.
const staffOnly = requireRole('super', 'admin', 'workstation', 'monitoring');

module.exports = (MessageController) => {
    const router = express.Router();

    // the people you have talked to, with the last message and unread count of each — before /:userId
    router.get('/', verifyToken, staffOnly, MessageController.getConversations);
    router.get('/:userId', verifyToken, staffOnly, MessageController.getConversation);
    router.post('/', verifyToken, staffOnly, MessageController.sendMessage);

    return router;
};
