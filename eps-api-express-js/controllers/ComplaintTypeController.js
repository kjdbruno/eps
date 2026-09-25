const { Op } = require("sequelize");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { ComplaintType } = require('../models');

exports.getCategory = async (req, res) => {
    try {
        const categories = await ComplaintType.findAll({
            where: {
                isActive: true
            }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
