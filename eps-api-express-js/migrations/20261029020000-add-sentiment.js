'use strict';

// The impression (positive / neutral / negative) an AI model reads from a feedback when it is filed, and from a CSM report
// when it is recorded (see utils/sentiment.js), so the desk can tell the two apart at a glance.
//   sentiment         null until it has been read (or when no AI model could)
//   sentimentReason   one short sentence on why, shown on hover
//   sentimentAt       when it was read
/** @type {import('sequelize-cli').Migration} */
const TABLES = ['complaints', 'kioskratings'];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'sentiment', {
        type: Sequelize.ENUM('positive', 'neutral', 'negative'),
        allowNull: true
      });
      await queryInterface.addColumn(table, 'sentimentReason', {
        type: Sequelize.STRING(300),
        allowNull: true
      });
      await queryInterface.addColumn(table, 'sentimentAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'sentimentAt');
      await queryInterface.removeColumn(table, 'sentimentReason');
      await queryInterface.removeColumn(table, 'sentiment');
    }
  }
};
