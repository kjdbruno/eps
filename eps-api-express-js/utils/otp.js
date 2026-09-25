const { randomInt } = require('crypto');

// crypto.randomInt is CSPRNG-backed (unlike Math.random, which is not designed to be
// unpredictable) — this generates a 6-digit-by-default numeric code used for email verification
// and the guest complaint-filing OTP flow, both throttled separately (see middlewares/
// rateLimiter.js) since code length/randomness alone isn't a substitute for rate limiting.
module.exports = function generateOTP(length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += randomInt(0, 10).toString();
    }
    return otp;
};
