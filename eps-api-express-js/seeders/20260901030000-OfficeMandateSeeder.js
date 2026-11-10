'use strict';

// The mandate of each office: what it is responsible for. Content-based auto-assignment (see matchOfficesToContent in
// ComplaintController.js) reads these to decide which office a feedback belongs to, so an office without one is never
// picked. They follow the functions each department lists on the city's own site,
// https://www.sanfernandocity.gov.ph/city-departments/ (read 2026-10-27), in plain words a citizen's concern can be
// matched against. Edit them anytime via Preference > Office in the internal app.
//
// Two offices are left without one on purpose: the Bids and Awards Committee is not on that page at all, and the
// Cooperative Development Office is listed there with a contact only, no functions. Add theirs when they are known.
//
// Run it again any time: it only sets the mandate of the offices below (matched by alias) and touches nothing else.
const MANDATES = [
  {
    alias: 'OCM',
    mandate: 'Handles the executive direction, control and management of city affairs — concerns about the city government as a whole, requests addressed to the Mayor, and anything that needs a decision from the city\'s chief executive.'
  },
  {
    alias: 'ADM',
    mandate: 'Handles administration of the city government — administrative processes, personnel programs and organizational development, and administrative support to the city during disasters. Concerns about how city hall operates or about city personnel that do not clearly belong to a more specific department.'
  },
  {
    alias: 'CLO',
    mandate: 'Handles the legal services of the city government — legal advice, representing the city in civil cases, and drafting or reviewing contracts and ordinances. Concerns that need legal action or a legal opinion.'
  },
  {
    alias: 'GSO',
    mandate: 'Handles the custody of city property and the maintenance services of city facilities — janitorial, security and landscaping — and the management of city records. Concerns about the upkeep, cleanliness or safety of city buildings and grounds, and lost or damaged city property.'
  },
  {
    alias: 'REG',
    mandate: 'Handles the civil registry — birth, marriage and death records, certified copies of civil registry documents, and marriage license applications.'
  },
  {
    alias: 'HRMO',
    mandate: 'Handles personnel management of the city government — recruitment, training, employee benefits and discipline. Concerns about hiring, job applications, or the benefits and conduct of city employees.'
  },
  {
    alias: 'CICTO',
    mandate: 'Handles information and communications technology of the city government — IT planning, information systems and networks, technology training, and IT equipment support. Concerns about the city\'s online systems and services, network and connectivity problems, and computer equipment.'
  },
  {
    alias: 'OCVM',
    mandate: 'Handles the work of the Vice Mayor, who presides over the Sangguniang Panlungsod and assumes the powers of the Mayor during a vacancy. Concerns addressed to the Vice Mayor or about how the city council is presided over.'
  },
  {
    alias: 'OSSP',
    mandate: 'Handles the records of the Sangguniang Panlungsod — the records and journals of council proceedings, certified copies of council records, and the translation and publication of ordinances. Requests for copies of ordinances, resolutions and council records.'
  },
  {
    alias: 'PDO',
    mandate: 'Handles city planning and development — development plans, studies, the monitoring of programs and projects, and people\'s participation in planning. Concerns about city development plans, zoning and land use, and proposed projects.'
  },
  {
    alias: 'OSM',
    mandate: 'Handles strategy management — the city\'s strategic plans and the alignment of each department\'s goals with the city\'s vision and priorities.'
  },
  {
    alias: 'CBO',
    mandate: 'Handles the city budget — the preparation and consolidation of the budget and its reporting. Questions about how city funds are budgeted for programs and projects.'
  },
  {
    alias: 'CTO',
    mandate: 'Handles the city\'s money — custody and disbursement of city funds, enforcement of taxes, and the tax information system. Concerns about payment of local taxes and fees, official receipts, tax collection, and the release of city payments.'
  },
  {
    alias: 'ACA',
    mandate: 'Handles the city\'s accounting — accounting records, the internal audit systems, and the financial statements of the city government.'
  },
  {
    alias: 'OCA',
    mandate: 'Handles real property assessment — the assessment of land and buildings, tax mapping, and certified assessment records. Concerns about the assessed value of a property, tax declarations and property maps.'
  },
  {
    alias: 'PIO',
    mandate: 'Handles public information — information about the city\'s programs and services, media relations, and the management of the city\'s official website and social media pages. Requests for public information, announcements, and concerns about the website or social media pages.'
  },
  {
    alias: 'AGR',
    mandate: 'Handles agricultural services — agricultural research and extension, and support for farmers and fishers. Concerns about farming and fishing assistance and agricultural programs.'
  },
  {
    alias: 'VET',
    mandate: 'Handles veterinary services — animal health, the regulation of slaughterhouses, and the inspection of poultry and dairy products. Concerns about sick, stray or aggressive animals, animal vaccination, slaughterhouses, and the safety of meat, poultry and dairy products.'
  },
  {
    alias: 'LEBDO',
    mandate: 'Handles local economic and business development — business and mayor\'s permits, business closures and notices. Concerns about applying for, renewing or closing a business permit.'
  },
  {
    alias: 'PESO',
    mandate: 'Handles public employment services — job referrals and employment information, DOLE programs, and the Special Program for the Employment of Students (SPES). Concerns about finding work, job fairs and student employment.'
  },
  {
    alias: 'EEM',
    mandate: 'Handles economic enterprise management — the administration and monitoring of the public markets, including the collection of market fees. Concerns about the public market: stalls, vendors, cleanliness, and market collections.'
  },
  {
    alias: 'OCE',
    mandate: 'Handles engineering and infrastructure — surveying, engineering designs, and the construction and maintenance of roads, bridges and public works. Concerns about road conditions, potholes, bridges, drainage and public construction projects.'
  },
  {
    alias: 'CHO',
    mandate: 'Handles public health — health services, health campaigns, and the sanitation inspection of food and lodging establishments. Concerns about health center services, sanitation and hygiene, and the sanitary condition of restaurants and lodging places.'
  },
  {
    alias: 'CSWD',
    mandate: 'Handles social welfare — social welfare programs, relief, and crisis intervention. Requests for assistance from families and individuals in difficult situations, and concerns about welfare programs.'
  },
  {
    alias: 'PDAO',
    mandate: 'Handles the affairs of persons with disability — PWD registration and ID cards, assistive devices, and educational assistance. Concerns about PWD IDs and benefits, and access for persons with disability.'
  },
  {
    alias: 'LIB',
    mandate: 'Handles the city library — its print and non-print collections and public internet access. Concerns about library services, books, and the library\'s internet access.'
  },
  {
    alias: 'GAD',
    mandate: 'Handles gender and development — gender mainstreaming, capacity building, and gender and development (GAD) reporting. Concerns about gender-related programs, trainings and gender sensitivity.'
  },
  {
    alias: 'LYDO',
    mandate: 'Handles youth development — the registration of youth organizations, the Local Youth Development Council, and the SK Teen Center. Concerns about youth programs, youth organizations and the teen center.'
  },
  {
    alias: 'CDRRMO',
    mandate: 'Handles disaster risk reduction and management — disaster risk reduction planning, hazard information, early warning systems, and emergency response. Concerns about floods, typhoons, earthquakes and other hazards, warnings, and emergencies.'
  },
  {
    alias: 'OPS',
    mandate: 'Handles public order and safety — programs for public order and safety, the enforcement of traffic rules, and traffic re-routing. Concerns about traffic congestion, illegal parking, traffic enforcement, peace and order, and public safety.'
  },
  {
    alias: 'CENRO',
    mandate: 'Handles the environment and natural resources — forest and watershed protection, seedling production, and pollution control together with national agencies. Concerns about pollution, illegal cutting of trees, garbage and waste, and protecting forests and watersheds.'
  },
];

module.exports = {
  async up(queryInterface) {
    for (const { alias, mandate } of MANDATES) {
      await queryInterface.bulkUpdate(
        'Offices',
        { mandate, updatedAt: new Date() },
        { alias }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'Offices',
      { mandate: null, updatedAt: new Date() },
      { alias: MANDATES.map(m => m.alias) }
    );
  }
};
