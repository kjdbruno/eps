'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Finalization remarks left by the supervisor when marking a complaint completed or
    // cancelled (see updateStatus in ComplaintController.js). Overwritten on each status change
    // so it always reflects the remarks tied to the *current* terminal status — surfaced both
    // beside the status in the UI and in the complaint's history log.
    await queryInterface.addColumn('complaints', 'remarks', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaints', 'remarks');
  }
};
