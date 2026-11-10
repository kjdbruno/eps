// models/complaintOffice.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ComplaintOffice extends Model {
    static associate(models) {
      ComplaintOffice.belongsTo(models.Complaint, {
        foreignKey: 'complaintId',
        as: 'complaint',
        onDelete: 'CASCADE',
      });
      ComplaintOffice.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'office',
        onDelete: 'CASCADE',
      });
    }
  }
  ComplaintOffice.init({
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
    officeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Offices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    isReceived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'received', 'ongoing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 24 business hours (weekends/holidays excluded — see utils/businessHours.js) from when this
    // row went active. Frozen at assignment time; compared against receivedAt (or "now" while
    // still unreceived) to derive receiveComplianceStatus on read — never stored/mutated by a job.
    receiveDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // "ai" = auto-assigned by matching the complaint's content against office mandates at filing
    // time, "admin" = a staff member assigned/reassigned it. Null for rows created before this
    // column existed, and for the manual multi-office admin flow (createComplaint).
    assignedBy: {
      type: DataTypes.ENUM('ai', 'admin'),
      allowNull: true
    },
    // Why this office was assigned — the AI's stated reasoning, or a staff member's note.
    assignmentReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Who personally received/completed this office's share — set in ResponseController.receive/
    // complete, cleared back to null on ResponseController.reopenOffice's undo (a fresh
    // receive/complete after that sets it again). Powers per-account attribution in
    // ReportController.getAccountPerformanceReport; not a live FK on purpose, same spirit as
    // ComplaintHistory's actorLabel snapshot.
    receivedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    completedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Set when this office handed the feedback over to another office (its row is switched off): when,
    // and by whom. The office sees the feedback end at that moment.
    reassignedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reassignedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'ComplaintOffice',
    tableName: 'complaintoffices',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['complaintId', 'officeId']
      }
    ]
  });
  return ComplaintOffice;
};