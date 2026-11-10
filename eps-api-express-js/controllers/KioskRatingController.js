const { Op } = require("sequelize");
const { KioskRating, Rating, Office } = require('../models');
const { tagReport } = require('../utils/sentiment');
let io; // Declare io variable

module.exports = (_io) => {
    io = _io;

    return {
        createKioskRating: async (req, res) => {
            const {
                email,
                officeId,
                type,
                sex,
                age,
                residence,
                serviceAvailed,
                cc1,
                cc2,
                cc3,
                sqd0,
                sqd1,
                sqd2,
                sqd3,
                sqd4,
                sqd5,
                sqd6,
                sqd7,
                sqd8,
                suggestion,
            } = req.body;
            try {
                // save kiosk rating
                const kiosk = await KioskRating.create({
                    email,
                    officeId,
                    type,
                    date: new Date(),
                    // The model column is `sex` (ENUM Male/Female/Others) — this used to destructure
                    // `sexId`, a field that doesn't exist on KioskRating at all, so every kiosk
                    // submission silently ignored whatever sex the citizen picked and fell back to
                    // the column's 'Others' default regardless.
                    sex,
                    age,
                    residence,
                    serviceAvailed,
                    cc1,
                    cc2,
                    cc3,
                    sqd0,
                    sqd1,
                    sqd2,
                    sqd3,
                    sqd4,
                    sqd5,
                    sqd6,
                    sqd7,
                    sqd8,
                    entryFrom: 'kiosk',
                    suggestion
                });
                //save rating
                const ratings = [sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8];
                const validRatings = ratings.filter(r => r !== 0);
                const total = validRatings.reduce((sum, r) => sum + r, 0);
                const rate = validRatings.length ? total / validRatings.length : 0;

                const rating = await Rating.create({
                    officeId,
                    rating: rate
                });

                // io.emit('assessmentCreated', { message: "assessment created successfully.", queue, assessment, item, payor });
                
                tagReport(kiosk.id); // read in the background
                res.status(201).json({ message: "Rating Created Successfully.", kiosk, rating });

            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },
        
    };
};
