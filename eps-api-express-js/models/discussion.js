// models/discussion.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Discussion extends Model {
    static associate(models) {
      Discussion.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
      Discussion.hasMany(models.DiscussionComment, {
        foreignKey: 'discussionId',
        as: 'comments',
      });
      Discussion.hasMany(models.DiscussionOffice, {
        foreignKey: 'discussionId',
        as: 'discussionOffices',
      });
    }
  }
  Discussion.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Optional — past this date the topic is treated as closed to new comments, same as an
    // explicit closeDiscussion, without staff needing to remember to close it themselves.
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Staff member (User) who opened the topic — nullable so removing that account doesn't
    // orphan/break the discussion itself.
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('open', 'closed'),
      allowNull: false,
      defaultValue: 'open'
    },
    // How many times reopenDiscussion has been called on this topic — a simple counter (not a
    // full audit-history table) that's enough to compute a "reopen rate" KPI.
    reopenCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
  }, {
    sequelize,
    modelName: 'Discussion',
    tableName: 'discussions',
    timestamps: true,
  });
  return Discussion;
};
