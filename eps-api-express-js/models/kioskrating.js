// models/kioskRating.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class KioskRating extends Model {
    static associate(models) {
      KioskRating.belongsTo(models.Office, {
        foreignKey: 'officeId',
        as: 'office',
        onDelete: 'SET NULL',
      });
    }
  }
  KioskRating.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
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
    type: {
      type: DataTypes.ENUM('citizen', 'business', 'government'),
      defaultValue: 'citizen'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    sex: {
      type: DataTypes.ENUM('Male', 'Female', 'Others'),
      defaultValue: 'Others'
    },
    age: {
      type: DataTypes.STRING,
      allowNull: true
    },
    residence: {
      type: DataTypes.STRING,
      allowNull: true
    },
    serviceAvailed: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    cc1: {
      type: DataTypes.ENUM('1', '2', '3', '4'),
      defaultValue: '4'
    },
    cc2: {
      type: DataTypes.ENUM('1', '2', '3', '4', '5'),
      defaultValue: '5'
    },
    cc3: {
      type: DataTypes.ENUM('1', '2', '3', '4', '5'),
      defaultValue: '5'
    },
    sqd0: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd1: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd2: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd3: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd4: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd5: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd6: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd7: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    sqd8: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    suggestion: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // how the text reads (positive / neutral / negative), as an AI model judged it when it was filed (utils/sentiment.js)
    sentiment: {
      type: DataTypes.ENUM('positive', 'neutral', 'negative'),
      allowNull: true
    },
    sentimentReason: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    sentimentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    entryFrom: {
      type: DataTypes.ENUM('kiosk', 'manual'),
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'KioskRating',
    tableName: 'kioskratings',
    timestamps: true,
  });
  return KioskRating;
};