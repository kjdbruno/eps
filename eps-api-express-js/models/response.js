// models/response.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class Response extends Model {
    static associate(models) {
      Response.belongsTo(models.Complaint, {
        foreignKey: 'complaintId',
        as: 'complaint'
      });
      Response.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Response.hasMany(models.ResponseFile, {
        foreignKey: 'responseId',
        as: 'responseFiles',
      });
      Response.hasMany(models.ResponseRating, {
        foreignKey: 'responseId',
        as: 'responseRatings',
      });
    }
  }
  Response.init({
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'Response',
    tableName: 'responses',
    timestamps: true,
  });
  return Response;
};