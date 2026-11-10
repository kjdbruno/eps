// models/pollOption.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PollOption extends Model {
    static associate(models) {
      PollOption.belongsTo(models.Poll, {
        foreignKey: 'pollId',
        as: 'poll',
        onDelete: 'CASCADE',
      });
      PollOption.hasMany(models.PollVote, {
        foreignKey: 'optionId',
        as: 'votes',
      });
      PollOption.belongsTo(models.PollQuestion, {
        foreignKey: 'questionId',
        as: 'question',
        onDelete: 'CASCADE',
      });
      PollOption.hasMany(models.PollAnswer, {
        foreignKey: 'optionId',
        as: 'answers',
      });
    }
  }
  PollOption.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    pollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'polls',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // The question these choices belong to (a survey question with choices).
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pollquestions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'PollOption',
    tableName: 'polloptions',
    timestamps: true,
  });
  return PollOption;
};
