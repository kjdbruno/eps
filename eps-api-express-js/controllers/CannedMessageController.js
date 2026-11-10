const { Op } = require("sequelize");
const { CannedMessage } = require('../models');
const { logActivity } = require('../utils/activityLog');

// Ready-made replies for the Conversation tab, managed by a supervisor under Preference > Canned messages — same shape
// as HolidayController.js (getAll / create / update / disable / enable).

// A super/admin sees every message (they manage them); an office sees only the ones switched on, to pick from.
exports.getAllCannedMessages = async (req, res) => {
    try {
        const managing = ['super', 'admin'].includes(req.role) && req.query.active !== '1';
        const messages = await CannedMessage.findAll({
            where: managing ? {} : { isActive: true },
            order: [['title', 'ASC']],
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const duplicateTitle = (value) => ({
    errors: [{ type: "manual", value, msg: "A canned message with that title already exists!", path: "title", location: "body" }],
});

exports.createCannedMessage = async (req, res) => {
    const { title, message } = req.body;
    try {
        const exists = await CannedMessage.findOne({ where: { title } });
        if (exists) return res.status(403).json(duplicateTitle(title));

        const canned = await CannedMessage.create({ title, message });

        logActivity({
            module: 'canned', entityId: canned.id, action: 'created',
            actorId: req.userId, actorRole: req.role,
            description: `Added canned message "${title}"`
        });

        res.status(201).json({ message: "Canned message created successfully.", canned });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateCannedMessage = async (req, res) => {
    const { id } = req.params;
    const { title, message } = req.body;
    try {
        const canned = await CannedMessage.findByPk(id);
        if (!canned) {
            return res.status(404).json({
                errors: [{ type: "manual", value: "", msg: "Canned message not found!", path: "title", location: "body" }],
            });
        }
        const exists = await CannedMessage.findOne({ where: { title, id: { [Op.ne]: id } } });
        if (exists) return res.status(403).json(duplicateTitle(title));

        await canned.update({ title, message });

        logActivity({
            module: 'canned', entityId: canned.id, action: 'updated',
            actorId: req.userId, actorRole: req.role,
            description: `Updated canned message "${title}"`
        });

        res.status(200).json({ message: "Canned message updated successfully.", canned });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const setActive = (isActive) => async (req, res) => {
    const { id } = req.params;
    try {
        const canned = await CannedMessage.findByPk(id);
        if (!canned) return res.status(404).json({ error: "Canned message not found." });
        await canned.update({ isActive });

        logActivity({
            module: 'canned', entityId: canned.id, action: isActive ? 'enabled' : 'disabled',
            actorId: req.userId, actorRole: req.role,
            description: `${isActive ? 'Enabled' : 'Disabled'} canned message "${canned.title}"`
        });

        res.status(200).json({ message: `Canned message ${isActive ? 'enabled' : 'disabled'} successfully.`, canned });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.disableCannedMessage = setActive(false);
exports.enableCannedMessage = setActive(true);
