'use strict';

// Sample canned messages: ready-made replies an office picks while answering a citizen (the pills on the Conversation
// tab). Each has a short title (what it is for) and the message. Placeholders such as {firstname}, {name}, {reference}, {office}, {offices}, {staff},
// {status}, {filed}, {deadline} and {today} are filled in with the feedback's data when it is picked or sent.
// Edit, add or switch them off anytime under Preference > Canned messages.
//
// Run it:    npx sequelize-cli db:seed --seed 20261028030000-CannedMessageSeeder.js
// Run it again any time: a message whose title already exists is left as it is, so it never piles up duplicates.
const MESSAGES = [
  {
    title: 'Received',
    message: 'Good day, {firstname}! Your feedback {reference} has been received by {office}. We are looking into it and will update you here.'
  },
  {
    title: 'Under review',
    message: 'Thank you for your patience, {firstname}. {office} is reviewing your feedback and will get back to you as soon as possible.'
  },
  {
    title: 'Need more details',
    message: 'Hello {firstname}, to help us act on your feedback {reference}, could you please tell us the exact location or send a photo of the concern? Thank you.'
  },
  {
    title: 'Site inspection',
    message: 'A staff member from {office} will visit the area to check the concern. We will update you once the inspection is done.'
  },
  {
    title: 'Scheduled for action',
    message: 'Your concern has been scheduled for action. {office} will let you know once it is done.'
  },
  {
    title: 'In progress',
    message: 'Work on your concern has started. {office} will keep you posted on the progress.'
  },
  {
    title: 'Needs more time',
    message: 'Your concern needs a little more time to resolve properly. We have asked for an extension and will keep you updated. Thank you for your understanding.'
  },
  {
    title: 'Referred to another office',
    message: 'Your feedback is for another office, so we are passing it on to the department that handles it. They will respond to you here.'
  },
  {
    title: 'Outside our mandate',
    message: 'Thank you for reaching out. This concern is outside the mandate of {office}, so we are not able to act on it directly.'
  },
  {
    title: 'Resolved',
    message: 'Dear {name},\n\nYour concern {reference} has been addressed. If the problem comes back, please file it again and we will respond right away.\n\n{staff}\n{office}'
  },
  {
    title: 'Thank you',
    message: 'Thank you for sharing your feedback with us, {firstname}. It helps the city serve you better.'
  },
];

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query('SELECT title FROM cannedmessages');
    const have = new Set(rows.map(r => String(r.title).toLowerCase()));
    const missing = MESSAGES.filter(m => !have.has(m.title.toLowerCase()));
    if (missing.length) {
      const now = new Date();
      // isActive on every row: rows of a bulk insert that differ in their columns get NULL, not the default
      await queryInterface.bulkInsert('cannedmessages', missing.map(m => ({ ...m, isActive: true, createdAt: now, updatedAt: now })));
    }
    console.log(`CannedMessageSeeder: ${missing.length} messages added, ${MESSAGES.length - missing.length} already there.`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cannedmessages', { title: MESSAGES.map(m => m.title) });
  }
};
