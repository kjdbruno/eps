const { DeviceToken } = require('../models');

module.exports = {
    // Called by the mobile app right after login (and whenever FCM hands it a refreshed token —
    // see push_service.dart's onTokenRefresh) — POST /device-token { token, platform }.
    // Upserts on the token itself, not (userId, token): the same token can belong to a different
    // account after a device is reused (logged out, someone else logs in) — that must move the
    // token to the new owner, not throw a duplicate-key error.
    register: async (req, res) => {
        const { token, platform } = req.body;
        const userId = req.userId;

        if (!token || !['android', 'ios', 'web'].includes(platform)) {
            return res.status(400).json({ message: 'A device token and a valid platform are required.' });
        }

        try {
            const [row] = await DeviceToken.findOrCreate({
                where: { token },
                defaults: { userId, platform }
            });
            if (row.userId !== userId || row.platform !== platform) {
                await row.update({ userId, platform });
            }
            return res.status(200).json({ message: 'Device registered for push notifications.' });
        } catch (error) {
            console.error('Error registering device token:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },
    // Called right before logout (see auth_controller.dart) — a shared/reset device should stop
    // getting this account's pushes the moment it signs out, not keep receiving them until FCM
    // itself notices the app is gone. Not an error if the token was never registered (already
    // logged out elsewhere, or push was never enabled) — DELETE is idempotent either way.
    unregister: async (req, res) => {
        const { token } = req.body;
        const userId = req.userId;

        if (!token) {
            return res.status(400).json({ message: 'A device token is required.' });
        }

        try {
            await DeviceToken.destroy({ where: { token, userId } });
            return res.status(200).json({ message: 'Device unregistered.' });
        } catch (error) {
            console.error('Error unregistering device token:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },
};
