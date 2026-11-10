'use strict';

// Starter holiday calendar (2026 Philippine regular + special non-working days) so the
// office acknowledgement deadline (see utils/businessHours.js) has something to
// exclude out of the box. Edit anytime via Preference > Holiday in the internal app — dates
// shift year to year (esp. movable feasts), this is just a reasonable starting point.
// category: regular holiday, special non-working day (special), special working day (working) or a day of the city (local)
const SPECIAL = ['Chinese New Year', 'Black Saturday', 'Ninoy Aquino Day', "All Saints' Day", 'Feast of the Immaculate Conception', 'Christmas Eve', "New Year's Eve"];
const WORKING = ['EDSA People Power Anniversary'];
const categoryOf = (name) => (SPECIAL.includes(name) ? 'special' : (WORKING.includes(name) ? 'working' : 'regular'));
const HOLIDAYS = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-25', name: 'EDSA People Power Anniversary' },
  { date: '2026-04-02', name: 'Maundy Thursday' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-04', name: 'Black Saturday' },
  { date: '2026-04-09', name: 'Araw ng Kagitingan' },
  { date: '2026-05-01', name: 'Labor Day' },
  { date: '2026-06-12', name: 'Independence Day' },
  { date: '2026-08-21', name: 'Ninoy Aquino Day' },
  { date: '2026-08-31', name: 'National Heroes Day' },
  { date: '2026-11-01', name: "All Saints' Day" },
  { date: '2026-11-30', name: 'Bonifacio Day' },
  { date: '2026-12-08', name: 'Feast of the Immaculate Conception' },
  { date: '2026-12-24', name: 'Christmas Eve' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-30', name: 'Rizal Day' },
  { date: '2026-12-31', name: "New Year's Eve" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'holidays',
      HOLIDAYS.map(h => ({ ...h, category: categoryOf(h.name), isActive: true, createdAt: now, updatedAt: now }))
    );
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete('holidays', { date: { [Op.in]: HOLIDAYS.map(h => h.date) } });
  }
};
