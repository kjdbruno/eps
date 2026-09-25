'use strict';

// Per-office SLA never had a real basis — every complaint's resolution deadline is governed by
// its ARTA/EODB complexity tier (see utils/businessHours.js / Complaint.resolutionDeadline),
// not by anything set per-office. Reverses 20260901020000-add-sla-days-to-office.js.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('offices', 'slaDays');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('offices', 'slaDays', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Target turnaround in days for this office to resolve a complaint. Null = no SLA tracked for this office.'
    });
  }
};
