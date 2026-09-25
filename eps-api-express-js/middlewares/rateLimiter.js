const rateLimit = require('express-rate-limit');

// Applied to every login endpoint (staff + citizen) — without this, a password could be brute-
// forced at unlimited speed. 10 attempts / 15 minutes per IP is generous enough for a genuine
// typo or two, tight enough to make guessing impractical.
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again in a few minutes.' }
});

// Applied to every OTP send/validate/resend endpoint (citizen email verification + the guest
// complaint-filing OTP flow). A 6-digit code is only safe against guessing if attempts are
// throttled — this is the other half of the validateOTP referenceNo+otp binding fix; that closed
// "guess someone else's OTP", this closes "guess your own as fast as possible".
exports.otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

// Applied to citizen registration — without this, an attacker could script-spam account creation
// (and the verification emails that go with each one).
exports.registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many registration attempts. Please try again later.' }
});

// Applied to the public kiosk rating endpoint — protected only by a static, shared API key
// (effectively an "is this our app" check, not a real secret, since a kiosk's own frontend bundle
// has to carry it). Generous enough for one physical kiosk terminal seeing real citizens one at a
// time (30 submissions / 10 minutes), tight enough to blunt a scripted flood aimed at skewing CSM
// satisfaction stats.
exports.kioskLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many submissions from this kiosk right now. Please try again shortly.' }
});
