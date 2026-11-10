const { body, validationResult } = require("express-validator");

exports.validateForm = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required"),
    body("password")
        .trim()
        // signing in only needs a password to check; the length rule belongs to choosing one (UserValidator), and an
        // account made by a seeder may have a short one (the office code)
        .notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
