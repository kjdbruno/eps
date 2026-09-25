const express = require('express');

const { verifyToken } = require('../middlewares/AuthMiddleware');

module.exports = (MessageController) => {
    const router = express.Router();

    router.get('/:userId', verifyToken, MessageController.getConversation);
    router.post('/', verifyToken, MessageController.sendMessage);

    return router;
};
