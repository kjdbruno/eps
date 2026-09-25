// models/complaintTypeOffice.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ComplaintTypeOffice extends Model {
    static associate(models) {
      ComplaintTypeOffice.belongsTo(models.ComplaintType, {
        foreignKey: 'complaintTypeId',
        as: 'complaintType',
      });
      ComplaintTypeOffice.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'office',
      });
    }
  }
  ComplaintTypeOffice.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    complaintTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ComplaintTypes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    officeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Offices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'ComplaintTypeOffice',
    tableName: 'complainttypeoffices',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['complaintTypeId', 'officeId']
      }
    ]
  });
  return ComplaintTypeOffice;
};
