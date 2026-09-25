'use strict';

// Starter mandates + SLA targets for the offices seeded by 20250313033155-OfficeSeeder.js, so
// content-based auto-assignment (see matchOfficesToContent in ComplaintController.js) has
// something to match against out of the box. These are reasonable defaults based on each
// office's standard LGU function — edit them anytime via Preference > Office in the internal app.
const MANDATES = [
  {
    alias: 'CICTO',
    mandate: 'Handles the city government\'s information systems, websites, online services, network infrastructure, and technical/IT-related concerns — including issues with online public services, city Wi-Fi, or digital records.',
    slaDays: 5
  },
  {
    alias: 'PIO',
    mandate: 'Handles public communications and information dissemination — press releases, official announcements, media relations, and requests for public information about city programs and events.',
    slaDays: 3
  },
  {
    alias: 'ADM',
    mandate: 'Handles general administrative coordination across city departments and oversight of city hall operations — general concerns about administrative processes or staff conduct, and anything that doesn\'t clearly belong to a more specific department.',
    slaDays: 5
  },
  {
    alias: 'AGR',
    mandate: 'Handles agricultural support and extension services — farming assistance, crop and livestock concerns, fisheries, pest infestations affecting farmland, and agricultural program inquiries.',
    slaDays: 5
  },
  {
    alias: 'CHO',
    mandate: 'Handles public health concerns — sanitation and hygiene issues, food safety complaints, communicable disease reports, health center and clinic services, and health inspections of establishments.',
    slaDays: 3
  },
  {
    alias: 'CLO',
    mandate: 'Handles legal matters concerning the city government — ordinance violations, contract disputes involving the city, requests for legal opinions, and complaints requiring legal action or investigation.',
    slaDays: 7
  },
  {
    alias: 'CTO',
    mandate: 'Handles revenue collection and financial transactions with the city — real property tax, business tax payments, billing discrepancies, and concerns about fees, receipts, or payment processing.',
    slaDays: 5
  },
  {
    alias: 'OCE',
    mandate: 'Handles roads, bridges, drainage, and public infrastructure construction and repair — potholes, damaged roads, broken streetlights, flooding caused by poor drainage, and building/construction-related concerns.',
    slaDays: 5
  },
  {
    alias: 'CENRO',
    mandate: 'Handles environmental concerns — garbage collection and waste management, illegal dumping, air/water/noise pollution, illegal tree cutting, and other environmental violations.',
    slaDays: 3
  },
  {
    alias: 'GSO',
    mandate: 'Handles maintenance of city government properties, facilities, and vehicles — repairs to government buildings, janitorial and security services in public facilities, and general supply/logistics concerns.',
    slaDays: 5
  },
  {
    alias: 'EEM',
    mandate: 'Handles public market operations — vendor and stall concerns, market cleanliness and sanitation, overpricing complaints, and issues within city-operated public markets.',
    slaDays: 4
  },
  {
    alias: 'OCA',
    mandate: 'Handles real property assessment and valuation — tax declaration concerns, property classification disputes, and requests related to property assessment records.',
    slaDays: 7
  },
  {
    alias: 'OPS',
    mandate: 'Handles public safety, traffic enforcement, peace and order, and emergency response — traffic violations, illegal parking, road accidents, and community safety concerns.',
    slaDays: 3
  },
  {
    alias: 'OSSP',
    mandate: 'Handles city council (Sangguniang Panglungsod) records and processes — copies of ordinances and resolutions, public hearing schedules, and concerns about council sessions and legislative matters.',
    slaDays: 7
  },
  {
    alias: 'PDO',
    mandate: 'Handles city planning and land use — zoning concerns, urban development plans, land use classification disputes, and questions about development and building permits\' compliance with the city\'s land use plan.',
    slaDays: 7
  },
  {
    alias: 'LEBDO',
    mandate: 'Handles business permits and local economic development — business registration and licensing concerns, permit processing delays, and inquiries about business development programs and incentives.',
    slaDays: 5
  },
  {
    alias: 'REG',
    mandate: 'Handles civil registry documents — birth, death, and marriage certificates, civil registration record corrections, and requests for copies of civil registry documents.',
    slaDays: 5
  },
  {
    alias: 'CSWD',
    mandate: 'Handles social welfare programs and assistance — financial or medical aid requests, child, elderly, and PWD welfare concerns, disaster relief assistance, and social services program inquiries.',
    slaDays: 5
  },
  {
    alias: 'VET',
    mandate: 'Handles animal-related concerns — stray or aggressive animals, rabies control and vaccination, livestock health, animal welfare complaints, and veterinary services.',
    slaDays: 4
  },
];

module.exports = {
  async up(queryInterface) {
    for (const { alias, mandate, slaDays } of MANDATES) {
      await queryInterface.bulkUpdate(
        'Offices',
        { mandate, slaDays, updatedAt: new Date() },
        { alias }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'Offices',
      { mandate: null, slaDays: null, updatedAt: new Date() },
      { alias: MANDATES.map(m => m.alias) }
    );
  }
};
