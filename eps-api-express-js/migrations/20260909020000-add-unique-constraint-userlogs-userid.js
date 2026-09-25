'use strict';
/** @type {import('sequelize-cli').Migration} */
// models/userlog.js has always declared User.hasOne(UserLog) — a 1:1 relationship — but the
// table itself only ever had a plain (non-unique) index on userId, so nothing at the DB level
// actually enforced that. Under a race (the same user's app opening two socket connections at
// once, e.g. two tabs both connecting within the same tick), findOrCreate's SELECT-then-INSERT
// isn't atomic without a real unique constraint to catch the collision, and both connects could
// insert their own row — which is exactly what happened (see the "2 LEBDO" duplicate-in-the-Team-
// list report this migration follows). One duplicate pair was already cleaned up manually before
// this ships.
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('userlogs', {
      fields: ['userId'],
      type: 'unique',
      name: 'userlogs_userId_unique'
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('userlogs', 'userlogs_userId_unique');
  }
};
