'use strict';

// Turns the PREVIOUS system's database (the Laravel one, tables users / user_clients / feedback / ...) into the data
// files the two Legacy seeders read (seeders/data/legacy). Run it only when you have a newer dump of that database:
//
//   1. import the dump into a scratch database, e.g.   mysql -uroot -p -e "CREATE DATABASE eps_legacy_tmp"
//                                                       mysql -uroot -p eps_legacy_tmp < db_eps_latest.sql
//      (NEVER into the app's own database: the dump drops and recreates tables with the same names)
//   2. node utils/legacy/buildSeedData.js              (LEGACY_DB_NAME=... if the scratch database is named otherwise)
//   3. npx sequelize-cli db:seed --seed 20250313033155-OfficeSeeder.js
//      npx sequelize-cli db:seed --seed 20261028010000-LegacyUserSeeder.js
//      npx sequelize-cli db:seed --seed 20261028020000-LegacyFeedbackSeeder.js
//
// What it keeps, and how it is reshaped to this app:
//   - offices  the old office list (the OfficeSeeder adds the ones this app does not have yet).
//   - clients  the users with the Citizen role: the name is split into first/last, the phone and the verified flag are
//              kept, avatars and the old password hashes are not.
//   - staff    the users with the Administrator / Supervisor / Encoder role, with their office: Administrator -> super,
//              Supervisor -> admin, Encoder -> workstation. Each gets the username  <office>.<first letter of the first
//              name><last name>  (lowercase, a number added when two people would share one). The password is set by
//              the seeder: the office code.
//   - feedback every feedback of the clients with the offices it was routed to, every response (who said what and
//              when), every rating, and its photos (re-compressed the way the app compresses uploads). Videos are left
//              out: the app only shows images.
//   - times    the old system stored local (Manila) time; they are written out as exact instants.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const { aliasOf } = require('./officeAlias');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const OUT = path.join(__dirname, '../../seeders/data/legacy');
const LEGACY_DB = process.env.LEGACY_DB_NAME || 'eps_legacy_tmp';

const ROLE = { 1: 'administrator', 2: 'supervisor', 4: 'staff', 5: 'client' };
// the old role -> this app's role, for the staff accounts
const STAFF_ROLE = { 1: 'super', 2: 'admin', 4: 'workstation' };

// the old timestamps are naive Manila time
const instant = (value) => (value ? new Date(String(value).replace(' ', 'T') + '+08:00').toISOString() : null);

// ---------------------------------------------------------------------------------------------- names
const SUFFIX = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);
const PARTICLE = new Set(['de', 'del', 'dela', 'delos', 'la', 'los', 'las', 'san', 'santa', 'sta', 'sta.', 'st', 'st.', 'da', 'di', 'van', 'von', 'al', 'el']);

const titleCase = (text) => text.toLowerCase().replace(/(^|[\s\-'.])([a-zñ])/g, (m, a, b) => a + b.toUpperCase());
// ALL CAPS and all lowercase are typing habits, not names: tidy them, leave a mixed-case name alone
const tidy = (text) => (text === text.toUpperCase() || text === text.toLowerCase() ? titleCase(text) : text);

// "Maria Dela Cruz" -> Maria / Dela Cruz; "Paulo C. Pimentel" -> Paulo C. / Pimentel; "Kevin" -> Kevin / ''
const splitName = (raw) => {
    const name = tidy(String(raw || '').replace(/\s+/g, ' ').trim());
    if (!name) return { firstname: '', lastname: '' };
    if (name.includes(',')) {
        const [last, ...first] = name.split(',');
        return { firstname: first.join(',').trim(), lastname: last.trim() };
    }
    const tokens = name.split(' ');
    if (tokens.length === 1) return { firstname: tokens[0], lastname: '' };
    const tail = [];
    while (tokens.length > 1 && SUFFIX.has(tokens[tokens.length - 1].toLowerCase())) tail.unshift(tokens.pop());
    if (tokens.length === 1) return { firstname: tokens[0], lastname: tail.join(' ') };
    const last = [tokens.pop()];
    while (tokens.length > 1 && PARTICLE.has(tokens[tokens.length - 1].toLowerCase())) last.unshift(tokens.pop());
    return { firstname: tokens.join(' '), lastname: [...last, ...tail].join(' ') };
};

// <office>.<first letter of the first name><last name>, lowercase letters and digits only ("pio.mlatoja"). A one-word name
// has no last name, so the whole name is used. A taken username gets a number (pio.mlatoja2).
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const usernameFor = (alias, firstname, lastname, taken) => {
    const tail = lastname ? plain(firstname).slice(0, 1) + plain(lastname) : plain(firstname);
    const base = `${plain(alias)}.${tail || 'user'}`;
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base}${n}`;
    taken.add(name);
    return name;
};

// ---------------------------------------------------------------------------------------------- pictures
// The same shape the app gives an uploaded photo (see saveComplaintFiles): 800px wide at most, recompressed. Phone
// photos carry their rotation in the metadata, which the re-encode drops, so it is applied first.
const savePicture = async (dataUri, dir, id) => {
    const match = /^data:image\/(png|jpe?g|webp|avif|gif);base64,/i.exec(dataUri || '');
    if (!match) return null;
    const isPng = match[1].toLowerCase() === 'png';
    const input = Buffer.from(dataUri.slice(match[0].length), 'base64');
    const base = () => sharp(input).rotate().resize({ width: 800, withoutEnlargement: true });
    const asJpeg = () => base().flatten({ background: '#ffffff' }).jpeg({ quality: 75 }).toBuffer();
    let buffer; let ext;
    if (isPng) {
        // a phone screenshot kept as PNG is several times the size of the same picture as JPEG: only small PNGs stay PNG
        buffer = await base().png({ quality: 80 }).toBuffer(); ext = 'png';
        if (buffer.length > 150000) { buffer = await asJpeg(); ext = 'jpg'; }
    } else {
        buffer = await asJpeg(); ext = 'jpg';
    }
    const filename = `${id}.${ext}`;
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    fs.writeFileSync(path.join(OUT, dir, filename), buffer);
    return { filename: `${dir === 'evidence' ? 'evidence' : 'attachment'}-${id}.${ext}`, path: `${dir}/${filename}` };
};

// ---------------------------------------------------------------------------------------------- build
const main = async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASS,
        database: LEGACY_DB, charset: 'utf8mb4', dateStrings: true,
    });
    const q = async (sql) => (await db.query(sql))[0];
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });

    // ---- clients
    const clientRows = await q(`
        SELECT u.id, u.name, LOWER(TRIM(u.email)) email, u.created_at, c.number, c.verification, c.isVerified, c.isActive, c.updated_at
        FROM users u
        JOIN user_roles r ON r.userID = u.id AND r.roleID = 5
        JOIN user_clients c ON c.userID = u.id
        ORDER BY u.id`);
    const clients = clientRows.map((c) => ({
        email: c.email,
        ...splitName(c.name),
        phoneNo: (c.number || '').trim(),
        isVerified: !!c.isVerified,
        verificationCode: c.isVerified || !c.verification ? null : String(c.verification),
        isActive: !!c.isActive,
        createdAt: instant(c.created_at),
        verifiedAt: c.isVerified ? instant(c.updated_at) : null,
    }));
    const emailOf = new Map(clientRows.map((c) => [c.id, c.email]));
    fs.writeFileSync(path.join(OUT, 'clients.json'), JSON.stringify(clients, null, 1));
    console.log(`clients: ${clients.length} (${clients.filter(c => c.isVerified).length} verified, ${clients.filter(c => !c.lastname).length} with one-word names)`);

    // ---- offices
    const officeRows = await q('SELECT id, code, label, isActive FROM preference_offices ORDER BY id');
    fs.writeFileSync(path.join(OUT, 'offices.json'), JSON.stringify(officeRows.map((o) => ({
        code: o.code, alias: aliasOf(o.code), name: o.label.trim(), isActive: !!o.isActive,
    })), null, 1));
    console.log(`offices: ${officeRows.length}`);

    // ---- staff
    const staffRows = await q(`
        SELECT u.id, u.name, u.created_at, r.roleID, o.code, a.isActive
        FROM users u
        JOIN user_roles r ON r.userID = u.id AND r.roleID IN (1, 2, 4)
        JOIN user_admins a ON a.userID = u.id
        JOIN preference_offices o ON o.id = a.officeID
        ORDER BY u.id`);
    const taken = new Set();
    const staff = staffRows.map((s) => {
        const alias = aliasOf(s.code);
        const name = splitName(s.name);
        return {
            legacyId: s.id,
            ...name,
            username: usernameFor(alias, name.firstname, name.lastname, taken),
            role: STAFF_ROLE[s.roleID],
            office: alias,
            isActive: !!s.isActive,
            createdAt: instant(s.created_at),
        };
    });
    fs.writeFileSync(path.join(OUT, 'staff.json'), JSON.stringify(staff, null, 1));
    console.log('staff:', staff.length, staff.reduce((m, s) => ({ ...m, [s.role]: (m[s.role] || 0) + 1 }), {}));

    // ---- who wrote what: an account's role, and for office staff the office they belong to
    const people = new Map();
    for (const p of await q(`
        SELECT u.id, r.roleID, o.code
        FROM users u JOIN user_roles r ON r.userID = u.id
        LEFT JOIN user_admins a ON a.userID = u.id
        LEFT JOIN preference_offices o ON o.id = a.officeID`)) {
        people.set(p.id, { role: ROLE[p.roleID] || 'staff', code: p.code || null });
    }
    const supervisorRank = new Map((await q(`SELECT userID FROM user_roles WHERE roleID = 2 ORDER BY userID`)).map((r, i) => [r.userID, i]));

    // ---- feedback
    const offices = new Map((await q('SELECT id, code, label FROM preference_offices')).map((o) => [o.id, o]));
    const feedback = await q('SELECT * FROM feedback ORDER BY id');
    const links = await q('SELECT * FROM feedback_offices ORDER BY feedbackID, id');
    const responses = await q('SELECT * FROM feedback_responses ORDER BY feedbackID, created_at, id');
    const ratings = new Map((await q('SELECT * FROM feedback_ratings ORDER BY id')).map((r) => [r.responseID, r]));
    const evidence = await q('SELECT id, feedbackID FROM feedback_evidence ORDER BY id');

    const linksOf = new Map(); const responsesOf = new Map(); const evidenceOf = new Map();
    for (const l of links) (linksOf.get(l.feedbackID) || linksOf.set(l.feedbackID, []).get(l.feedbackID)).push(l);
    for (const r of responses) (responsesOf.get(r.feedbackID) || responsesOf.set(r.feedbackID, []).get(r.feedbackID)).push(r);
    for (const e of evidence) (evidenceOf.get(e.feedbackID) || evidenceOf.set(e.feedbackID, []).get(e.feedbackID)).push(e.id);

    const out = [];
    const stats = { pictures: 0, videos: 0, attachments: 0, responses: 0, ratings: 0 };
    for (const f of feedback) {
        const email = emailOf.get(f.userID);
        if (!email) continue; // not a client (never the case in this data, but a staff-owned feedback has no citizen to seed)

        const files = [];
        for (const id of evidenceOf.get(f.id) || []) {
            const [{ evidence }] = await q(`SELECT evidence FROM feedback_evidence WHERE id = ${id}`);
            const saved = await savePicture(evidence, 'evidence', id);
            if (saved) { files.push(saved); stats.pictures++; } else stats.videos++;
        }

        const events = [];
        for (const r of responsesOf.get(f.id) || []) {
            const who = people.get(r.userID) || { role: 'staff', code: null };
            const rating = ratings.get(r.id);
            let file = null;
            if (r.file) {
                file = await savePicture(r.file, 'attachments', r.id);
                if (file) stats.attachments++;
            }
            events.push({
                legacyId: r.id,
                at: instant(r.created_at),
                kind: { 1: 'ack', 2: 'reply', 3: 'completion' }[r.status] || 'reply',
                author: {
                    role: r.userID === f.userID ? 'client' : who.role,
                    key: r.userID,
                    rank: supervisorRank.get(r.userID) ?? null,
                    office: who.code ? aliasOf(who.code) : null,
                    officeCode: who.code,
                },
                content: r.content || '',
                file,
                rating: rating ? { rate: Math.min(5, Math.max(1, rating.rating)), at: instant(rating.created_at) } : null,
            });
            stats.responses++;
            if (rating) stats.ratings++;
        }
        const completions = events.filter((e) => e.kind === 'completion');

        out.push({
            legacyId: f.id,
            clientEmail: email,
            content: f.content,
            createdAt: instant(f.created_at),
            updatedAt: instant(f.updated_at),
            // completed (3) / being handled (2) / just filed (1, still on) / switched off (isActive = 0)
            state: !f.isActive ? 'cancelled' : { 3: 'completed', 2: 'ongoing' }[f.status] || 'open',
            completedAt: completions.length ? completions[completions.length - 1].at : null,
            files,
            offices: (linksOf.get(f.id) || []).map((l) => {
                const o = offices.get(l.officeID);
                return {
                    alias: aliasOf(o.code), code: o.code, name: o.label,
                    isReceived: !!l.isReceived, createdAt: instant(l.created_at), updatedAt: instant(l.updated_at),
                };
            }),
            events,
        });
    }
    fs.writeFileSync(path.join(OUT, 'feedback.json'), JSON.stringify(out, null, 1));
    console.log(`feedback: ${out.length}`, stats);
    await db.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
