'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('offices', 'mandate', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'What this office is responsible for, in plain language — this is what a filed complaint\'s content is matched against to auto-assign it. Leave blank and this office is skipped by auto-assignment.'
    });

    await queryInterface.addColumn('complaintoffices', 'assignedBy', {
      type: Sequelize.ENUM('ai', 'admin'),
      allowNull: true,
      comment: '"ai" = auto-assigned by matching complaint content to office mandates at filing time, "admin" = a staff member assigned/reassigned it.'
    });

    await queryInterface.addColumn('complaintoffices', 'assignmentReason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Why this office was assigned — the AI\'s stated reasoning, or a staff member\'s note when reassigning.'
    });

    // The old category-driven routing is gone — complaints are matched directly to offices now.
    await queryInterface.removeColumn('complaints', 'categorySource');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('offices', 'mandate');
    await queryInterface.removeColumn('complaintoffices', 'assignedBy');
    await queryInterface.removeColumn('complaintoffices', 'assignmentReason');
    await queryInterface.addColumn('complaints', 'categorySource', {
      type: Sequelize.ENUM('ai', 'admin'),
      allowNull: true
    });
  }
};
