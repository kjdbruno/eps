'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaints', 'categorySource', {
      type: Sequelize.ENUM('ai', 'admin'),
      allowNull: true,
      comment: 'How typeId was set: "ai" = auto-classified from content at filing time, "admin" = a staff member assigned/reassigned it. Null for complaints filed before this column existed.'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('complaints', 'categorySource');
  }
};
