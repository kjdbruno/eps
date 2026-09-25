'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // "The account this entry is ABOUT" — distinct from actorRole/actorLabel (who performed the
    // logged action). Only used for 'office_reopened' entries so far: captures whose "done" mark
    // just got reversed (ComplaintOffice.completedByUserId at the moment of reopening, before it's
    // cleared) so the per-account performance report can compute a correction rate without needing
    // a full audit table. Left null on every other action.
    await queryInterface.addColumn('complainthistories', 'targetUserId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complainthistories', 'targetUserId');
  }
};
