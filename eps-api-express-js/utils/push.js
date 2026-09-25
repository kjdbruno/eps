// Push notifications (Firebase Cloud Messaging) — the mobile app's counterpart to the in-app
// bell (Notification + Socket.IO, see utils/notifySocket.js). Reaches a device even when the app
// isn't open/connected; the in-app bell only works while it is. Same "skip cleanly when not
// configured" convention as utils/llm.js — a fresh dev/CI checkout with no Firebase project set
// up just never sends a push, rather than crashing every notification-creating request.
//
// Setup (see mobile app's own Firebase setup notes for the client side):
//   1. Firebase console → Project Settings → Service Accounts → Generate new private key.
//   2. Put the downloaded JSON file somewhere on this server (NOT committed to the repo — it's a
//      credential) and point FIREBASE_SERVICE_ACCOUNT_PATH at it, OR paste the whole JSON into
//      FIREBASE_SERVICE_ACCOUNT (one env var, e.g. for a host where only env vars are settable).
const admin = require('firebase-admin');
const fs = require('fs');

let app = null;
let initAttempted = false;

const init = () => {
    if (initAttempted) return app;
    initAttempted = true;
    try {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            credential = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
        } else {
            return null; // Not configured — every caller below just no-ops.
        }
        app = admin.initializeApp({ credential: admin.credential.cert(credential) });
        console.log('Firebase Admin (push notifications) initialized.');
    } catch (error) {
        console.error('Failed to initialize Firebase Admin — push notifications disabled:', error.message);
        app = null;
    }
    return app;
};

// True once a service account is configured AND valid — callers that must not do unnecessary
// work (e.g. looking up device tokens) for a call that couldn't send anyway can check this first,
// same convention as llm.js's hasLLM().
const hasPush = () => !!init();

// Sends one push to every device this user is registered on (see models/devicetoken.js — a
// citizen or staff account can have several). Best-effort and silent on failure, same convention
// as notifyUser/notifyAdmins elsewhere — a push failure must never break the request that
// triggered it. `data` values must be strings (FCM's own requirement) — stringify anything else
// before passing it in.
const sendPushToUser = async (userId, { title = 'ePS', body, data = {} } = {}) => {
    if (!body) return;
    const firebaseApp = init();
    if (!firebaseApp) return;

    try {
        const { DeviceToken } = require('../models');
        const tokens = await DeviceToken.findAll({ where: { userId }, attributes: ['id', 'token'] });
        if (!tokens.length) return;

        const response = await admin.messaging(firebaseApp).sendEachForMulticast({
            tokens: tokens.map(t => t.token),
            notification: { title, body },
            data,
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
        });

        // A token that's uninstalled the app, expired, or was never valid comes back with one of
        // these two error codes — prune it so it stops costing a (still-free, but pointless) send
        // on every future notification for this user.
        const deadTokenIds = [];
        response.responses.forEach((r, i) => {
            const code = r.error?.code;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                deadTokenIds.push(tokens[i].id);
            }
        });
        if (deadTokenIds.length) {
            await DeviceToken.destroy({ where: { id: deadTokenIds } });
        }
    } catch (error) {
        console.error(`Failed to send push notification to user ${userId}:`, error.message);
    }
};

module.exports = { hasPush, sendPushToUser };
