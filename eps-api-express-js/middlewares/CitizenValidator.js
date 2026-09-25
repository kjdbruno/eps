const { body, validationResult } = require("express-validator");

const finalize = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

exports.validateRegister = [
    body("firstname")
        .trim()
        .notEmpty().withMessage("Firstname is required"),
    body("lastname")
        .trim()
        .notEmpty().withMessage("Lastname is required"),
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    body("phoneNo")
        .trim()
        .notEmpty().withMessage("Contact number is required")
        .isLength({ min: 10, max: 15 }).withMessage("Contact number must be between 10 and 15 digits")
        .isNumeric().withMessage("Contact number must be numeric"),
    body("password")
        .trim()
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    finalize,
];

exports.validateVerify = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    body("code")
        .trim()
        .notEmpty().withMessage("Verification code is required")
        .isLength({ min: 6, max: 6 }).withMessage("Verification code must be 6 digits"),
    finalize,
];

exports.validateEmailOnly = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    finalize,
];

exports.validateLogin = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    body("password")
        .trim()
        .notEmpty().withMessage("Password is required"),
    finalize,
];

exports.validateVerifyResetCode = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    body("code")
        .trim()
        .notEmpty().withMessage("Reset code is required")
        .isLength({ min: 6, max: 6 }).withMessage("Reset code must be 6 digits"),
    finalize,
];

exports.validateResetPassword = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),
    body("code")
        .trim()
        .notEmpty().withMessage("Reset code is required")
        .isLength({ min: 6, max: 6 }).withMessage("Reset code must be 6 digits"),
    body("newPassword")
        .trim()
        .notEmpty().withMessage("New password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    finalize,
];
