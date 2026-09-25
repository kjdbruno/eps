// models/complaintFile.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ComplaintFile extends Model {
    static associate(models) {
      ComplaintFile.belongsTo(models.Complaint, {
        foreignKey: 'complaintId',
        as: 'complaint'
      });
    }
  }
  ComplaintFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    complaintId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Complaints',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file: {
      // A compressed, base64-encoded data URI (e.g. "data:image/jpeg;base64,...") — not a disk path.
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'ComplaintFile',
    tableName: 'complaintfiles',
    timestamps: true,
  });
  return ComplaintFile;
};