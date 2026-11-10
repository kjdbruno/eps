// models/pollAnswer.js
'use strict';
const { Model } = require('sequelize');

// One answer inside a response: the option chosen (multiple choice, checkboxes: one row per choice), or the text
// typed (short answer, paragraph). The response itself is a PollVote.
module.exports = (sequelize, DataTypes) => {
  class PollAnswer extends Model {
    static associate(models) {
      PollAnswer.belongsTo(models.PollVote, { foreignKey: 'voteId', as: 'vote', onDelete: 'CASCADE' });
      PollAnswer.belongsTo(models.PollQuestion, { foreignKey: 'questionId', as: 'question', onDelete: 'CASCADE' });
      PollAnswer.belongsTo(models.PollOption, { foreignKey: 'optionId', as: 'option', onDelete: 'CASCADE' });
    }
  }
  PollAnswer.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    voteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'pollvotes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'pollquestions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    optionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'polloptions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    text: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'PollAnswer',
    tableName: 'pollanswers',
    timestamps: true,
  });
  return PollAnswer;
};
