// models/complaint.js
'use strict';
const { Model } = require('sequelize');

function generateReferenceNo() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `EPS${datePart}${randomPart}`;
}

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class Complaint extends Model {
    static associate(models) {
      Complaint.hasMany(models.ComplaintOffice, {
        foreignKey: 'complaintId',
        as: 'complaintOffices',
      });
      Complaint.hasMany(models.ComplaintFile, {
        foreignKey: 'complaintId',
        as: 'complaintFiles',
      });
      Complaint.hasMany(models.Response, {
        foreignKey: 'complaintId',
        as: 'responses',
      });
      Complaint.hasOne(models.ComplaintDetail, {
        foreignKey: 'complaintId',
        as: 'complaintDetail',
      });
      Complaint.hasMany(models.ComplaintHistory, {
        foreignKey: 'complaintId',
        as: 'history',
      });
    }
  }
  Complaint.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    referenceNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('unverified', 'verified', 'pending', 'unassigned', 'ongoing', 'completed', 'cancelled')
    },
    via: {
      type: DataTypes.ENUM('otp', 'account', 'staff'),
      allowNull: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // ARTA/EODB complexity tiering, set by the AI at auto-assignment time. Drives
    // resolutionDeadline (see utils/businessHours.js) — the single standard every office is held
    // to; there's no separate per-office SLA figure anywhere in this app.
    complexity: {
      type: DataTypes.ENUM('simple', 'complex', 'highly_technical'),
      allowNull: true
    },
    resolutionDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Supervisor's remarks from the completion/cancellation that finalized (or last attempted
    // to finalize) this complaint — set by updateStatus, overwritten on each status change.
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // AI-drafted closing summary + when it was generated — cached by getCompletionSuggestion so
    // repeat views of the "suggest complete" banner don't re-call the LLM. Cleared on reopen.
    suggestedRemarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    suggestedRemarksAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  }, {
    sequelize,
    modelName: 'Complaint',
    tableName: 'complaints',
    timestamps: true,
    hooks: {
      beforeValidate: (complaint, options) => {
        if (!complaint.referenceNo) {
          complaint.referenceNo = generateReferenceNo();
        }
      }
    }
  });
  return Complaint;
};