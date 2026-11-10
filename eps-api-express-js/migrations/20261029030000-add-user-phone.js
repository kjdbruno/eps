'use strict';

// The Philippine mobile number of a staff account (Preference > User). Kept as 09XXXXXXXXX.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'phoneNo', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'phoneNo');
  }
};
