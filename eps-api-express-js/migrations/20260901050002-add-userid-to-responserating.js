'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('responseratings', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true, // existing rows (if any) predate attribution — left null rather than guessed
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // One rating per citizen per response — re-rating updates the existing row instead of
    // creating a duplicate. MySQL unique indexes treat NULL as distinct from every other NULL,
    // so pre-existing unattributed rows (userId = null) don't collide with each other.
    await queryInterface.addIndex('responseratings', ['responseId', 'userId'], {
      unique: true,
      name: 'responseratings_response_user_unique'
    });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('responseratings', 'responseratings_response_user_unique');
    await queryInterface.removeColumn('responseratings', 'userId');
  }
};
