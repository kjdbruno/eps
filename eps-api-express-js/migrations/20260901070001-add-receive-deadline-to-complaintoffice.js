'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // The moment a ComplaintOffice must be acknowledged (received) by — 24 business hours from
    // when it went active, skipping weekends/holidays (see utils/businessHours.js). Frozen at
    // assignment time; never recomputed retroactively even if the holiday calendar changes later.
    await queryInterface.addColumn('complaintoffices', 'receiveDeadline', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaintoffices', 'receiveDeadline');
  }
};
