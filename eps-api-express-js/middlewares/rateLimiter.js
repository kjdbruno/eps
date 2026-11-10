const rateLimit = require('express-rate-limit');

// Applied to every login endpoint (staff + citizen) — without this, a password could be brute-forced at unlimited speed.
//
// Two limits, and only FAILED attempts count (a sign-in that works is never held against anybody):
//   per account  8 wrong tries in 15 minutes for the same username/email from the same address: enough for a typo or two, too few to guess.
//   per address  100 wrong tries in 15 minutes from one address, whoever they were for: stops one machine trying names one after another.
// It used to be 10 tries per address in total, which locked out a whole office the morning its staff all signed in from the same
// network address (and, behind a proxy, everybody at once: see TRUST_PROXY in server.js).
const failedOnly = { windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true };
const who = (req) => String((req.body && (req.body.username || req.body.email)) || '').trim().toLowerCase().slice(0, 120);
exports.loginLimiter = [
    rateLimit({ ...failedOnly, limit: 100, message: { message: 'Too many sign-in attempts from here. Please try again in a few minutes.' } }),
    rateLimit({
        ...failedOnly, limit: 8,
        keyGenerator: (req) => `${rateLimit.ipKeyGenerator(req.ip)}|${who(req)}`,
        message: { message: 'Too many wrong attempts for this account. Please try again in a few minutes.' },
    }),
];

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
