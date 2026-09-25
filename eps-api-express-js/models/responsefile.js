// models/responseFile.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ResponseFile extends Model {
    static associate(models) {
      ResponseFile.belongsTo(models.Response, {
        foreignKey: 'responseId',
        as: 'response'
      });
    }
  }
  ResponseFile.init({
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
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // A base64 data URI (data:<mime>;base64,...) — images are resized/recompressed first, PDFs
    // are passed through as-is. Same blob-in-DB convention as ComplaintFile.file.
    file: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'ResponseFile',
    tableName: 'responsefiles',
    timestamps: true,
  });
  return ResponseFile;
};