'use strict';

// When an office hands a feedback over to another office, its own assignment is switched off and
// stamped here: when, and by whom. That stamp is where the handing-over office sees the feedback
// end (what happens later is the other office's trail).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaintoffices', 'reassignedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('complaintoffices', 'reassignedByUserId', { type: Sequelize.INTEGER, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaintoffices', 'reassignedByUserId');
    await queryInterface.removeColumn('complaintoffices', 'reassignedAt');
  },
};
