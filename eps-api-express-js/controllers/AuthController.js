const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const os = require("os");
const { User, Staff, Office } = require("../models");

let io;

// A precomputed hash with no matching plaintext — bcrypt.compare()'d against whenever the
// username doesn't exist, so a login attempt takes roughly the same time and returns the exact
// same "Invalid username or password" response either way. Without this, "User not found" (fast,
// no hash to compare) vs "Invalid credentials" (after a real bcrypt compare) is both a message
// AND a timing oracle for enumerating valid usernames. Generated once at startup, not per request.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', 10);

module.exports = (_io) => {
    io = _io;

    return {
        login: async (req, res) => {
            const { username, password, rememberMe } = req.body;
            try {
                const user = await User.findOne({
                    where: {
                        username: username
                    },
                    include: {
                        model: Staff,
                        as: 'staff',
                        include: {
                            model: Office,
                            as: 'office'
                        }
                    }
                });

                // Always run a real bcrypt.compare, win or lose, against either the account's own
                // hash or the dummy one above — see DUMMY_HASH for why.
                const isMatch = await bcrypt.compare(password || '', user?.password || DUMMY_HASH);
                if (!user || !isMatch) {
                    return res.status(401).json({
                        errors: [
                            {
                                type: "field",
                                value: "",
                                msg: "Invalid username or password.",
                                path: "username",
                                location: "body",
                            },
                        ],
                    });
                }
                // Only reachable once the password is confirmed correct — revealing "disabled"
                // to anyone who doesn't already know the password would itself be an account-status
                // oracle. Disabling a staff account (UserController.disableUser) used to be purely
                // cosmetic before this — login never checked it at all, so a terminated/suspended
                // account could still sign in and get a fresh 4h token.
                if (!user.isActive) {
                    return res.status(403).json({
                        errors: [
                            {
                                type: "field",
                                value: "",
                                msg: "This account has been disabled.",
                                path: "username",
                                location: "body",
                            },
                        ],
                    });
                }
                // "Remember me" controls how long the new token stays valid, not where it's stored
                // (both cases keep using localStorage — see auth-store.js) — unchecked keeps the
                // original 4h workday-length session; checked issues a 30-day one.
                const token = jwt.sign(
                    { id: user.id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: rememberMe ? "30d" : "4h" }
                );
                const { password: _password, ...safeUser } = user.toJSON();
                res.json({ user: safeUser, token });
            } catch (error) {
                console.error("Login error:", error); // Log the error for debugging
                res.status(500).json({ error: error.message || "An unexpected error occurred during login." }); // Use 500 for server errors
            }
        },
        // New logout endpoint for JWT (optional but good practice)
        // For JWTs, logout is primarily client-side token deletion.
        // This server-side endpoint could be used for blacklist/revocation if you implement that.
        // Sets the same forceLogoutAt marker TeamController.forceLogout uses for an admin-initiated
        // kick — verifyToken (AuthMiddleware.js) rejects any token issued before it, on every
        // subsequent request, everywhere. Self-service logout used to be purely client-side: the
        // token itself stayed fully valid on the server for the rest of its 4h lifetime regardless
        // of whether the browser deleted its own copy — a real gap if that token had ever leaked.
        // Best-effort: even if this DB write fails, the client's own try/catch still clears its
        // local session either way (see auth-store.js's logout action).
        logout: async (req, res) => {
            try {
                if (req.userId) {
                    await User.update({ forceLogoutAt: new Date() }, { where: { id: req.userId } });
                }
                res.status(200).json({ message: 'Logged out successfully.' });
            } catch (error) {
                console.error('Logout error:', error);
                res.status(200).json({ message: 'Logged out successfully.' });
            }
        },

        // A new endpoint to check if the token is still valid (protected endpoint)
        checkToken: (req, res) => {
            // If verifyToken middleware passed, the token is valid
            // You can return user details or a simple success message
            res.json({ message: 'Token is valid', userId: req.userId });
        }
    };
};
