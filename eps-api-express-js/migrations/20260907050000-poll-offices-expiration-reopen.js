'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('polls', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('polls', 'reopenCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.createTable('polloffices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      pollId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'polls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      officeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'offices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      assignedBy: {
        type: Sequelize.ENUM('ai', 'admin'),
        allowNull: true
      },
      assignmentReason: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('polloffices', ['pollId', 'officeId'], {
      unique: true,
      name: 'polloffices_poll_office_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('polloffices', 'polloffices_poll_office_unique');
    await queryInterface.dropTable('polloffices');
    await queryInterface.removeColumn('polls', 'reopenCount');
    await queryInterface.removeColumn('polls', 'expiresAt');
  }
};
