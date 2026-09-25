'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaintdetails', 'latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('complaintdetails', 'longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('complaintdetails', 'latitude');
    await queryInterface.removeColumn('complaintdetails', 'longitude');
  }
};
