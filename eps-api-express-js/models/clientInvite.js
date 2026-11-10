'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClientInvite extends Model {
    static associate(models) {
      ClientInvite.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  ClientInvite.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed'),
      allowNull: false
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sentBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'ClientInvite',
    tableName: 'clientinvites',
    timestamps: true,
  });
  return ClientInvite;
};
