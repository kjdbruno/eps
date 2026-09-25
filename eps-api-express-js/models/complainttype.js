// models/complaintType.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ComplaintType extends Model {
    static associate(models) {
      ComplaintType.hasMany(models.ComplaintTypeOffice, {
        foreignKey: 'complaintTypeId',
        as: 'typeOffices',
      });
      // The offices this category auto-routes to once a complaint is verified.
      ComplaintType.belongsToMany(models.Office, {
        through: models.ComplaintTypeOffice,
        foreignKey: 'complaintTypeId',
        otherKey: 'officeId',
        as: 'offices',
      });
    }
  }
  ComplaintType.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'ComplaintType',
    tableName: 'complainttypes',
    timestamps: true,
  });
  return ComplaintType;
};