'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Who personally received/completed THIS office's share of the complaint — same provenance
    // idea as assignedBy/assignmentReason already on this table, just for the other two lifecycle
    // moments. Without these, there was no reliable way to attribute an office's receive/resolution
    // timing to a specific staff account (ComplaintHistory's actorLabel is a display-string
    // snapshot, not a queryable FK) — needed for the per-account performance report
    // (ReportController.getAccountPerformanceReport).
    await queryInterface.addColumn('complaintoffices', 'receivedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('complaintoffices', 'completedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaintoffices', 'completedByUserId');
    await queryInterface.removeColumn('complaintoffices', 'receivedByUserId');
  }
};
