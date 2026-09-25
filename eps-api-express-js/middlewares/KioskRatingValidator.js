const { body, validationResult } = require("express-validator");

exports.validateForm = () => [
    body("email")
        .optional()
    body("officeId")
        .trim()
        .notEmpty().withMessage("Office is required"),
    body("type")
        .trim()
        .notEmpty().withMessage("Client type is required"),
    body("sexId")
        .trim()
        .notEmpty().withMessage("Sex is required"),
    body("age")
        .optional()
    body("residence")
        .optional()
    body("serviceAvailed")
        .optional()
    body("cc1")
        .trim()
        .notEmpty().withMessage("CC1 is required"),
    body("cc2")
        .trim()
        .notEmpty().withMessage("CC2 is required"),
    body("cc3")
        .trim()
        .notEmpty().withMessage("CC3 is required"),
    body("sqd0")
        .optional(),
    body("sqd1")
        .optional(),
    body("sqd2")
        .optional(),
    body("sqd3")
        .optional(),
    body("sqd4")
        .optional(),
    body("sqd5")
        .optional(),
    body("sqd6")
        .optional(),
    body("sqd7")
        .optional(),
    body("sqd8")
        .optional(),
    body("suggestion")
        .optional()
        .trim()
        .notEmpty().withMessage("Suggestion is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];