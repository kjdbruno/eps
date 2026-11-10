'use strict';

// The offices. The first 19 keep their order (so their ids stay 1-19: the staff, workstation and complaint-type
// seeders refer to them by id), then come the offices of the previous system that this app did not have, taken from
// its database (seeders/data/legacy/offices.json, made by utils/legacy/buildSeedData.js). An old office is matched to
// these by code (the two named differently there are in utils/legacy/officeAlias.js), so it is never added twice.
//
// An office that already exists (same alias) is left alone, so this can be run again on a database that already has
// the first 19 to add only the missing ones. The added offices have no mandate yet: until one is set in Preference >
// Office, the AI does not pick them when it routes feedback.
const legacyOffices = require('./data/legacy/offices.json');

const OFFICES = [
  { name: 'City Information and Communications Technology Office', alias: 'CICTO', email: 'cicto@sanfernandocity.gov.ph' },
  { name: 'City Public Information Office', alias: 'PIO', email: 'pio@sanfernandocity.gov.ph' },
  { name: 'Office of the City Administrator', alias: 'ADM', email: 'adm@sanfernandocity.gov.ph' },
  { name: 'Office of the City Agriculturist', alias: 'AGR', email: 'agr@sanfernandocity.gov.ph' },
  { name: 'Office of the City Health Officer', alias: 'CHO', email: 'cho@sanfernandocity.gov.ph' },
  { name: 'Office of the City Legal Officer', alias: 'CLO', email: 'clo@sanfernandocity.gov.ph' },
  { name: 'Office of the City Treasurer', alias: 'CTO', email: 'cto@sanfernandocity.gov.ph' },
  { name: 'Office of the City Engineering', alias: 'OCE', email: 'oce@sanfernandocity.gov.ph' },
  { name: 'Office of the City Environment and Natural Resources', alias: 'CENRO', email: 'enr@sanfernandocity.gov.ph' },
  { name: 'Office of the City General Services Officer', alias: 'GSO', email: 'gso@sanfernandocity.gov.ph' },
  { name: 'Office of the City Market Supervisor', alias: 'EEM', email: 'eem@sanfernandocity.gov.ph' },
  { name: 'Office of the City Assessor', alias: 'OCA', email: 'oca@sanfernandocity.gov.ph' },
  { name: 'Office for Public Safety', alias: 'OPS', email: 'ops@sanfernandocity.gov.ph' },
  { name: 'Office of Secretary to the Sangguniang Panglungsod', alias: 'OSSP', email: 'ossp@sanfernandocity.gov.ph' },
  { name: 'Office of the City Planning and Development Coordinator', alias: 'PDO', email: 'pdo@sanfernandocity.gov.ph' },
  { name: 'Office of the Local Economic and Business Development Officer', alias: 'LEBDO', email: 'lebdo@sanfernandocity.gov.ph' },
  { name: 'Office of the City Civil Registrar', alias: 'REG', email: 'reg@sanfernandocity.gov.ph' },
  { name: 'Office of the City Social Welfare and Development Officer', alias: 'CSWD', email: 'swd@sanfernandocity.gov.ph' },
  { name: 'Office of the City Veterinarian', alias: 'VET', email: 'vet@sanfernandocity.gov.ph' },
];

// the offices of the previous system that are not above, in the order that system listed them. The old record has no
// email, so each gets the address every other office follows: <alias>@sanfernandocity.gov.ph
const known = new Set(OFFICES.map(o => o.alias));
const FROM_LEGACY = legacyOffices
  .filter(o => !known.has(o.alias))
  .map(o => ({ name: o.name, alias: o.alias, email: `${o.alias.toLowerCase()}@sanfernandocity.gov.ph`, isActive: o.isActive }));

const ALL = [...OFFICES, ...FROM_LEGACY];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    const [rows] = await queryInterface.sequelize.query('SELECT alias FROM Offices');
    const have = new Set(rows.map(r => String(r.alias).toLowerCase()));
    const missing = ALL.filter(o => !have.has(o.alias.toLowerCase()));

    if (missing.length) {
      const now = new Date();
      // isActive is written for every row: a bulk insert whose rows differ in their columns stores NULL (not the column's
      // default) where one is left out, and an office with a NULL isActive is not listed anywhere
      await queryInterface.bulkInsert('Offices', missing.map(o => ({ ...o, isActive: o.isActive !== false, createdAt: now, updatedAt: now })));
    }
    console.log(`OfficeSeeder: ${missing.length} offices added (${missing.filter(o => FROM_LEGACY.some(l => l.alias === o.alias)).length} from the previous system), ${ALL.length - missing.length} already there.`);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Offices', { alias: ALL.map(o => o.alias) });
  }
};
