'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Deliberately separate from verificationCode (used only for the registration/email-verify
    // flow) rather than reusing it — a password-reset code is more sensitive (it leads to
    // changing account access, not just confirming an email) and gets its own expiry, which
    // verificationCode never had.
    await queryInterface.addColumn('Citizens', 'resetPasswordCode', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Citizens', 'resetPasswordExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Citizens', 'resetPasswordExpiresAt');
    await queryInterface.removeColumn('Citizens', 'resetPasswordCode');
  }
};
