// models/responseRating.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ResponseRating extends Model {
    static associate(models) {
      ResponseRating.belongsTo(models.Response, {
        foreignKey: 'responseId',
        as: 'response'
      });
      ResponseRating.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  ResponseRating.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    responseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Responses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // The citizen who rated — one rating per (responseId, userId), enforced by a unique index.
    // Nullable only for rows that predate this column.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    rate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 1.0,
        max: 5.0,
      }
    },
  }, {
    sequelize,
    modelName: 'ResponseRating',
    tableName: 'responseratings',
    timestamps: true,
  });
  return ResponseRating;
};