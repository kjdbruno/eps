'use strict';

// The USERS of the previous system: its clients as citizen accounts, and its staff as staff accounts here.
//
// CLIENTS
//   - nobody can sign in yet: every account starts with a random password that nobody knows. A super/admin sends the
//     clients their account details from Preference > Client accounts: that makes each one a temporary password
//     (lowercase letters and digits) and emails it. The first login asks them to choose their own.
//   - the name is split into first/last name; the phone comes from the old record. The account is marked as seeded
//     (Citizen.origin = 'legacy'), which is what the Client accounts page works on, and the old verification codes are
//     dropped: receiving the email is the verification.
//
// STAFF  (needs the offices first: OfficeSeeder)
//   - old role -> role here: Administrator -> super, Supervisor -> admin, Encoder -> workstation; the account belongs to
//     the office it had (the Staff row).
//   - username  <office>.<first letter of the first name><last name>, lowercase, e.g. pio.mlatoja (a number is added
//     when two people would share one)
//   - password  the same as the username. It is only a starting point: the first login asks for a new one, and until
//     that is done the API refuses everything else.
//
// In both cases an account that already exists (same email, same username) is left exactly as it is.
//
// The data is in seeders/data/legacy (clients.json, staff.json; see utils/legacy/buildSeedData.js for how it was made).
//
// Run it:    npx sequelize-cli db:seed --seed 20261028010000-LegacyUserSeeder.js
// Undo it:   npx sequelize-cli db:seed:undo --seed 20261028010000-LegacyUserSeeder.js
//            (removes only the accounts this seeder made that have no feedback or responses left; undo the feedback
//            seeder first)
const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const { User, Citizen, Staff, Office, ComplaintDetail, Response, sequelize } = require('../models');
const clients = require('./data/legacy/clients.json');
const staff = require('./data/legacy/staff.json');

const AVATAR = '/uploads/avatar.png';

const seedClients = async () => {
    // a password nobody knows (nobody was ever given it): the account stays closed until its details are sent
    const password = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    const existing = new Set((await Citizen.findAll({ attributes: ['email'], raw: true })).map(c => c.email.toLowerCase()));

    let created = 0;
    let skipped = 0;
    for (const c of clients) {
        if (existing.has(c.email)) { skipped++; continue; }
        await sequelize.transaction(async (transaction) => {
            const user = await User.create({
                firstname: c.firstname, lastname: c.lastname, password, role: 'citizen', isActive: c.isActive,
                mustChangePassword: true,
                createdAt: new Date(c.createdAt), updatedAt: new Date(c.createdAt),
            }, { transaction });
            await Citizen.create({
                userId: user.id, email: c.email, phoneNo: c.phoneNo, isVerified: c.isVerified, verificationCode: null,
                verifiedAt: c.verifiedAt ? new Date(c.verifiedAt) : null, origin: 'legacy',
                createdAt: new Date(c.createdAt), updatedAt: new Date(c.createdAt),
            }, { transaction });
        });
        created++;
    }
    console.log(`LegacyUserSeeder: ${created} client accounts created, ${skipped} already had one.`);
};

const seedStaff = async () => {
    const officeId = new Map((await Office.findAll({ attributes: ['id', 'alias'], raw: true })).map(o => [o.alias, o.id]));
    const taken = new Set((await User.findAll({ where: { username: staff.map(s => s.username) }, attributes: ['username'], raw: true })).map(u => u.username));

    let created = 0;
    let skipped = 0;
    const noOffice = new Set();
    for (const s of staff) {
        if (taken.has(s.username)) { skipped++; continue; }
        if (!officeId.has(s.office)) { noOffice.add(s.office); continue; }
        // the password is the username; the first login asks for a new one
        const password = await bcrypt.hash(s.username, 10);
        await sequelize.transaction(async (transaction) => {
            const user = await User.create({
                firstname: s.firstname, lastname: s.lastname, username: s.username, password, role: s.role,
                avatar: AVATAR, isActive: s.isActive, mustChangePassword: true,
                createdAt: new Date(s.createdAt), updatedAt: new Date(s.createdAt),
            }, { transaction });
            await Staff.create({
                userId: user.id, officeId: officeId.get(s.office), createdAt: new Date(s.createdAt), updatedAt: new Date(s.createdAt),
            }, { transaction });
        });
        created++;
    }
    console.log(`LegacyUserSeeder: ${created} staff accounts created, ${skipped} already existed.`);
    if (noOffice.size) console.log(`  skipped the staff of offices that do not exist yet (${[...noOffice].join(', ')}): run the OfficeSeeder first.`);
};

module.exports = {
    async up() {
        await seedClients();
        await seedStaff();
    },

    async down() {
        // only the accounts made by this seeder (their creation time is the old system's), and none that now owns feedback
        const accounts = await Citizen.findAll({ where: { email: clients.map(c => c.email) }, include: { model: User, as: 'user' } });
        const madeAt = new Map(clients.map(c => [c.email, new Date(c.createdAt).getTime()]));
        const ours = accounts.filter(a => a.user && new Date(a.user.createdAt).getTime() === madeAt.get(a.email.toLowerCase()));
        const busy = new Set((await ComplaintDetail.findAll({ where: { userId: ours.map(a => a.userId) }, attributes: ['userId'], raw: true })).map(d => d.userId));
        const ids = ours.map(a => a.userId).filter(id => !busy.has(id));
        if (ids.length) {
            await Citizen.destroy({ where: { userId: ids } });
            await User.destroy({ where: { id: ids, role: 'citizen' } });
        }
        console.log(`LegacyUserSeeder: ${ids.length} client accounts removed, ${busy.size} kept because they own feedback.`);

        // staff: the same rule, with responses as what keeps an account
        const staffMadeAt = new Map(staff.map(s => [s.username, new Date(s.createdAt).getTime()]));
        const users = await User.findAll({ where: { username: staff.map(s => s.username) }, attributes: ['id', 'username', 'createdAt'], raw: true });
        const mine = users.filter(u => new Date(u.createdAt).getTime() === staffMadeAt.get(u.username));
        const wrote = new Set((await Response.findAll({ where: { userId: mine.map(u => u.id) }, attributes: ['userId'], raw: true })).map(r => r.userId));
        const staffIds = mine.map(u => u.id).filter(id => !wrote.has(id));
        if (staffIds.length) {
            await Staff.destroy({ where: { userId: staffIds } });
            await User.destroy({ where: { id: staffIds } });
        }
        console.log(`LegacyUserSeeder: ${staffIds.length} staff accounts removed, ${wrote.size} kept because they have responses.`);
    },
};
