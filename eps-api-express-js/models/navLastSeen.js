// models/navLastSeen.js
'use strict';
const { Model } = require('sequelize');

// One row per (user, nav section) — when that user last opened the section, used to derive the
// left-nav "new since you last looked" badge counts (see NavBadgeController). Only the
// time-based sections (feedback/discussion/poll) are ever written here; the complaint badge is
// a live operational count computed straight from ComplaintOffice, not from this table.
module.exports = (sequelize, DataTypes) => {
  class NavLastSeen extends Model {
    static associate(models) {
      NavLastSeen.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }
  NavLastSeen.init({
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
    section: {
      type: DataTypes.ENUM('feedback', 'discussion', 'poll'),
      allowNull: false
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'NavLastSeen',
    tableName: 'navlastseens',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'section'] }
    ]
  });
  return NavLastSeen;
};
