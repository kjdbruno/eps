'use strict';

// Demo Client Satisfaction Measurement (CSM) feedback across every office, spread over the last
// ~8 months of 2026 — enough for the Feedback page's Week/Month/Year analytics to all show
// something real instead of one lonely data point. Each office gets its own random "quality
// tier" so the avg-rating-by-office chart actually varies office to office, not a flat line.
module.exports = {
  async up(queryInterface) {
    const offices = await queryInterface.sequelize.query(
      'SELECT id FROM offices WHERE isActive = true',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!offices.length) return;

    const SQD_KEYS = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
    const TYPES = ['citizen', 'citizen', 'citizen', 'business', 'business', 'government'];
    const SEXES = ['Male', 'Female', 'Male', 'Female', 'Others'];
    const ENTRIES = ['kiosk', 'kiosk', 'kiosk', 'manual'];
    const SUGGESTIONS = [
      null, null, null,
      'Faster processing would help a lot.',
      'Staff were very accommodating, thank you.',
      'Please add more seating in the waiting area.',
      'The online form kept timing out.',
      'Great service, no complaints.',
    ];

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[randInt(0, arr.length - 1)];
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    // Spread across roughly the last 8 months of the year, weighted toward more recent months
    // (a real feedback volume tends to ramp up, not stay flat).
    const now = new Date('2026-09-04T12:00:00Z');
    const monthsBack = 8;
    const randomDateWithinMonths = () => {
      // Weight toward recent months: pick a month offset skewed low via two random draws.
      const offset = Math.min(randInt(0, monthsBack - 1), randInt(0, monthsBack - 1));
      const d = new Date(now);
      d.setMonth(d.getMonth() - offset);
      d.setDate(randInt(1, 28));
      d.setHours(randInt(8, 16), randInt(0, 59), 0, 0);
      // Never land in the future relative to `now` — matters for offset 0 (the current month),
      // where a day-of-month past today's date would otherwise slip past the analytics
      // endpoints' own "since <= date <= now" window and quietly disappear from every view.
      return d > now ? new Date(now.getTime() - randInt(0, 6) * 24 * 60 * 60 * 1000) : d;
    };

    const rows = [];
    const seedTime = new Date();

    for (const office of offices) {
      // Each office's own baseline (2.8-4.9 out of 5) so ratings cluster believably instead of
      // being uniformly random — some offices are just consistently better-reviewed than others.
      const baseline = 2.8 + Math.random() * 2.1;
      const ratingCount = randInt(6, 18);

      for (let i = 0; i < ratingCount; i++) {
        const sqdValues = {};
        SQD_KEYS.forEach((key) => {
          sqdValues[key] = clamp(Math.round(baseline + (Math.random() - 0.5) * 1.6), 1, 5);
        });

        // Awareness of the Citizen's Charter tends to track overall satisfaction loosely.
        const aware = Math.random() < (baseline / 5);
        const cc1 = aware ? pick(['1', '1', '2']) : pick(['3', '4']);
        const cc2 = cc1 === '4' ? '5' : pick(['1', '1', '2', '3']);
        const cc3 = cc1 === '4' ? '4' : pick(['1', '1', '2', '3']);

        rows.push({
          email: null,
          officeId: office.id,
          type: pick(TYPES),
          date: randomDateWithinMonths(),
          sex: pick(SEXES),
          age: String(randInt(18, 70)),
          residence: 'San Fernando City',
          serviceAvailed: null,
          cc1,
          cc2,
          cc3,
          ...sqdValues,
          suggestion: pick(SUGGESTIONS),
          isActive: true,
          entryFrom: pick(ENTRIES),
          createdAt: seedTime,
          updatedAt: seedTime,
        });
      }
    }

    await queryInterface.bulkInsert('kioskratings', rows);
  },

  async down(queryInterface) {
    // Only removes rows this seeder itself created — every row here has isActive true and no
    // email, which real kiosk/manual submissions almost always have one of, so this is a safe
    // enough fingerprint without needing to track individual ids.
    await queryInterface.bulkDelete('kioskratings', { email: null, residence: 'San Fernando City' });
  }
};
