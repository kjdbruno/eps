// models/poll.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Poll extends Model {
    static associate(models) {
      Poll.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
      Poll.hasMany(models.PollOption, {
        foreignKey: 'pollId',
        as: 'options',
      });
      Poll.hasMany(models.PollQuestion, {
        foreignKey: 'pollId',
        as: 'questions',
      });
      Poll.hasMany(models.PollVote, {
        foreignKey: 'pollId',
        as: 'votes',
      });
      Poll.hasMany(models.PollOffice, {
        foreignKey: 'pollId',
        as: 'pollOffices',
      });
    }
  }
  Poll.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // What the survey is about, shown above its questions (the `question` column above is its title).
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('open', 'closed'),
      allowNull: false,
      defaultValue: 'open'
    },
    // Optional — past this date the poll is treated as closed to new votes, same as an explicit
    // closePoll, without staff needing to remember to close it themselves.
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // How many times reopenPoll has been called on this poll — a simple counter (not a full
    // audit-history table) that's enough to compute a "reopen rate" KPI.
    reopenCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
  }, {
    sequelize,
    modelName: 'Poll',
    tableName: 'polls',
    timestamps: true,
  });
  return Poll;
};
