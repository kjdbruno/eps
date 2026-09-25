// models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class User extends Model {
    static associate(models) {

      // Association with Staff -> userId
      User.hasOne(models.Staff, {
        foreignKey: 'userId',
        as: 'staff'
      });

      // Association with Citizen -> userId
      User.hasOne(models.Citizen, {
        foreignKey: 'userId',
        as: 'citizen'
      });

      // Association with UserLog -> userId
      User.hasOne(models.UserLog, {
        foreignKey: 'userId',
        as: 'log'
      });

      // Association with Notification -> receiverId
      User.hasMany(models.Notification, {
        foreignKey: 'receiverId',
        as: 'notifications'
      });

      // Association with Response -> userId
      User.hasMany(models.Response, {
        foreignKey: 'userId',
        as: 'responses'
      });

      User.hasMany(models.ComplaintDetail, {
        foreignKey: 'userId',
        as: 'complaintDetails'
      });

      User.hasMany(models.Message, {
        foreignKey: 'senderId',
        as: 'sentMessages'
      });

      User.hasMany(models.Message, {
        foreignKey: 'receiverId',
        as: 'receivedMessages'
      });

      // FCM registration tokens for this account's device(s) — see utils/push.js.
      User.hasMany(models.DeviceToken, {
        foreignKey: 'userId',
        as: 'deviceTokens'
      });
    }
  }
  User.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // 'monitoring' — read-only oversight: can view everything super/admin can (except Office/User
    // preference, which is super-only) but can never create/update/close/reopen/assign/respond/
    // vote/etc. See middlewares/AuthMiddleware.js and each controller's own scoping for how this
    // is enforced — there's no single gate for it.
    role: {
      type: DataTypes.ENUM('super', 'admin', 'workstation', 'citizen', 'monitoring'),
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Set to "now" by TeamController.forceLogout — verifyToken (middlewares/AuthMiddleware.js)
    // rejects any token whose `iat` (issued-at) predates this, so every token issued before the
    // moment an admin force-logs-out this account stops working on its very next request,
    // everywhere it's in use, not just the live socket connection.
    forceLogoutAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  });
  return User;
};