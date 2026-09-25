'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // SLA now lives on the office, not the (removed) category — different departments
    // reasonably have different target turnaround times regardless of what the complaint is about.
    await queryInterface.addColumn('offices', 'slaDays', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Target turnaround in days for this office to resolve a complaint. Null = no SLA tracked for this office (getResponseTimeReport just won\'t flag anything as overdue for it).'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('offices', 'slaDays');
  }
};
