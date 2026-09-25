'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activitylogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      // Which admin module this happened in — mirrors ComplaintHistory's own dedicated table
      // (complaints keep logging there, not here); this table covers everything else:
      // 'discussion' | 'poll' | 'office' | 'user' | 'holiday' | 'feedback'.
      module: {
        type: Sequelize.STRING,
        allowNull: false
      },
      // Id of the row the action happened to (a discussion, office, user, etc.) — not a real FK
      // since it points at a different table depending on `module`.
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      // Live FK for convenience, but the log stays legible even if this account is later
      // deleted — actorRole/actorLabel below are snapshotted at write time, same pattern as
      // ComplaintHistory.
      actorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      actorRole: {
        type: Sequelize.STRING,
        allowNull: true
      },
      actorLabel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('activitylogs');
  }
};
