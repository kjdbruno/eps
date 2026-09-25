const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/AuthMiddleware');
const NavBadgeController = require('../controllers/NavBadgeController');

router.get('/', verifyToken, NavBadgeController.getBadges);
router.post('/seen', verifyToken, NavBadgeController.markSeen);

module.exports = router;
