'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CannedMessage extends Model {
    static associate(models) {
      // No associations — a flat list of ready-made replies.
    }
  }
  CannedMessage.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    // what it is for, in a few words (the pick-list shows this)
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // the reply itself; placeholders such as {firstname} and {office} are filled in from the feedback when it is picked or sent
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'CannedMessage',
    tableName: 'cannedmessages',
    timestamps: true,
  });
  return CannedMessage;
};
