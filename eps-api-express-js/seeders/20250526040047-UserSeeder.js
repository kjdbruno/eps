'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    const hashedPassword = await bcrypt.hash('ITdepSFC!TY98', 10);
    const defaultPassword = await bcrypt.hash('sfcity98', 10);

    await queryInterface.bulkInsert('Users', [
      { 
        firstname: 'CICTO',
        lastname: 'CSFLU', 
        username: 'SuperAdministrator', 
        password: hashedPassword, 
        role: 'super', 
        avatar: '/uploads/avatar.png',
        isActive: true, 
        // this password is written in this file, so everybody who can read it knows it: the account must choose its own at the first sign-in
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]);

    // the account belongs to CICTO (needs the offices first: OfficeSeeder)
    const userId = await queryInterface.rawSelect('Users', { where: { username: 'SuperAdministrator' } }, ['id']);
    const officeId = await queryInterface.rawSelect('Offices', { where: { alias: 'CICTO' } }, ['id']);
    if (userId && officeId) {
      await queryInterface.bulkInsert('Staffs', [
        { userId, officeId, createdAt: new Date(), updatedAt: new Date() },
      ]);
    } else {
      console.log('UserSeeder: the CICTO office does not exist yet, so SuperAdministrator was not linked to it. Run the OfficeSeeder first.');
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    const userId = await queryInterface.rawSelect('Users', { where: { username: 'SuperAdministrator' } }, ['id']);
    if (userId) await queryInterface.bulkDelete('Staffs', { userId });
    await queryInterface.bulkDelete('Users', null, {});
  }
};
