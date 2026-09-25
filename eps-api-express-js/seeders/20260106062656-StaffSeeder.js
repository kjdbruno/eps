'use strict';

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
   await queryInterface.bulkInsert('Staffs', [
      { 
        userId: 1,
        officeId: 1,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        userId: 2,
        officeId: 1,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        userId: 3,
        officeId: 1,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        userId: 4,
        officeId: 2,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        userId: 2,
        officeId: 1,
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
    await queryInterface.bulkDelete('Staffs', null, {});
  }
};
