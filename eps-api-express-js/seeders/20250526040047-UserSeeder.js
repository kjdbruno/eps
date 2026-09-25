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
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        firstname: 'CICTO',
        lastname: 'CSFLU', 
        username: 'Administrator', 
        password: hashedPassword, 
        role: 'admin', 
        avatar: '/uploads/avatar.png',
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        firstname: 'Zhandra Louisa',
        lastname: 'Manongdo', 
        username: 'zlmanongdo', 
        password: defaultPassword, 
        role: 'admin', 
        avatar: '/uploads/avatar.png',
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        firstname: 'Erwin',
        lastname: 'Beleo', 
        username: 'ebeleo', 
        password: defaultPassword, 
        role: 'admin', 
        avatar: '/uploads/avatar.png',
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        firstname: 'CICTO',
        lastname: 'CSFLU', 
        username: 'Workstation', 
        password: hashedPassword, 
        role: 'workstation', 
        avatar: '/uploads/avatar.png',
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Users', null, {});
  }
};
