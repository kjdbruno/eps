// models/rating.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class Rating extends Model {
    static associate(models) {
      Rating.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'ratedOffice',
        onDelete: 'CASCADE',
      });
    }
  }
  Rating.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    officeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Offices',
        key: 'id',
      }
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.0,
        max: 5.0,
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Rating',
    tableName: 'ratings',
    timestamps: true,
  });
  return Rating;
};