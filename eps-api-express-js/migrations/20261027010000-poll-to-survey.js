'use strict';

// A poll becomes a survey: several questions, each with its own answer type (short answer, paragraph, multiple
// choice, checkboxes).
//
//   polls          + description                  (what the survey is about; the old `question` column is its title)
//   pollquestions  one row per question           (type, prompt, required, position)
//   polloptions    + questionId                   (the choices now belong to a question)
//   pollvotes      optionId is now optional       (a row is one respondent's whole response; counts stay valid)
//   pollanswers    one row per answer             (a chosen option, or the text typed)
//
// Every existing poll is kept as a survey with ONE multiple-choice question, and every existing vote becomes an answer
// to it, so nothing already collected is lost.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('polls', 'description', { type: Sequelize.TEXT, allowNull: true });

    await queryInterface.createTable('pollquestions', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      pollId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'polls', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      type: { type: Sequelize.ENUM('short', 'paragraph', 'radio', 'checkbox'), allowNull: false, defaultValue: 'radio' },
      prompt: { type: Sequelize.STRING(500), allowNull: false },
      required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addColumn('polloptions', 'questionId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'pollquestions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
    });

    // a response no longer carries one option: its answers do
    await queryInterface.sequelize.query('ALTER TABLE pollvotes MODIFY optionId INT NULL');

    await queryInterface.createTable('pollanswers', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      voteId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'pollvotes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      questionId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'pollquestions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      optionId: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'polloptions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      text: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('pollanswers', ['questionId'], { name: 'pollanswers_question_idx' });
    await queryInterface.addIndex('pollanswers', ['voteId'], { name: 'pollanswers_vote_idx' });

    // ---- what already exists becomes a one-question survey
    await queryInterface.sequelize.query(
      "INSERT INTO pollquestions (pollId, type, prompt, required, position, createdAt, updatedAt) " +
      "SELECT id, 'radio', question, true, 0, createdAt, createdAt FROM polls"
    );
    await queryInterface.sequelize.query(
      'UPDATE polloptions o JOIN pollquestions q ON q.pollId = o.pollId SET o.questionId = q.id'
    );
    await queryInterface.sequelize.query(
      'INSERT INTO pollanswers (voteId, questionId, optionId, createdAt, updatedAt) ' +
      'SELECT v.id, q.id, v.optionId, v.createdAt, v.createdAt FROM pollvotes v ' +
      'JOIN pollquestions q ON q.pollId = v.pollId WHERE v.optionId IS NOT NULL'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pollanswers');
    await queryInterface.removeColumn('polloptions', 'questionId');
    await queryInterface.dropTable('pollquestions');
    await queryInterface.removeColumn('polls', 'description');
  }
};
