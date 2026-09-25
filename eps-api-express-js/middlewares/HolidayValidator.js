const { body, validationResult } = require("express-validator");

exports.validateForm = [
    body("date")
        .trim()
        .notEmpty().withMessage("date is required")
        .isDate().withMessage("date must be a valid date (YYYY-MM-DD)"),
    body("name")
        .trim()
        .notEmpty().withMessage("name is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
