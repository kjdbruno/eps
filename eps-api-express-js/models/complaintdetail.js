// models/complaintDetail.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => { // <--- THIS IS THE REQUIRED FUNCTION EXPORT
  class ComplaintDetail extends Model {
    static associate(models) {
      ComplaintDetail.belongsTo(models.Complaint, {
        foreignKey: 'complaintId',
        as: 'complaint',
        onDelete: 'CASCADE',
      });
      ComplaintDetail.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  ComplaintDetail.init({
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
    // Null while a complaint is unclaimed — a guest (OTP) or staff-filed complaint holds its
    // contact info in the guest* fields below instead of pointing at a placeholder account. Set
    // (via claimComplaint) once the citizen links it to their real account.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Contact info captured at filing time for a complaint with no account behind it (userId
    // null). guestEmail is always set for an OTP/staff complaint (it's the delivery address for
    // the OTP and every progress update); guestFirstName/guestLastName are left null when the
    // complaint was filed anonymously.
    guestFirstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestLastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Captured client-side (browser/device geolocation) at the moment a CITIZEN files feedback —
    // required for a guest (OTP) or signed-in citizen filing, see ComplaintValidator.validateForm
    // and ComplaintController.createAccountComplaint. Nullable at the DB level because a
    // staff-filed complaint (createStaffComplaint) never collects it — staff may be relaying a
    // phone/walk-in report with no citizen present to grant location access.
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ComplaintDetail',
    tableName: 'complaintdetails',
    timestamps: true,
  });
  return ComplaintDetail;
};