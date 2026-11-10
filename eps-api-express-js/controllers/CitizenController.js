const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const transporter = require('../utils/mailer');
const mailFrom = require('../utils/mailFrom');
const otpGenerator = require('../utils/otp');
const { User, Citizen } = require('../models');

const sendVerificationEmail = async (email, code) => {
    const templatePath = path.join(__dirname, '../templates/otp.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('{{ otp }}', code);

    await transporter.sendMail({
        from: mailFrom(),
        to: email,
        subject: 'Verify your email',
        html
    });
};

const issueToken = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '4h' });

const RESET_CODE_TTL_MINUTES = 15;

const sendResetPasswordEmail = async (email, code) => {
    const templatePath = path.join(__dirname, '../templates/reset-password.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('{{ code }}', code);

    await transporter.sendMail({
        from: mailFrom(),
        to: email,
        subject: 'Reset your password',
        html
    });
};

// See AuthController.js's DUMMY_HASH for why — bcrypt.compare()'d against whenever the email
// doesn't match any citizen, so "no such account" and "wrong password" take the same time and
// return the exact same response, instead of "Account not found" being a free way to check
// whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync('no-such-citizen-placeholder', 10);

// The frontend only receives the User row from a JWT-issuing endpoint; fold in the
// Citizen-only fields (email/phoneNo) so the client has a complete profile without a second call,
// and strip the password hash — it has no business leaving the server.
const withProfile = (citizen) => {
    const { password, ...user } = citizen.user.toJSON();
    return { ...user, email: citizen.email, phoneNo: citizen.phoneNo };
};

module.exports = {
    register: async (req, res) => {
        const { firstname, lastname, email, phoneNo, password } = req.body;

        try {
            const existing = await Citizen.findOne({ where: { email }, include: { model: User, as: 'user' } });

            if (existing && existing.isVerified) {
                return res.status(409).json({
                    errors: [{ type: 'field', value: email, msg: 'Email is already registered. Please log in instead.', path: 'email', location: 'body' }],
                });
            }

            const code = otpGenerator();

            // Send first, matching the OTP complaint flow's convention — if the mailer is down,
            // fail loudly before writing anything, instead of leaving an unverified orphan account.
            await sendVerificationEmail(email, code);

            const hashedPassword = await bcrypt.hash(password, 10);

            if (existing) {
                // Unverified account from a previous, abandoned registration attempt — refresh it.
                await existing.user.update({ firstname, lastname, password: hashedPassword });
                await existing.update({ phoneNo, verificationCode: code });
            } else {
                const user = await User.create({ firstname, lastname, password: hashedPassword, role: 'citizen' });
                await Citizen.create({ userId: user.id, email, phoneNo, verificationCode: code, isVerified: false });
            }

            return res.status(201).json({ message: 'Registration successful. Please check your email for the verification code.' });
        } catch (error) {
            console.error('Error registering citizen:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    verify: async (req, res) => {
        const { email, code } = req.body;

        try {
            const citizen = await Citizen.findOne({
                where: { email, verificationCode: code, isVerified: false },
                include: { model: User, as: 'user' }
            });

            if (!citizen) {
                return res.status(400).json({ message: 'Invalid or expired verification code.' });
            }

            await citizen.update({ isVerified: true, verifiedAt: new Date(), verificationCode: null });

            await citizen.user.update({ lastLoginAt: new Date() });
            const token = issueToken(citizen.user);
            return res.status(200).json({ message: 'Email verified successfully.', user: withProfile(citizen), token });
        } catch (error) {
            console.error('Error verifying citizen:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    resend: async (req, res) => {
        const { email } = req.body;

        try {
            const citizen = await Citizen.findOne({ where: { email, isVerified: false } });

            if (!citizen) {
                return res.status(404).json({ message: 'No pending verification found for this email.' });
            }

            const code = otpGenerator();
            await citizen.update({ verificationCode: code });
            await sendVerificationEmail(email, code);

            return res.status(200).json({ message: 'Verification code resent.' });
        } catch (error) {
            console.error('Error resending verification:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    login: async (req, res) => {
        const { email, password } = req.body;

        try {
            const citizen = await Citizen.findOne({ where: { email }, include: { model: User, as: 'user' } });

            // Always run a real bcrypt.compare, win or lose — see DUMMY_HASH above. Every
            // account-status check below (unverified/disabled) only runs once the password is
            // already confirmed correct, so none of them can be used to probe whether an email is
            // registered without also knowing its password.
            const isMatch = await bcrypt.compare(password || '', citizen?.user?.password || DUMMY_HASH);
            if (!citizen || !isMatch) {
                return res.status(401).json({
                    errors: [{ type: 'field', value: '', msg: 'Invalid username or password.', path: 'email', location: 'body' }],
                });
            }

            if (!citizen.isVerified) {
                return res.status(403).json({ message: 'Please verify your email before logging in.', notVerified: true, email });
            }

            if (!citizen.user.isActive) {
                return res.status(403).json({ message: 'This account has been disabled.' });
            }

            await citizen.user.update({ lastLoginAt: new Date() });
            const token = issueToken(citizen.user);
            return res.json({ user: withProfile(citizen), token });
        } catch (error) {
            console.error('Error logging in citizen:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Account recovery, step 1 of 2. Enumeration-safe by design — same convention as login's
    // DUMMY_HASH: the response is IDENTICAL whether or not this email is registered, so this
    // endpoint can never be used to check who has an account. A code is only actually generated
    // and emailed when a real match exists; every other path (no match, mailer failure) still
    // returns the same generic message.
    forgotPassword: async (req, res) => {
        const { email } = req.body;
        const genericResponse = { message: 'If that email is registered, a password reset code has been sent.' };

        try {
            const citizen = await Citizen.findOne({ where: { email } });
            if (citizen) {
                const code = otpGenerator();
                await citizen.update({
                    resetPasswordCode: code,
                    resetPasswordExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60000)
                });
                await sendResetPasswordEmail(email, code);
            }
            return res.status(200).json(genericResponse);
        } catch (error) {
            console.error('Error requesting password reset:', error);
            // Still the generic response — a mailer hiccup shouldn't reveal whether the email was
            // registered either.
            return res.status(200).json(genericResponse);
        }
    },

    // Account recovery, step 2 of 3 — lets the frontend confirm the code is right BEFORE asking
    // for a new password, rather than only finding out at the very end (same UX split
    // register/verify already uses). Unlike forgotPassword above, this one's response DOES differ
    // on failure ("invalid or expired code") — but that's fine here: reaching this step already
    // requires knowing both the email AND a code that was only ever sent to that email's inbox, so
    // there's nothing left to enumerate. Deliberately does NOT consume/clear the code — only
    // resetPassword below does that, and re-validates it independently regardless of whether this
    // step was called first, so skipping straight to resetPassword is never a weaker path.
    verifyResetCode: async (req, res) => {
        const { email, code } = req.body;

        try {
            const citizen = await Citizen.findOne({ where: { email, resetPasswordCode: code } });

            if (!citizen || !citizen.resetPasswordExpiresAt || new Date(citizen.resetPasswordExpiresAt) < new Date()) {
                return res.status(400).json({ message: 'Invalid or expired reset code.' });
            }

            return res.status(200).json({ message: 'Code verified.' });
        } catch (error) {
            console.error('Error verifying reset code:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Account recovery, step 3 of 3. Unlike forgotPassword above, this one's response DOES differ
    // on failure ("invalid or expired code") — but that's fine here: reaching this step already
    // requires knowing both the email AND a code that was only ever sent to that email's inbox, so
    // there's nothing left to enumerate.
    resetPassword: async (req, res) => {
        const { email, code, newPassword } = req.body;

        try {
            const citizen = await Citizen.findOne({
                where: { email, resetPasswordCode: code },
                include: { model: User, as: 'user' }
            });

            if (!citizen || !citizen.resetPasswordExpiresAt || new Date(citizen.resetPasswordExpiresAt) < new Date()) {
                return res.status(400).json({ message: 'Invalid or expired reset code.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            // forceLogoutAt so any session started with the OLD (possibly compromised — that's
            // often exactly why someone resets a password) stays valid gets kicked, everywhere,
            // on its very next request — same mechanism AuthController.logout/UserController.
            // disableUser already use for the internal app, reused here since Citizen rows share
            // the same User table (and verifyToken's forceLogoutAt check) as staff accounts.
            await citizen.user.update({ password: hashedPassword, forceLogoutAt: new Date() });
            await citizen.update({ resetPasswordCode: null, resetPasswordExpiresAt: null });

            return res.status(200).json({ message: 'Password reset successfully. You can now log in with your new password.' });
        } catch (error) {
            console.error('Error resetting password:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },
};
