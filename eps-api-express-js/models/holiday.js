// models/holiday.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Holiday extends Model {
    static associate(models) {
      // No associations — a flat calendar table consulted by utils/businessHours.js.
    }
  }
  Holiday.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // regular / special (non-working) / working (special working day) / local (a day of the city)
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'regular'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'Holiday',
    tableName: 'holidays',
    timestamps: true,
  });
  return Holiday;
};
