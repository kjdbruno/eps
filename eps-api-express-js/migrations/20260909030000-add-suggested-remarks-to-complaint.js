'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Cached AI-drafted closing summary for the "suggest complete" banner on the supervisor's
    // status tab (see utils/completionSuggestion.js) — generated once eligibility is first met
    // (every assigned office has responded, none still unacknowledged) and reused on repeat views
    // instead of re-calling the LLM every time the complaint is opened. Cleared whenever the
    // complaint is reopened (see ComplaintController.reopen) so a stale draft never resurfaces.
    await queryInterface.addColumn('complaints', 'suggestedRemarks', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('complaints', 'suggestedRemarksAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('complaints', 'suggestedRemarksAt');
    await queryInterface.removeColumn('complaints', 'suggestedRemarks');
  }
};
