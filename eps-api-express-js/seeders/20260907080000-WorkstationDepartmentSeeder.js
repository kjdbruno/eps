'use strict';
const bcrypt = require('bcrypt');

// One workstation-role account per office (all 19 from OfficeSeeder), so every department can be
// exercised from the internal app the same way CICTO/PIO already can. PIO additionally gets its
// own admin-role account (on top of its workstation one) per explicit request — every other
// office gets a workstation account only.
const OFFICES = [
    { id: 1, alias: 'CICTO' },
    { id: 2, alias: 'PIO' },
    { id: 3, alias: 'ADM' },
    { id: 4, alias: 'AGR' },
    { id: 5, alias: 'CHO' },
    { id: 6, alias: 'CLO' },
    { id: 7, alias: 'CTO' },
    { id: 8, alias: 'OCE' },
    { id: 9, alias: 'CENRO' },
    { id: 10, alias: 'GSO' },
    { id: 11, alias: 'EEM' },
    { id: 12, alias: 'OCA' },
    { id: 13, alias: 'OPS' },
    { id: 14, alias: 'OSSP' },
    { id: 15, alias: 'PDO' },
    { id: 16, alias: 'LEBDO' },
    { id: 17, alias: 'REG' },
    { id: 18, alias: 'CSWD' },
    { id: 19, alias: 'VET' },
];

// Explicit ids for this seeder's own block — well clear of the live Users table (max id was 81
// when this was written) so these can never collide with organically-created accounts, and keep
// this seeder's rows trivially identifiable/reversible by id range in down().
const FIRST_USER_ID = 500;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const defaultPassword = await bcrypt.hash('sfcity98', 10);
        const now = new Date();

        const users = [];
        const staff = [];
        let nextId = FIRST_USER_ID;

        OFFICES.forEach(office => {
            const workstationId = nextId++;
            users.push({
                id: workstationId,
                firstname: office.alias,
                lastname: 'Workstation',
                username: `workstation.${office.alias.toLowerCase()}`,
                password: defaultPassword,
                role: 'workstation',
                avatar: '/uploads/avatar.png',
                isActive: true,
                createdAt: now,
                updatedAt: now,
            });
            staff.push({ userId: workstationId, officeId: office.id, createdAt: now, updatedAt: now });

            if (office.alias === 'PIO') {
                const adminId = nextId++;
                users.push({
                    id: adminId,
                    firstname: office.alias,
                    lastname: 'Admin',
                    username: `admin.${office.alias.toLowerCase()}`,
                    password: defaultPassword,
                    role: 'admin',
                    avatar: '/uploads/avatar.png',
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                });
                staff.push({ userId: adminId, officeId: office.id, createdAt: now, updatedAt: now });
            }
        });

        await queryInterface.bulkInsert('Users', users);
        await queryInterface.bulkInsert('Staffs', staff);
    },

    async down(queryInterface, Sequelize) {
        const { Op } = Sequelize;
        const range = { [Op.gte]: FIRST_USER_ID, [Op.lt]: FIRST_USER_ID + 100 };
        await queryInterface.bulkDelete('Staffs', { userId: range });
        await queryInterface.bulkDelete('Users', { id: range });
    }
};
