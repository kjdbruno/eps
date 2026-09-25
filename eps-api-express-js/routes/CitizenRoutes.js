const express = require('express');
const router = express.Router();

const { register, verify, resend, login, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/CitizenController');
const { verifyToken, validateApiKey } = require('../middlewares/AuthMiddleware');
const { validateRegister, validateVerify, validateEmailOnly, validateLogin, validateVerifyResetCode, validateResetPassword } = require('../middlewares/CitizenValidator');
const { loginLimiter, otpLimiter, registerLimiter } = require('../middlewares/rateLimiter');

router.post('/register', validateApiKey, registerLimiter, validateRegister, register);
router.post('/verify', validateApiKey, otpLimiter, validateVerify, verify);
router.post('/resend', validateApiKey, otpLimiter, validateEmailOnly, resend);
router.post('/login', validateApiKey, loginLimiter, validateLogin, login);
// otpLimiter on all three — forgot-password throttles how often a code can be requested per IP
// (same spirit as registerLimiter guarding against a mailer-spam script), verify-reset-code +
// reset-password both throttle guessing the 6-digit code itself (same as every other OTP-style
// code in this app) — verify-reset-code doesn't consume the code, so it needs its own guard just
// as much as the endpoint that does.
router.post('/forgot-password', validateApiKey, otpLimiter, validateEmailOnly, forgotPassword);
router.post('/verify-reset-code', validateApiKey, otpLimiter, validateVerifyResetCode, verifyResetCode);
router.post('/reset-password', validateApiKey, otpLimiter, validateResetPassword, resetPassword);

module.exports = (ComplaintController) => {
    router.get('/complaints', verifyToken, ComplaintController.getMyComplaints);
    return router;
};
