const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { User, Citizen, ComplaintOffice, Office } = require('../models');
const transporter = require('./mailer');
const mailFrom = require('./mailFrom');
const otpGenerator = require('./otp');

const TEMPLATE = path.join(__dirname, '../templates/staff-filed.html');

// The password every account made for a walk-in citizen starts with. It is only usable after the
// account is verified with the code that goes to the same inbox, and the email tells the citizen to
// replace it. Set CITIZEN_DEFAULT_PASSWORD to change it (8 characters or more, like any password).
const defaultPassword = () => process.env.CITIZEN_DEFAULT_PASSWORD || 'sfcity98';

// Where the citizen opens the portal; when unset, the email names the portal without a link.
const portalUrl = () => (process.env.PORTAL_URL || '').replace(/\/+$/, '');

const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The account a staff-filed feedback belongs to, so the citizen can follow it.
//   - no account for that email   -> a new, unverified one, with the default password + a verification code
//   - unverified one already there -> a fresh code and the default password (nobody can have used it:
//                                     signing in is blocked until the code that goes to this inbox is entered)
//   - verified one already there   -> left exactly as it is; the feedback is simply added to it
// Returns { user, needsVerify, code, password } (code/password only when needsVerify).
const provisionCitizenAccount = async ({ firstname, lastname, email, contactNo }) => {
    const existing = await Citizen.findOne({ where: { email }, include: { model: User, as: 'user' } });

    if (existing && existing.isVerified) {
        return { user: existing.user, needsVerify: false };
    }

    const code = otpGenerator();
    const password = defaultPassword();
    const hashed = await bcrypt.hash(password, 10);

    if (existing) {
        await existing.user.update({ password: hashed });
        await existing.update({ verificationCode: code });
        return { user: existing.user, needsVerify: true, code, password };
    }

    const user = await User.create({ firstname, lastname, password: hashed, role: 'citizen' });
    await Citizen.create({ userId: user.id, email, phoneNo: contactNo || '', verificationCode: code, isVerified: false });
    return { user, needsVerify: true, code, password };
};

const box = (label, value, big = false) => `
              <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8493ac;">${label}</div>
              <div style="${big ? 'font-size:26px; font-weight:800; color:#004EA8; letter-spacing:6px;' : 'font-size:15px; font-weight:700; color:#1e2a44;'} padding:2px 0 12px 0;">${escapeHtml(value)}</div>`;

const stepList = (items) => `<ol style="margin:0; padding-left:20px; font-size:14px; line-height:1.7; color:#4c5c79;">${items.map(i => `<li style="padding-bottom:6px;">${i}</li>`).join('')}</ol>`;

// Emails the citizen what was filed and how to follow it. Best-effort: the feedback is already
// saved, so a mailer failure is reported back (false) rather than thrown. Returns whether it was sent.
const sendStaffFiledEmail = async ({ complaint, email, firstname, lastname, account }) => {
    try {
        const links = await ComplaintOffice.findAll({ where: { complaintId: complaint.id, isActive: true }, attributes: ['officeId'] });
        const offices = links.length
            ? await Office.findAll({ where: { id: links.map(l => l.officeId) }, attributes: ['name', 'alias'] })
            : [];
        const officeText = offices.length
            ? offices.map(o => o.alias ? `${o.name} (${o.alias})` : o.name).join(', ')
            : 'It is being routed to the office that handles it.';

        const url = portalUrl();
        const portal = url ? `<a href="${escapeHtml(url)}" style="color:#004EA8; font-weight:700;">${escapeHtml(url)}</a>` : 'the eParticipation portal';

        let intro; let credentials = ''; let stepsTitle; let steps; let closing;
        if (account.needsVerify) {
            intro = 'So that you can follow it, we also created an eParticipation account for you. Your sign-in details and the code that verifies the account are below.';
            credentials = `
          <tr>
            <td style="padding:20px 40px 8px 40px;">
              <div style="background-color:#f2f6fd; border:2px dashed #004EA8; border-radius:12px; padding:16px 20px;">
                ${box('Your email (username)', email)}
                ${box('Default password', account.password)}
                ${box('Verification code', account.code, true)}
              </div>
            </td>
          </tr>`;
            stepsTitle = 'How to check the status of your feedback';
            steps = stepList([
                `Open ${portal} and choose <b>Log in</b>.`,
                'Log in with your email and the <b>default password</b> above.',
                'The system will ask you to <b>verify your account</b>. Enter the <b>verification code</b> above. You only need to do this once.',
                'Once you are in, open <b>Feedback</b> from the menu. Your feedback, <b>' + escapeHtml(complaint.referenceNo) + '</b>, is listed there, with its status and every reply from the offices.',
                'For your security, replace the default password: on the log in page choose <b>Forgot password</b> and set a new one.',
            ]);
            closing = 'Keep this email private. Anyone with the code and the default password could open your account until you change it.';
        } else {
            intro = 'This feedback was added to your existing eParticipation account.';
            stepsTitle = 'How to check the status of your feedback';
            steps = stepList([
                `Open ${portal} and choose <b>Log in</b>.`,
                'Log in with your email and your usual password.',
                'Open <b>Feedback</b> from the menu. Your feedback, <b>' + escapeHtml(complaint.referenceNo) + '</b>, is listed there, with its status and every reply from the offices.',
            ]);
            closing = 'Forgot your password? Choose <b>Forgot password</b> on the log in page.';
        }

        const html = fs.readFileSync(TEMPLATE, 'utf8')
            .replace('{{ credentials }}', () => credentials)
            .replace('{{ steps }}', () => steps)
            .replace('{{ closing }}', () => closing)
            .replace('{{ stepsTitle }}', () => stepsTitle)
            .replace('{{ intro }}', () => escapeHtml(intro))
            .replace('{{ name }}', () => escapeHtml(`${firstname} ${lastname}`.trim()))
            .replace('{{ reference }}', () => escapeHtml(complaint.referenceNo))
            .replace('{{ filedOn }}', () => escapeHtml(moment(complaint.createdAt).format('MMMM DD, YYYY hh:mm A')))
            .replace('{{ offices }}', () => escapeHtml(officeText))
            .replace('{{ content }}', () => escapeHtml(complaint.content));

        await transporter.sendMail({
            from: mailFrom(),
            to: email,
            subject: `Your feedback ${complaint.referenceNo} was filed`,
            html,
        });
        return true;
    } catch (error) {
        console.error(`Failed to email the filing details for complaint ${complaint.id}:`, error.message);
        return false;
    }
};

module.exports = { provisionCitizenAccount, sendStaffFiledEmail, defaultPassword };
