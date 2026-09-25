'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceToken extends Model {
    static associate(models) {
      DeviceToken.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }
  DeviceToken.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Unique across the whole table (see the migration) — registering a token that already
    // belongs to someone else re-points it at the new owner instead of erroring, which is exactly
    // what should happen when a device is reused for a different account.
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true
    },
    platform: {
      type: DataTypes.ENUM('android', 'ios', 'web'),
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'DeviceToken',
    tableName: 'devicetokens',
    timestamps: true,
  });
  return DeviceToken;
};
