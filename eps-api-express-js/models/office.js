// models/office.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class Office extends Model {
    static associate(models) {
      
      Office.hasMany(models.Staff, {
        foreignKey: 'officeId',
        as: 'staffs'
      });

      Office.hasMany(models.KioskRating, {
        foreignKey: 'officeId',
        as: 'kioskRatings',
      });

      Office.hasMany(models.Rating, {
        foreignKey: 'officeId',
        as: 'overallRatings',
      });

      Office.hasMany(models.ComplaintOffice, {
        foreignKey: 'officeId',
        as: 'complaintOfficeAssignments',
      });

      Office.hasMany(models.ComplaintTypeOffice, {
        foreignKey: 'officeId',
        as: 'typeAssignments',
      });
      // The complaint categories this office is automatically responsible for.
      Office.belongsToMany(models.ComplaintType, {
        through: models.ComplaintTypeOffice,
        foreignKey: 'officeId',
        otherKey: 'complaintTypeId',
        as: 'complaintTypes',
      });

    }
  }
  Office.init({
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
    alias: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // What this office is responsible for, in plain language. Filed complaints are matched
    // against every active office's mandate to auto-assign them — an office with no mandate
    // set is invisible to that matching and never gets auto-assigned anything.
    mandate: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'Office',
    tableName: 'offices',
    timestamps: true,
  });
  return Office;
};