// models/polloffice.js
'use strict';
const { Model } = require('sequelize');

// Mirrors DiscussionOffice — which office(s) a poll concerns, for visibility scoping (a
// workstation user only sees polls assigned to their own office) and routing notifications.
module.exports = (sequelize, DataTypes) => {
  class PollOffice extends Model {
    static associate(models) {
      PollOffice.belongsTo(models.Poll, {
        foreignKey: 'pollId',
        as: 'poll',
        onDelete: 'CASCADE',
      });
      PollOffice.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'office',
        onDelete: 'CASCADE',
      });
    }
  }
  PollOffice.init({
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
        model: 'Polls',
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // "ai" = auto-assigned by matching the poll's question against office mandates at creation
    // time, "admin" = a staff member assigned/reassigned it manually.
    assignedBy: {
      type: DataTypes.ENUM('ai', 'admin'),
      allowNull: true
    },
    assignmentReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'PollOffice',
    tableName: 'polloffices',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['pollId', 'officeId']
      }
    ]
  });
  return PollOffice;
};
