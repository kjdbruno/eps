'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Citizen extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Citizen.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  Citizen.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
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
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    verificationCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Password-reset code + expiry — separate from verificationCode (registration/email-verify
    // only). Cleared the moment a reset actually succeeds; a stale one left over from an
    // abandoned "forgot password" attempt is harmless since resetPassword also checks expiry.
    resetPasswordCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // where the account came from: 'legacy' = seeded from the previous system (the Client accounts page only sends those
    // their details); null = the person registered themselves
    origin: {
      type: DataTypes.STRING,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'Citizen',
    tableName: 'Citizens',
    timestamps: true
  });
  return Citizen;
};