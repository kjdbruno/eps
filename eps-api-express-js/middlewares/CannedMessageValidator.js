const { body, validationResult } = require("express-validator");

exports.validateForm = [
    body("title")
        .trim()
        .notEmpty().withMessage("title is required")
        .isLength({ max: 60 }).withMessage("title must be 60 characters or less"),
    body("message")
        .trim()
        .notEmpty().withMessage("message is required")
        .isLength({ min: 5 }).withMessage("message must be at least 5 characters")
        .isLength({ max: 1000 }).withMessage("message must be 1000 characters or less"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
