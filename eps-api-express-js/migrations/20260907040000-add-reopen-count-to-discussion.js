'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Simple counter (not a full audit-history table) — enough to compute a "reopen rate" KPI:
    // how often a closed discussion gets reopened vs. staying closed.
    await queryInterface.addColumn('discussions', 'reopenCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('discussions', 'reopenCount');
  }
};
