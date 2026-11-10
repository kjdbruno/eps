const { Op } = require("sequelize");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { Office } = require('../models');
const { logActivity } = require('../utils/activityLog');
const { buildOfficeProfile } = require('../utils/officeProfile');

exports.getAllOffices = async (req, res) => {
    try {
        const offices = await Office.findAll();
        res.json(offices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// One office with everything on file: its staff, feedback, CSM reports, discussions and surveys (see utils/officeProfile.js)
exports.getOfficeProfile = async (req, res) => {
    try {
        const profile = await buildOfficeProfile(parseInt(req.params.id, 10));
        if (!profile) return res.status(404).json({ message: 'Office not found.' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOffice = async (req, res) => {
    try {
        const offices = await Office.findAll({
            where: {
                isActive: true
            }
        });
        res.json(offices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createOffice = async (req, res) => {
    const { name, alias, email, mandate } = req.body;
    try {
        const officeExist = await Office.findOne({
            where: {
                [Op.or]: [{ name }, { alias }, { email } ]
            }
        });
        if (officeExist) {
            return res.status(403).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "Office already exists!",
                    path: "name",
                    location: "body",
                }],
            });
        }
        const office = await Office.create({ name, alias, email, mandate: mandate || null });

        logActivity({
            module: 'office', entityId: office.id, action: 'created',
            actorId: req.userId, actorRole: req.role,
            description: `Created office "${office.name}"`
        });

        res.status(201).json({ message: "Office created successfully.", office });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateOffice = async (req, res) => {

    const { id } = req.params;
    const { name, alias, email, mandate } = req.body;

    try {
        const office = await Office.findByPk(id);
        if (!office) {
            return res.status(403).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "Office not found!",
                    path: "name",
                    location: "body",
                }],
            });
        }
        const officeExist = await Office.findOne({
            where: {
                [Op.or]: [{ name }, { alias }, { email } ],
                id: { [Op.ne]: id }
            },
        });
        if (officeExist) {
            return res.status(403).json({
                errors: [{
                    type: "manual",
                    value: "",
                    msg: "Office is already in use by another office!",
                    path: "name",
                    location: "body",
                }],
            });
        }
        await office.update({ name, alias, email, mandate: mandate || null });

        logActivity({
            module: 'office', entityId: office.id, action: 'updated',
            actorId: req.userId, actorRole: req.role,
            description: `Updated office "${office.name}"`
        });

        res.status(200).json({ message: "Office updated successfully.", office });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.disableOffice = async (req, res) => {

    const { id } = req.params;
    const isActive = false;
  
    try {
        const office = await Office.findByPk(id);
        if (!office) {
            return res.status(404).json({ error: "Office not found." });
        }
        await office.update({ isActive });

        logActivity({
            module: 'office', entityId: office.id, action: 'disabled',
            actorId: req.userId, actorRole: req.role,
            description: `Disabled office "${office.name}"`
        });

        res.status(200).json({ message: "Office disabled successfully.", office });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.enableOffice = async (req, res) => {

    const { id } = req.params;
    const isActive = true;
  
    try {
        const office = await Office.findByPk(id);
        if (!office) {
            return res.status(404).json({ error: "Office not found." });
        }
        await office.update({ isActive });

        logActivity({
            module: 'office', entityId: office.id, action: 'enabled',
            actorId: req.userId, actorRole: req.role,
            description: `Enabled office "${office.name}"`
        });

        res.status(200).json({ message: "Office enabled successfully.", office });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};