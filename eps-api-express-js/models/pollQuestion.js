// models/pollQuestion.js
'use strict';
const { Model } = require('sequelize');

// One question of a survey (a poll), with the way it is answered: a short answer, a paragraph, one choice
// (radio) or any number of choices (checkbox). The choices of the last two are its PollOptions.
module.exports = (sequelize, DataTypes) => {
  class PollQuestion extends Model {
    static associate(models) {
      PollQuestion.belongsTo(models.Poll, { foreignKey: 'pollId', as: 'poll', onDelete: 'CASCADE' });
      PollQuestion.hasMany(models.PollOption, { foreignKey: 'questionId', as: 'options' });
      PollQuestion.hasMany(models.PollAnswer, { foreignKey: 'questionId', as: 'answers' });
    }
  }
  PollQuestion.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    pollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'polls', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM('short', 'paragraph', 'radio', 'checkbox'),
      allowNull: false,
      defaultValue: 'radio'
    },
    prompt: { type: DataTypes.STRING(500), allowNull: false },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'PollQuestion',
    tableName: 'pollquestions',
    timestamps: true,
  });
  return PollQuestion;
};
