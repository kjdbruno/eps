// models/activitylog.js
'use strict';
const { Model } = require('sequelize');

// System-wide "internal activities" feed for the Report page's Activity Log tab. Complaints keep
// their own dedicated ComplaintHistory table (see utils/complaintHistory.js) — this one covers
// every other admin module (Discussion, Poll, Office, User, Holiday, manual Feedback entries).
// ReportController.getActivityLog merges both sources into a single sorted list at read time.
module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.User, {
        foreignKey: 'actorId',
        as: 'actor',
        onDelete: 'SET NULL',
      });
    }
  }
  ActivityLog.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Snapshotted at write time (not a live join) so the log stays legible even if the acting
    // account is later deleted or renamed — same convention as ComplaintHistory.
    actorRole: {
      type: DataTypes.STRING,
      allowNull: true
    },
    actorLabel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'activitylogs',
    timestamps: true,
  });
  return ActivityLog;
};
