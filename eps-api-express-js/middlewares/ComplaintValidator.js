const { body, validationResult } = require("express-validator");

// Same isAnonymous truthiness ComplaintController.sendOTP itself uses (isTruthy there) — kept in
// sync here so what the validator lets through and what the controller does with it never diverge.
// multipart/form-data (this route takes file uploads) always arrives as strings, hence 'true' too.
const isAnonymousValue = (req) => req.body.isAnonymous === true || req.body.isAnonymous === 'true';

exports.validateForm = [
    // Only truly optional when filing anonymously — the comments here used to say that but the
    // rule itself was unconditional either way, so a non-anonymous complaint could be submitted
    // with no name at all as long as the request bypassed the frontend's own (correct) check.
    body("firstname")
        .if((value, { req }) => !isAnonymousValue(req))
        .trim()
        .notEmpty().withMessage("Firstname is required when not filing anonymously")
        .isString().withMessage("Firstname must be a string"),
    body("firstname")
        .if((value, { req }) => isAnonymousValue(req))
        .optional({ checkFalsy: true })
        .trim()
        .isString().withMessage("Firstname must be a string"),

    body("lastname")
        .if((value, { req }) => !isAnonymousValue(req))
        .trim()
        .notEmpty().withMessage("Lastname is required when not filing anonymously")
        .isString().withMessage("Lastname must be a string"),
    body("lastname")
        .if((value, { req }) => isAnonymousValue(req))
        .optional({ checkFalsy: true })
        .trim()
        .isString().withMessage("Lastname must be a string"),

    body("contactNo")
        .trim()
        .notEmpty().withMessage("Contact number is required")
        .isLength({ min: 10, max: 15 }).withMessage("Contact number must be between 10 and 15 digits")
        .isNumeric().withMessage("Contact number must be numeric"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address"),

    body("content")
        .trim()
        .notEmpty().withMessage("Content is required")
        .isString().withMessage("Content must be a string"),

    // Captured client-side (browser/device geolocation) when the citizen's own form loads —
    // mandatory for a guest filing (this validator), and for a signed-in citizen's own filing
    // (checked inline in ComplaintController.createAccountComplaint, which has no shared
    // validator middleware). NOT required for a staff-filed complaint (createStaffComplaint) —
    // staff may be relaying a phone/walk-in report with no citizen present to grant it.
    body("latitude")
        .notEmpty().withMessage("Location is required to file feedback.")
        .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude."),
    body("longitude")
        .notEmpty().withMessage("Location is required to file feedback.")
        .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude."),

    // Final middleware to send validation results
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors.array()
        });
        }
        next();
    },
];
