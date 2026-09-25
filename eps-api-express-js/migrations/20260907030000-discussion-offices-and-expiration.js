'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('discussions', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.createTable('discussionoffices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      discussionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'discussions', key: 'id' },
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

    await queryInterface.addIndex('discussionoffices', ['discussionId', 'officeId'], {
      unique: true,
      name: 'discussionoffices_discussion_office_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('discussionoffices', 'discussionoffices_discussion_office_unique');
    await queryInterface.dropTable('discussionoffices');
    await queryInterface.removeColumn('discussions', 'expiresAt');
  }
};
