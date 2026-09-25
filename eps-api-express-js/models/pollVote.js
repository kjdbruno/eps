// models/pollVote.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PollVote extends Model {
    static associate(models) {
      PollVote.belongsTo(models.Poll, {
        foreignKey: 'pollId',
        as: 'poll',
        onDelete: 'CASCADE',
      });
      PollVote.belongsTo(models.PollOption, {
        foreignKey: 'optionId',
        as: 'option',
        onDelete: 'CASCADE',
      });
      PollVote.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  PollVote.init({
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
        model: 'polls',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    optionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'polloptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Logged-in voter — mutually exclusive with guestToken below.
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
    // A random id the citizen's browser generates and stores locally (see src/boot/guest.js in
    // the external app) — this is a SOFT duplicate-vote guard for guests, not real identity: it
    // only stops the same browser from voting twice, not the same person in a different browser
    // or incognito window. That tradeoff is intentional — voting is meant to be zero-friction.
    guestToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'PollVote',
    tableName: 'pollvotes',
    timestamps: true,
    indexes: [
      // MySQL treats each NULL as distinct in a unique index, so these only ever constrain the
      // non-null side — a logged-in voter can't vote twice on a poll, and neither can one guest
      // browser, but the two mechanisms don't interfere with each other.
      { unique: true, fields: ['pollId', 'userId'] },
      { unique: true, fields: ['pollId', 'guestToken'] },
    ]
  });
  return PollVote;
};
