'use strict';

// The one-time 3-day extension an office can ask for on a feedback: when it was granted, the
// reason, and who asked. (The new deadline itself is stored in the existing resolutionDeadline.)
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaints', 'extensionGrantedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('complaints', 'extensionReason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('complaints', 'extensionRequestedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('complaints', 'extensionRequestedBy');
    await queryInterface.removeColumn('complaints', 'extensionReason');
    await queryInterface.removeColumn('complaints', 'extensionGrantedAt');
  },
};
