// models/discussionComment.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiscussionComment extends Model {
    static associate(models) {
      DiscussionComment.belongsTo(models.Discussion, {
        foreignKey: 'discussionId',
        as: 'discussion',
        onDelete: 'CASCADE',
      });
      // Set when the commenter was logged in — their name is resolved from here, not guestName.
      DiscussionComment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  DiscussionComment.init({
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
        model: 'discussions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Logged-in commenter — mutually exclusive with guestName below.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    // Display name typed by a guest commenter (no account). Ignored/irrelevant when userId is set.
    guestName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'DiscussionComment',
    tableName: 'discussioncomments',
    timestamps: true,
  });
  return DiscussionComment;
};
