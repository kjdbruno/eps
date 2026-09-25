'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // A handful of pre-existing rows have via = NULL (predates this column being NOT NULL in
    // practice) — MySQL's strict mode rejects the MODIFY COLUMN below unless those are backfilled
    // first. 'account' is the closest fit for legacy rows of unknown origin.
    await queryInterface.sequelize.query(`UPDATE complaints SET via = 'account' WHERE via IS NULL`);

    // A third filing channel, alongside 'otp' (guest) and 'account' (logged-in citizen) — a
    // super/admin filing on a citizen's behalf (see ComplaintController.createStaffComplaint).
    // Distinct from 'account' so an edit action can be scoped to complaints staff themselves
    // filed, without touching complaints a citizen filed through their own logged-in account.
    await queryInterface.changeColumn('complaints', 'via', {
      type: Sequelize.ENUM('otp', 'account', 'staff'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE complaints SET via = 'account' WHERE via = 'staff'`);
    await queryInterface.changeColumn('complaints', 'via', {
      type: Sequelize.ENUM('otp', 'account'),
      allowNull: false
    });
  }
};
