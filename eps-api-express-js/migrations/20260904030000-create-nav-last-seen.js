'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('navlastseens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      section: {
        type: Sequelize.ENUM('feedback', 'discussion', 'poll'),
        allowNull: false
      },
      lastSeenAt: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('navlastseens', ['userId', 'section'], {
      unique: true,
      name: 'navlastseens_user_section_unique'
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('navlastseens');
  }
};
