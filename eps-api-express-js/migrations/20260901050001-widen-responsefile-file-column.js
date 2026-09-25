'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Response evidence (photos/PDFs) is now compressed and stored inline as base64 data URIs
    // instead of on-disk paths, matching complaintfiles — see 20260827000001.
    await queryInterface.changeColumn('responsefiles', 'file', {
      type: Sequelize.TEXT('long'),
      allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('responsefiles', 'file', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
