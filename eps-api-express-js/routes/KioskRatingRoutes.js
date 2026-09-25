const express = require('express');

const { validateApiKey } = require('../middlewares/AuthMiddleware');
const { kioskLimiter } = require('../middlewares/rateLimiter');

module.exports = (KioskRatingController) => {

    const router = express.Router();

    router.post('/kiosk', validateApiKey, kioskLimiter, KioskRatingController.createKioskRating);

    return router;

};
