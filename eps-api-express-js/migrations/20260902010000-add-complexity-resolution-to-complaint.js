'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ARTA/Ease-of-Doing-Business complexity tiering — set by the same AI call that routes the
    // complaint to an office (see matchOfficesToContent in ComplaintController.js). Drives
    // resolutionDeadline below; distinct from Office.slaDays (a separate, per-office figure).
    await queryInterface.addColumn('complaints', 'complexity', {
      type: Sequelize.ENUM('simple', 'complex', 'highly_technical'),
      allowNull: true
    });
    // Target resolution moment: 3/7/20 business days (weekends + holidays excluded, same
    // calendar as ComplaintOffice.receiveDeadline) from classification, per complexity tier.
    // Frozen at classification time; never recomputed retroactively.
    await queryInterface.addColumn('complaints', 'resolutionDeadline', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaints', 'resolutionDeadline');
    await queryInterface.removeColumn('complaints', 'complexity');
  }
};
