const express = require('express');
const multer = require('multer');

const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');
const { validateForm } = require('../middlewares/UserValidator');

// Memory storage — the controller processes the buffer with sharp before it ever touches disk,
// same convention as ComplaintController/ResponseController's evidence uploads.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed.'));
    }
});

module.exports = (UserController) => {
    const router = express.Router();

    // Staff-account management is a super-only module (admin is deliberately excluded — an admin
    // account creating/editing other accounts, including super ones, was judged too much reach for
    // that role). This used to be verifyToken-only, which let ANY authenticated account (including
    // workstation) create/promote/disable any user, itself included.
    router.get('/', verifyToken, requireRole('super'), UserController.getAllUsers);
    router.post('/', verifyToken, requireRole('super'), validateForm(true), UserController.createUser);
    router.post('/:id/update', verifyToken, requireRole('super'), validateForm(false), UserController.updateUser);
    router.post('/:id/disable', verifyToken, requireRole('super'), UserController.disableUser);
    router.post('/:id/enable', verifyToken, requireRole('super'), UserController.enableUser);
    // Separate upload-then-reference step — the dialog uploads the picked image here first and gets
    // back a path, then sends that path along with the rest of the (plain JSON) create/update body.
    // Keeps create/update as regular JSON endpoints rather than reworking them for multipart.
    router.post('/avatar', verifyToken, requireRole('super'), upload.single('avatar'), UserController.uploadAvatar);

    return router;
};