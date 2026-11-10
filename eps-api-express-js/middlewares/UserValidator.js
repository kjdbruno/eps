const { body, validationResult } = require("express-validator");

// This admin panel only ever creates/edits STAFF accounts (workstation/admin/super/monitoring) —
// citizen accounts are created through the public complaint/feedback flows instead, never here.
// 'monitoring' is read-only oversight (see models/user.js) — it doesn't change anything here,
// this list only governs which values the role dropdown may submit.
const STAFF_ROLES = ['workstation', 'admin', 'super', 'monitoring'];

// 09XXXXXXXXX, +639XXXXXXXXX or 639XXXXXXXXX (spaces and dashes are ignored)
const PH_MOBILE = /^(?:09|\+?639)\d{9}$/;
const normalizePhone = (value) => {
    const digits = String(value || '').replace(/[\s-]/g, '');
    if (!PH_MOBILE.test(digits)) return null;
    return `09${digits.slice(-9)}`;
};
exports.normalizePhone = normalizePhone;

exports.validateForm = (isCreate = true) => [
    body("firstname")
        .trim()
        .notEmpty().withMessage("First name is required"),
    body("lastname")
        .trim()
        .notEmpty().withMessage("Last name is required"),
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required"),
    // Required only on create — on update, an empty password means "leave it as-is". But
    // whenever one IS supplied (create, or an update that's actually changing it), it has to meet
    // the same minimum length either way — this used to only apply on create, so an update could
    // silently set an even-shorter password than a brand-new account could.
    body("password")
        .trim()
        .if(() => isCreate)
        .notEmpty().withMessage('Password is required'),
    body("password")
        .trim()
        .if((value) => !!value)
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    // A Philippine mobile number: 09XXXXXXXXX, or +639XXXXXXXXX / 639XXXXXXXXX (kept as 09XXXXXXXXX, see normalizePhone). Needed
    // to create an account; an older account without one can still be edited, but one that is typed has to be valid.
    body("phoneNo")
        .trim()
        .if(() => isCreate)
        .notEmpty().withMessage("Contact number is required"),
    body("phoneNo")
        .trim()
        .if((value) => !!value)
        .custom((value) => !!normalizePhone(value)).withMessage("Enter a Philippine mobile number, like 09171234567"),
    body("role")
        .trim()
        .notEmpty().withMessage("Role is required")
        .isIn(STAFF_ROLES).withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`),
    // An office is only mandatory for a workstation account — every module in this app locks a
    // workstation user out entirely if they have no office (see resolveOfficeScope across
    // Complaint/Feedback/Discussion/Poll), so one with no office would be a permanently broken
    // account. Admin/super may optionally have one too (e.g. a PIO-department admin) but it's not
    // required for them.
    body("officeId")
        .if((value, { req }) => req.body.role === 'workstation')
        .notEmpty().withMessage("Office is required for a workstation account"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
