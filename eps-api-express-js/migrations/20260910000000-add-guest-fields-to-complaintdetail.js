'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Guest (OTP) and staff-filed complaints no longer mint a placeholder citizen User/Citizen row
  // just to attribute the complaint — that "shadow account" quietly reserved the email, forced a
  // messy adopt-on-register path, and could de-anonymize an anonymous filer who later registered
  // with the same address. Instead the contact info lives directly on the ComplaintDetail, and the
  // citizen links the complaint to an account explicitly via the existing "claim" flow. So:
  // userId becomes nullable (null until claimed), and four guest_* columns hold what the shadow
  // Citizen/User used to.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('complaintdetails', 'guestFirstName', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('complaintdetails', 'guestLastName', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('complaintdetails', 'guestEmail', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('complaintdetails', 'guestPhone', { type: Sequelize.STRING, allowNull: true });
    // Raw MODIFY rather than queryInterface.changeColumn — the latter re-emits the column with
    // its NOT NULL intact (and can trip over the existing FK) on this MySQL setup. A bare
    // nullability change keeps the userId -> Users.id foreign key untouched.
    await queryInterface.sequelize.query('ALTER TABLE complaintdetails MODIFY COLUMN userId INT NULL');
  },
  async down(queryInterface, Sequelize) {
    // Best-effort: only reverts the schema. Any complaint filed under the new flow will have a
    // null userId, so re-tightening the NOT NULL would fail — left to the operator to decide.
    await queryInterface.removeColumn('complaintdetails', 'guestFirstName');
    await queryInterface.removeColumn('complaintdetails', 'guestLastName');
    await queryInterface.removeColumn('complaintdetails', 'guestEmail');
    await queryInterface.removeColumn('complaintdetails', 'guestPhone');
  }
};
