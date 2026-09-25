'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('super', 'admin', 'workstation', 'citizen', 'monitoring'),
      allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    // Reverting only makes sense if nothing is actually using 'monitoring' yet — this doesn't
    // reassign existing 'monitoring' rows first, matching how this repo's other ENUM migrations
    // aren't defensive about it either.
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('super', 'admin', 'workstation', 'citizen'),
      allowNull: false
    });
  }
};
