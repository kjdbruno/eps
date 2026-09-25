'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Evidence photos are now compressed and stored inline as base64 data URIs instead of
    // on-disk paths, so the column needs to hold far more than a VARCHAR(255) path string.
    await queryInterface.changeColumn('complaintfiles', 'file', {
      type: Sequelize.TEXT('long'),
      allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('complaintfiles', 'file', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
