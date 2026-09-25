'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // A super/admin cancelling a whole complaint now cascades to every office it was assigned
    // to — this gives each ComplaintOffice row a terminal state to land in alongside 'completed'.
    await queryInterface.changeColumn('complaintoffices', 'status', {
      type: Sequelize.ENUM('pending', 'received', 'ongoing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE complaintoffices SET status = 'completed' WHERE status = 'cancelled'`);
    await queryInterface.changeColumn('complaintoffices', 'status', {
      type: Sequelize.ENUM('pending', 'received', 'ongoing', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    });
  }
};
