'use strict';

// Indexes for what the screens filter and sort by. Without them MySQL reads the whole table for each of these: the sign-in lookups,
// the feedback list (newest first, by status), the notification badge, the CSM reports of an office, an office's queue, and the
// history of one record. Each is only added when it is not there yet, so this is safe to run again.
const INDEXES = [
  ['users', 'users_username_idx', ['username']],
  ['users', 'users_role_active_idx', ['role', 'isActive']],
  ['citizens', 'citizens_email_idx', ['email']],
  ['complaints', 'complaints_created_idx', ['createdAt']],
  ['complaints', 'complaints_status_created_idx', ['status', 'createdAt']],
  ['complaints', 'complaints_sentiment_idx', ['sentiment']],
  ['complaints', 'complaints_deadline_idx', ['resolutionDeadline']],
  ['complaintoffices', 'complaintoffices_office_active_idx', ['officeId', 'isActive', 'status']],
  ['complainthistories', 'complainthistories_complaint_created_idx', ['complaintId', 'createdAt']],
  ['responses', 'responses_complaint_created_idx', ['complaintId', 'createdAt']],
  ['notifications', 'notifications_receiver_read_idx', ['receiverId', 'isRead']],
  ['kioskratings', 'kioskratings_office_date_idx', ['officeId', 'date']],
  ['kioskratings', 'kioskratings_email_idx', ['email']],
  ['activitylogs', 'activitylogs_module_entity_idx', ['module', 'entityId', 'createdAt']],
  ['activitylogs', 'activitylogs_created_idx', ['createdAt']],
  ['discussions', 'discussions_status_idx', ['status']],
  ['polls', 'polls_status_idx', ['status']],
  ['clientinvites', 'clientinvites_status_created_idx', ['status', 'createdAt']],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    for (const [table, name, columns] of INDEXES) {
      const [found] = await sequelize.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = '${name}'`);
      if (found.length) continue;
      await queryInterface.addIndex(table, columns, { name });
    }
  },

  async down(queryInterface) {
    for (const [table, name] of INDEXES) {
      try { await queryInterface.removeIndex(table, name); } catch (e) { /* not there */ }
    }
  }
};
