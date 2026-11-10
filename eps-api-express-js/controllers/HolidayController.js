const { Op } = require("sequelize");
const { Holiday } = require('../models');
const { logActivity } = require('../utils/activityLog');

// Admin-managed calendar consulted by utils/businessHours.js when computing acknowledgement
// deadlines — mirrors OfficeController.js's shape (getAll/create/update/disable/enable).

exports.getAllHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.findAll({ order: [['date', 'ASC']] });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createHoliday = async (req, res) => {
    const { date, name, category } = req.body;
    try {
        const holidayExist = await Holiday.findOne({ where: { date } });
        if (holidayExist) {
            return res.status(403).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "A holiday is already recorded for that date!",
                    path: "date",
                    location: "body",
                }],
            });
        }
        const holiday = await Holiday.create({ date, name, category });

        logActivity({
            module: 'holiday', entityId: holiday.id, action: 'created',
            actorId: req.userId, actorRole: req.role,
            description: `Added holiday "${name}" (${date})`
        });

        res.status(201).json({ message: "Holiday created successfully.", holiday });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateHoliday = async (req, res) => {
    const { id } = req.params;
    const { date, name, category } = req.body;

    try {
        const holiday = await Holiday.findByPk(id);
        if (!holiday) {
            return res.status(404).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "Holiday not found!",
                    path: "date",
                    location: "body",
                }],
            });
        }
        const holidayExist = await Holiday.findOne({
            where: { date, id: { [Op.ne]: id } },
        });
        if (holidayExist) {
            return res.status(403).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "That date is already used by another holiday!",
                    path: "date",
                    location: "body",
                }],
            });
        }
        await holiday.update({ date, name, category });

        logActivity({
            module: 'holiday', entityId: holiday.id, action: 'updated',
            actorId: req.userId, actorRole: req.role,
            description: `Updated holiday "${name}" (${date})`
        });

        res.status(200).json({ message: "Holiday updated successfully.", holiday });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.disableHoliday = async (req, res) => {
    const { id } = req.params;
    try {
        const holiday = await Holiday.findByPk(id);
        if (!holiday) {
            return res.status(404).json({ error: "Holiday not found." });
        }
        await holiday.update({ isActive: false });

        logActivity({
            module: 'holiday', entityId: holiday.id, action: 'disabled',
            actorId: req.userId, actorRole: req.role,
            description: `Disabled holiday "${holiday.name}"`
        });

        res.status(200).json({ message: "Holiday disabled successfully.", holiday });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.enableHoliday = async (req, res) => {
    const { id } = req.params;
    try {
        const holiday = await Holiday.findByPk(id);
        if (!holiday) {
            return res.status(404).json({ error: "Holiday not found." });
        }
        await holiday.update({ isActive: true });

        logActivity({
            module: 'holiday', entityId: holiday.id, action: 'enabled',
            actorId: req.userId, actorRole: req.role,
            description: `Enabled holiday "${holiday.name}"`
        });

        res.status(200).json({ message: "Holiday enabled successfully.", holiday });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
