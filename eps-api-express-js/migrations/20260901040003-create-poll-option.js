'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('polloptions', {
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
      label: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('polloptions');
  }
};
