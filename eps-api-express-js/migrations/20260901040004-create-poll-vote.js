'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pollvotes', {
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
      optionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'polloptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      guestToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('pollvotes', ['pollId', 'userId'], { unique: true, name: 'pollvotes_poll_user_unique' });
    await queryInterface.addIndex('pollvotes', ['pollId', 'guestToken'], { unique: true, name: 'pollvotes_poll_guest_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pollvotes');
  }
};
