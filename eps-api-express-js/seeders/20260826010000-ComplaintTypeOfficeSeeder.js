'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Placeholder default: routes the only category that exists today ("Traffic", id 1)
    // to Engineering (OCE) and Public Safety (OPS). There's no admin screen yet to manage
    // this mapping — that will live in the internal admin app — so adjust this table
    // directly (or re-seed) as real categories/offices get configured.
    await queryInterface.bulkInsert('complainttypeoffices', [
      { complaintTypeId: 1, officeId: 8, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { complaintTypeId: 1, officeId: 13, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('complainttypeoffices', null, {});
  }
};
