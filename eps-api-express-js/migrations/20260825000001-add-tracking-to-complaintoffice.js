'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaintoffices', 'status', {
      type: Sequelize.ENUM('pending', 'received', 'ongoing', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    });
    await queryInterface.addColumn('complaintoffices', 'receivedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('complaintoffices', 'completedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('complaintoffices', 'status');
    await queryInterface.removeColumn('complaintoffices', 'receivedAt');
    await queryInterface.removeColumn('complaintoffices', 'completedAt');
  }
};
