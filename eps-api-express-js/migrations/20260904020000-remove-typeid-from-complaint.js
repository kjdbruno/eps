'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Category-driven routing was already retired (see categorySource's removal in
    // 20260901010000) in favor of matching complaint content directly to office mandates.
    // typeId was the last remnant — never set by either citizen filing path (OTP or account),
    // so it's always null in practice. Dropping it; ComplaintType/ComplaintTypeOffice tables
    // stay, just no longer linked from Complaint.
    await queryInterface.removeColumn('complaints', 'typeId');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaints', 'typeId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ComplaintTypes',
        key: 'id'
      },
      onUpdate: 'SET NULL',
      onDelete: 'SET NULL'
    });
  }
};
