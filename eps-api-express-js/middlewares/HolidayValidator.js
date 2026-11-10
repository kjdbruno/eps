const { body, validationResult } = require("express-validator");

const CATEGORIES = ['regular', 'special', 'working', 'local'];

exports.validateForm = [
    body("date")
        .trim()
        .notEmpty().withMessage("date is required")
        .isDate().withMessage("date must be a valid date (YYYY-MM-DD)"),
    body("name")
        .trim()
        .notEmpty().withMessage("name is required"),
    body("category")
        .trim()
        .notEmpty().withMessage("category is required")
        .isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
