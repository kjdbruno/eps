// models/complaintHistory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ComplaintHistory extends Model {
    static associate(models) {
      ComplaintHistory.belongsTo(models.Complaint, {
        foreignKey: 'complaintId',
        as: 'complaint',
        onDelete: 'CASCADE',
      });
    }
  }
  ComplaintHistory.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    complaintId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Complaints',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Snapshotted at write time (not a live FK) so the log stays legible even if the acting
    // account is later deleted or renamed.
    actorRole: {
      type: DataTypes.STRING,
      allowNull: true
    },
    actorLabel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // "The account this entry is ABOUT", distinct from actorRole/actorLabel (who performed the
    // action). Only set on 'office_reopened' entries currently — see
    // ResponseController.reopenOffice — to support a per-account correction-rate report without a
    // dedicated audit table.
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'ComplaintHistory',
    tableName: 'complainthistories',
    timestamps: true,
  });
  return ComplaintHistory;
};
