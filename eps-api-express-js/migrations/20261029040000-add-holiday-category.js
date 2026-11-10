'use strict';

// What kind of day a holiday is (Preference > Holiday groups and filters by it, and by the year of its date):
//   regular   a regular holiday
//   special   a special non-working day
//   working   a special working day (an ordinary working day: it does not push a deadline)
//   local     a day of the city (founding anniversary, fiesta...)
// The holidays already there are sorted by name; anything not recognised stays "regular".
const CATEGORY_BY_NAME = {
  special: ['Chinese New Year', 'Black Saturday', 'Ninoy Aquino Day', "All Saints' Day", 'Feast of the Immaculate Conception', 'Christmas Eve', "New Year's Eve"],
  working: ['EDSA People Power Anniversary'],
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('holidays', 'category', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'regular'
    });
    for (const [category, names] of Object.entries(CATEGORY_BY_NAME)) {
      await queryInterface.bulkUpdate('holidays', { category }, { name: names });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('holidays', 'category');
  }
};
