// models/discussionoffice.js
'use strict';
const { Model } = require('sequelize');

// Mirrors ComplaintOffice's role (which office "owns" a record), but simpler — a discussion has
// no acknowledgement/completion workflow, just which office(s) it concerns for visibility
// scoping (a workstation user only sees discussions assigned to their own office) and for
// routing notifications.
module.exports = (sequelize, DataTypes) => {
  class DiscussionOffice extends Model {
    static associate(models) {
      DiscussionOffice.belongsTo(models.Discussion, {
        foreignKey: 'discussionId',
        as: 'discussion',
        onDelete: 'CASCADE',
      });
      DiscussionOffice.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'office',
        onDelete: 'CASCADE',
      });
    }
  }
  DiscussionOffice.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    discussionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Discussions',
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
    // "ai" = auto-assigned by matching the discussion's title/description against office
    // mandates at creation time, "admin" = a staff member assigned/reassigned it manually.
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
    modelName: 'DiscussionOffice',
    tableName: 'discussionoffices',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['discussionId', 'officeId']
      }
    ]
  });
  return DiscussionOffice;
};
