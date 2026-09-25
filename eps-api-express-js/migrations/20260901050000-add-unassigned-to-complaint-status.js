'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Widen the enum first so the backfill below can actually write 'unassigned'.
    await queryInterface.changeColumn('complaints', 'status', {
      type: Sequelize.ENUM('unverified', 'verified', 'pending', 'unassigned', 'ongoing', 'completed', 'cancelled')
    });

    // Backfill: a complaint that was left 'pending' with no active office assignment was, in
    // effect, already unassigned — just not labeled as such. Make that explicit.
    await queryInterface.sequelize.query(`
      UPDATE complaints
      SET status = 'unassigned'
      WHERE status = 'pending'
        AND id NOT IN (
          SELECT DISTINCT complaintId FROM complaintoffices WHERE isActive = true
        )
    `);
  },

  async down(queryInterface, Sequelize) {
    // Fold 'unassigned' back into 'pending' before narrowing the enum, or those rows would
    // violate the narrower column definition.
    await queryInterface.sequelize.query(`UPDATE complaints SET status = 'pending' WHERE status = 'unassigned'`);
    await queryInterface.changeColumn('complaints', 'status', {
      type: Sequelize.ENUM('unverified', 'verified', 'pending', 'ongoing', 'completed', 'cancelled')
    });
  }
};
