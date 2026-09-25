const { Op } = require("sequelize");
const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { User, Staff, Office } = require('../models');
const { logActivity } = require('../utils/activityLog');
const { getUserSocketIds } = require('../utils/connectedUsers');

const DEFAULT_AVATAR = '/uploads/avatar.png';
const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

let io;

// Flattens a User + its Staff/Office association into what the Preference > User table and its
// edit dialog actually need — avoids the frontend having to reach through `user.staff.office`
// on every row.
const shapeUser = (userInstance) => {
    const json = userInstance.toJSON();
    json.officeId = json.staff?.officeId || null;
    json.office = json.staff?.office?.alias || json.staff?.office?.name || null;
    delete json.staff;
    return json;
};

const findWithStaff = (where) => User.findOne({
    where,
    attributes: { exclude: ['password'] },
    include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }] }]
});

// This panel manages STAFF accounts only — citizens are created through the public
// complaint/feedback flows, never listed or editable here.
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: { [Op.ne]: 'citizen' } },
            attributes: { exclude: ['password'] },
            include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(users.map(shapeUser));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    const { firstname, lastname, username, password, role, officeId, avatar } = req.body;
    try {
        const userExist = await User.findOne({ where: { username } });
        if (userExist) {
            return res.status(403).json({
                errors: [{ type: "manual", value: "", msg: "Username is already in use!", path: "username", location: "body" }],
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            firstname,
            lastname,
            username,
            password: hashedPassword,
            role,
            avatar: avatar || DEFAULT_AVATAR,
            isActive: true
        });

        // Required for workstation (enforced by validateForm); optional for admin/super — an
        // admin whose account also belongs to an office (e.g. PIO) is a supported pattern
        // elsewhere in this app.
        if (officeId) {
            await Staff.create({ userId: user.id, officeId });
        }

        logActivity({
            module: 'user', entityId: user.id, action: 'created',
            actorId: req.userId, actorRole: req.role,
            description: `Created ${role} account "${username}"`
        });

        const created = await findWithStaff({ id: user.id });
        res.status(201).json({ message: "User created successfully.", user: shapeUser(created) });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, username, password, role, officeId, avatar } = req.body;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                errors: [{ type: "manual", value: "", msg: "User not found!", path: "id", location: "params" }],
            });
        }

        const userExist = await User.findOne({
            where: { username, id: { [Op.ne]: id } }
        });
        if (userExist) {
            return res.status(403).json({
                errors: [{ type: "manual", value: "", msg: "Username is already in use!", path: "username", location: "body" }],
            });
        }

        const updates = { firstname, lastname, username, role, avatar: avatar || user.avatar };
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }
        await user.update(updates);

        // Keep the Staff association in sync with the submitted office — upsert when one was
        // given, clear it when it wasn't (only reachable for admin/super; validateForm still
        // requires one for workstation) rather than ever leaving a stale office behind.
        const existingStaff = await Staff.findOne({ where: { userId: id } });
        if (officeId) {
            if (existingStaff) {
                await existingStaff.update({ officeId });
            } else {
                await Staff.create({ userId: id, officeId });
            }
        } else if (existingStaff) {
            await existingStaff.destroy();
        }

        logActivity({
            module: 'user', entityId: user.id, action: 'updated',
            actorId: req.userId, actorRole: req.role,
            description: `Updated ${role} account "${username}"`
        });

        const updated = await findWithStaff({ id });
        res.status(200).json({ message: "User updated successfully.", user: shapeUser(updated) });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ error: error.message });
    }
};

const disableUser = async (req, res) => {
    const { id } = req.params;
    if (String(req.userId) === String(id)) {
        return res.status(400).json({ error: "You cannot disable your own account." });
    }
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        // forceLogoutAt so a token issued before this moment can never be considered valid again
        // even if the account is later re-enabled (verifyToken checks this unconditionally) — on
        // top of isActive itself, which verifyToken already re-checks on every request regardless.
        await user.update({ isActive: false, forceLogoutAt: new Date() });

        // Kick any device this account is currently signed into RIGHT NOW, live — isActive alone
        // only stops them on their NEXT request (verifyToken), which could be a long wait for an
        // idle-but-open tab.
        getUserSocketIds(user.id).forEach(socketId => {
            io.to(socketId).emit('force_logout', { reason: 'account_disabled' });
        });

        logActivity({
            module: 'user', entityId: user.id, action: 'disabled',
            actorId: req.userId, actorRole: req.role,
            description: `Disabled account "${user.username}"`
        });

        const updated = await findWithStaff({ id });
        res.status(200).json({ message: "User disabled successfully.", user: shapeUser(updated) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const enableUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        await user.update({ isActive: true });

        logActivity({
            module: 'user', entityId: user.id, action: 'enabled',
            actorId: req.userId, actorRole: req.role,
            description: `Enabled account "${user.username}"`
        });

        const updated = await findWithStaff({ id });
        res.status(200).json({ message: "User enabled successfully.", user: shapeUser(updated) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Upload-then-reference: the dialog calls this the moment a file is picked, gets back a path,
// and includes that path in the plain-JSON create/update call that follows — the picture itself
// never has to ride along in the same request as the rest of the form. Resized/recompressed the
// same way ComplaintController/ResponseController process evidence, just written to a file under
// public/uploads (statically served — see server.js) instead of a base64 DB blob, since that's
// what User.avatar has always stored (a path string, not a blob).
const uploadAvatar = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file was uploaded.' });
    }
    try {
        const filename = `avatar-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
        await sharp(req.file.buffer)
            .resize({ width: 300, height: 300, fit: 'cover' })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 85 })
            .toFile(path.join(UPLOADS_DIR, filename));

        res.status(201).json({ path: `/uploads/${filename}` });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: error.message });
    }
};

// Needs io (disableUser emits a live 'force_logout') — same factory convention as every other
// controller that pushes socket events (TeamController, ResponseController, etc.), which this
// file didn't previously need until now.
module.exports = (_io) => {
    io = _io;
    return { getAllUsers, createUser, updateUser, disableUser, enableUser, uploadAvatar };
};
