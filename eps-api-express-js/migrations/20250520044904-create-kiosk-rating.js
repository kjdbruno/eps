'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KioskRatings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      officeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Offices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('citizen', 'business', 'government'),
        defaultValue: 'citizen'
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      sex: {
        type: Sequelize.ENUM('Male', 'Female', 'Others'),
        defaultValue: 'Others'
      },
      age: {
        type: Sequelize.STRING,
        allowNull: true
      },
      residence: {
        type: Sequelize.STRING,
        allowNull: true
      },
      serviceAvailed: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      cc1: {
        type: Sequelize.ENUM('1', '2', '3', '4'),
        defaultValue: '4'
      },
      cc2: {
        type: Sequelize.ENUM('1', '2', '3', '4', '5'),
        defaultValue: '5'
      },
      cc3: {
        type: Sequelize.ENUM('1', '2', '3', '4', '5'),
        defaultValue: '5'
      },
      sqd0: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd1: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd2: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd3: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd4: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd5: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd6: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd7: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      sqd8: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      suggestion: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      entryFrom: {
        type: Sequelize.ENUM('kiosk', 'manual'),
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
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('KioskRatings');
  }
};