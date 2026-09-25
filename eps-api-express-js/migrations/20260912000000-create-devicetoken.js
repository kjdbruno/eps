'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('devicetokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // The FCM registration token itself — unique across the whole table, not just per user:
      // reinstalling/logging into a different account on the same device hands out the SAME
      // token again, so a re-registration must move it to the new owner rather than duplicate it.
      token: {
        type: Sequelize.STRING(512),
        allowNull: false,
        unique: true
      },
      platform: {
        type: Sequelize.ENUM('android', 'ios', 'web'),
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
    await queryInterface.dropTable('devicetokens');
  }
};
