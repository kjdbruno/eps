const { Op } = require('sequelize');
const moment = require('moment');
const { User, Citizen, ComplaintDetail, ClientInvite } = require('../models');
const { inviteClient, sendAccountEmail, generatePassword } = require('../utils/clientAccount');
const { logActivity } = require('../utils/activityLog');
const { emitChanged } = require('../utils/realtime');
const { buildClientProfile } = require('../utils/clientProfile');

// The Client accounts page (Preference): the clients seeded from the previous system, and sending each of them their
// account details. Every send makes a new temporary password (see utils/clientAccount.js).

const DAILY_CAP = () => parseInt(process.env.CLIENT_INVITE_DAILY_CAP || '450', 10);
const PAUSE_MS = () => parseInt(process.env.CLIENT_INVITE_PAUSE_MS || '1200', 10);
const MAX_BATCH = 500;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// one batch at a time; the page asks for its progress
let run = { running: false, total: 0, done: 0, sent: 0, failed: 0, stoppedBecause: null, startedAt: null, finishedAt: null };

const sentInLastDay = () => ClientInvite.count({ where: { status: 'sent', createdAt: { [Op.gte]: moment().subtract(24, 'hours').toDate() } } });

// the legacy clients with where they stand
const loadClients = async () => {
    const citizens = await Citizen.findAll({
        where: { origin: 'legacy' },
        include: { model: User, as: 'user', attributes: ['id', 'firstname', 'lastname', 'isActive', 'lastLoginAt', 'mustChangePassword'] },
        order: [['userId', 'ASC']],
    });
    const invites = await ClientInvite.findAll({ order: [['id', 'ASC']], raw: true });
    const byUser = new Map();
    for (const i of invites) {
        if (!byUser.has(i.userId)) byUser.set(i.userId, []);
        byUser.get(i.userId).push(i);
    }
    const feedback = await ComplaintDetail.findAll({
        attributes: ['userId', [ComplaintDetail.sequelize.fn('COUNT', ComplaintDetail.sequelize.col('id')), 'n']],
        where: { userId: citizens.map(c => c.userId) }, group: ['userId'], raw: true,
    });
    const feedbackOf = new Map(feedback.map(f => [f.userId, Number(f.n)]));

    return citizens.map((c) => {
        const list = byUser.get(c.userId) || [];
        const sent = list.filter(i => i.status === 'sent');
        const lastSent = sent[sent.length - 1] || null;
        const last = list[list.length - 1] || null;
        const loggedAfter = lastSent && c.user.lastLoginAt && new Date(c.user.lastLoginAt) >= new Date(lastSent.createdAt);
        // not notified yet / notified / signed in since / the last try failed (and nothing was ever sent)
        const status = loggedAfter ? 'signed_in' : lastSent ? 'sent' : (last && last.status === 'failed' ? 'failed' : 'new');
        return {
            id: c.userId,
            firstname: c.user.firstname,
            lastname: c.user.lastname,
            email: c.email,
            phoneNo: c.phoneNo,
            isVerified: c.isVerified,
            isActive: c.user.isActive,
            feedbackCount: feedbackOf.get(c.userId) || 0,
            status,
            sentCount: sent.length,
            lastSentAt: lastSent ? lastSent.createdAt : null,
            lastError: last && last.status === 'failed' ? last.error : null,
            lastLoginAt: c.user.lastLoginAt,
            mustChangePassword: c.user.mustChangePassword,
        };
    });
};

const summarize = async (clients) => ({
    total: clients.length,
    new: clients.filter(c => c.status === 'new').length,
    sent: clients.filter(c => c.status === 'sent').length,
    signedIn: clients.filter(c => c.status === 'signed_in').length,
    failed: clients.filter(c => c.status === 'failed').length,
    sentToday: await sentInLastDay(),
    dailyCap: DAILY_CAP(),
});

exports.getClients = async (req, res) => {
    try {
        const clients = await loadClients();
        res.json({ clients, summary: await summarize(clients), run });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStatus = (req, res) => res.json(run);

// One client with everything on file: the account and what they did in each module (see utils/clientProfile.js)
exports.getClientProfile = async (req, res) => {
    try {
        const profile = await buildClientProfile(parseInt(req.params.id, 10));
        if (!profile) return res.status(404).json({ message: 'Client not found.' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Sends the next batch (the clients not yet notified, oldest first), or the ones picked (ids: a resend makes a new password).
//   limit    how many (the daily cap also applies)
//   dryRun   only say what would happen
exports.notifyClients = async (req, res) => {
    if (run.running) return res.status(409).json({ message: 'A batch is already being sent. Wait for it to finish.' });
    try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
        const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 100, 1), MAX_BATCH);

        const clients = await loadClients();
        let targets = ids.length
            ? clients.filter(c => ids.includes(c.id))
            : clients.filter(c => c.status === 'new' || c.status === 'failed');
        targets = targets.filter(c => c.isActive);

        const left = Math.max(DAILY_CAP() - await sentInLastDay(), 0);
        const allowed = Math.min(ids.length ? targets.length : limit, left, targets.length);
        const picked = targets.slice(0, allowed);

        if (req.body.dryRun) {
            return res.json({
                wouldSend: picked.length, waiting: targets.length, leftToday: left, dailyCap: DAILY_CAP(),
                cutByCap: targets.length > picked.length && picked.length === left,
            });
        }
        if (!picked.length) {
            return res.status(400).json({ message: left <= 0 ? 'The daily sending limit has been reached. Try again tomorrow.' : 'There is nobody to send to.' });
        }

        run = { running: true, total: picked.length, done: 0, sent: 0, failed: 0, stoppedBecause: null, startedAt: new Date(), finishedAt: null };
        res.status(202).json({ message: `Sending to ${picked.length} client${picked.length === 1 ? '' : 's'}.`, queued: picked.length });

        // in the background: one at a time, with a pause, and stop if the mailer keeps failing
        setImmediate(async () => {
            let failedInARow = 0;
            for (const c of picked) {
                const result = await inviteClient(c.id, req.userId);
                run.done++;
                if (result.ok) { run.sent++; failedInARow = 0; } else { run.failed++; failedInARow++; }
                if (run.done % 5 === 0) emitChanged('client', 'notified');
                if (failedInARow >= 5) { run.stoppedBecause = 'Five emails in a row could not be sent, so it stopped. Check the mail settings.'; break; }
                await sleep(PAUSE_MS());
            }
            run.running = false;
            run.finishedAt = new Date();
            logActivity({
                module: 'client', entityId: null, action: 'notified', actorId: req.userId, actorRole: req.role,
                description: `Sent account details to ${run.sent} client${run.sent === 1 ? '' : 's'}${run.failed ? ` (${run.failed} could not be sent)` : ''}`,
            });
            emitChanged('client', 'notified');
        });
    } catch (error) {
        run.running = false;
        res.status(500).json({ error: error.message });
    }
};

// One client again, with a new temporary password
exports.resendClient = async (req, res) => {
    try {
        const result = await inviteClient(parseInt(req.params.id, 10), req.userId);
        if (!result.ok) return res.status(502).json({ message: result.error });
        logActivity({
            module: 'client', entityId: parseInt(req.params.id, 10), action: 'notified', actorId: req.userId, actorRole: req.role,
            description: 'Sent account details again to a client',
        });
        emitChanged('client', 'notified');
        res.json({ message: 'Account details sent.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// A sample of the email to an address, to see how it looks: a made-up password, no account touched
exports.testEmail = async (req, res) => {
    try {
        await sendAccountEmail({
            to: req.body.email, firstname: 'Juan', lastname: 'Dela Cruz', password: generatePassword(), feedbackCount: 2, isTest: true,
        });
        res.json({ message: `A test email was sent to ${req.body.email}.` });
    } catch (error) {
        res.status(502).json({ message: `The test email could not be sent: ${error.message}` });
    }
};
