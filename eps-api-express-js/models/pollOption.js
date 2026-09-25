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
