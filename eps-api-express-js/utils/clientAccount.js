const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { randomInt } = require('crypto');
const { User, Citizen, ComplaintDetail, ClientInvite } = require('../models');
const transporter = require('./mailer');
const mailFrom = require('./mailFrom');

const TEMPLATE = path.join(__dirname, '../templates/client-account.html');

// A new temporary password for every send: lowercase letters and digits only, 8 long, with at least one of each. The
// look-alikes (0 o 1 l i) are left out, since it is read from an email and typed by hand.
const LETTERS = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const generatePassword = (length = 8) => {
    const all = LETTERS + DIGITS;
    const chars = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
    while (chars.length < length) chars.push(all[randomInt(all.length)]);
    // shuffle (Fisher-Yates) so the letter and the digit are not always first
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

const portalUrl = () => (process.env.PORTAL_URL || '').replace(/\/+$/, '');
const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The email with the account details. `isTest` marks a sample sent to check the look: it carries a banner and a made-up
// password, and no account is touched.
const sendAccountEmail = async ({ to, firstname, lastname, password, feedbackCount = 0, isTest = false }) => {
    const url = portalUrl();
    const portal = url ? `<a href="${escapeHtml(url)}" style="color:#004EA8; font-weight:700;">${escapeHtml(url)}</a>` : 'the eParticipation portal';
    const feedback = feedbackCount
        ? `Your ${feedbackCount === 1 ? 'earlier feedback is' : `${feedbackCount} earlier feedback are`} already in it.`
        : '';
    const banner = isTest
        ? `<tr><td style="padding:14px 40px 0 40px;"><div style="background-color:#FFF4DB; border:1px solid #F2D4A8; border-radius:10px; padding:10px 14px; font-size:13px; color:#8A5B00;"><b>This is a test.</b> The password below is made up and works for no account.</div></td></tr>`
        : '';

    const html = fs.readFileSync(TEMPLATE, 'utf8')
        .replace('{{ testBanner }}', () => banner)
        .replace('{{ feedback }}', () => escapeHtml(feedback))
        .replace('{{ portal }}', () => portal)
        .replace('{{ name }}', () => escapeHtml(`${firstname || ''} ${lastname || ''}`.trim() || 'there'))
        .replace('{{ email }}', () => escapeHtml(to))
        .replace('{{ password }}', () => escapeHtml(password));

    await transporter.sendMail({
        from: mailFrom(),
        to,
        subject: isTest ? 'Test: your eParticipation account is ready' : 'Your eParticipation account is ready',
        html,
    });
};

// Sends one client their account details, with a new temporary password, and records it. Only an account seeded from the
// previous system (Citizen.origin = 'legacy') is ever touched: one that people registered themselves chose its own
// password and must never be reset from here.
//   1. the email goes first: if it cannot be sent nothing changes and the failure is logged
//   2. then the new password is saved, the account is marked verified (the email reached the inbox, which is what
//      verifying proves) and must be changed at the first login
// Returns { ok, error? }.
const inviteClient = async (userId, sentBy = null) => {
    const citizen = await Citizen.findOne({ where: { userId }, include: { model: User, as: 'user' } });
    if (!citizen || citizen.origin !== 'legacy' || !citizen.user) {
        return { ok: false, error: 'That is not a seeded client account.' };
    }
    const password = generatePassword();
    const feedbackCount = await ComplaintDetail.count({ where: { userId } });

    try {
        await sendAccountEmail({
            to: citizen.email, firstname: citizen.user.firstname, lastname: citizen.user.lastname, password, feedbackCount,
        });
    } catch (error) {
        await ClientInvite.create({ userId, email: citizen.email, status: 'failed', error: String(error.message || error).slice(0, 500), sentBy });
        return { ok: false, error: error.message || 'The email could not be sent.' };
    }

    try {
        await citizen.user.update({
            password: await bcrypt.hash(password, 10),
            mustChangePassword: true,
            // any session from before (a resend) ends here
            forceLogoutAt: new Date(),
        });
        await citizen.update({ isVerified: true, verificationCode: null, verifiedAt: citizen.verifiedAt || new Date() });
        await ClientInvite.create({ userId, email: citizen.email, status: 'sent', sentBy });
        return { ok: true };
    } catch (error) {
        // the email is out but the account was not updated: say so, so it is sent again
        await ClientInvite.create({ userId, email: citizen.email, status: 'failed', error: `Sent, but saving the password failed: ${error.message}`.slice(0, 500), sentBy });
        return { ok: false, error: 'The email was sent but the account could not be updated. Send it again.' };
    }
};

module.exports = { generatePassword, sendAccountEmail, inviteClient };
