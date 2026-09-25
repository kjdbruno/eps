const { body, validationResult } = require("express-validator");

exports.validateForm = [
    body("name")
        .trim()
        .notEmpty().withMessage("name is required"),
    body("alias")
        .trim()
        .notEmpty().withMessage("alias is required"),
    body("email")
        .trim()
        .notEmpty().withMessage("email is required")
        .isEmail().withMessage("Invalid email address"),
    body("mandate")
        .optional({ checkFalsy: true })
        .trim()
        .isString().withMessage("mandate must be text"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
