const express = require('express');
const router = express.Router();

const { getCategory } = require('../controllers/ComplaintTypeController');
const { verifyToken, validateApiKey } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/OfficeValidator');

// router.get('/', verifyToken, getAllOffices);
// router.post('/', verifyToken, validateForm, createOffice);
// router.post('/:id/update', verifyToken, validateForm, updateOffice);
// router.post('/:id/disable', verifyToken, disableOffice);
// router.post('/:id/enable', verifyToken, enableOffice);
router.get('/getCategory', validateApiKey, getCategory);

module.exports = router;