const { Sequelize, Op } = require("sequelize");
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const transporter = require('../utils/mailer');
const otpGenerator = require('../utils/otp');
const { Complaint, ComplaintDetail, ComplaintOffice, ComplaintFile, User, Office, Notification, Staff, Citizen, Response, ResponseFile, ResponseRating, ComplaintHistory } = require('../models');
const { logHistory, resolveActorLabel, resolveCitizenActorLabel } = require('../utils/complaintHistory');
const { computeReceiveDeadline, getReceiveComplianceStatus, computeResolutionDeadline, getResolutionComplianceStatus, RESOLUTION_DAYS } = require('../utils/businessHours');
const { askLLM, hasLLM } = require('../utils/llm');
const { getCompletionSuggestion } = require('../utils/completionSuggestion');
const { pushNotifications, broadcastComplaintsChanged: broadcastChanged } = require('../utils/notifySocket');
const { notifyComplainant } = require('../utils/notifyComplainant');

let io; // Declare io variable

const isTruthy = (value) => value === true || value === 'true';

// The OTP is now the SOLE credential for verifying a guest complaint (validateOTP no longer also
// asks for the reference number — see the comment there), so it has to be genuinely unique: keep
// regenerating until it collides with no other complaint that still carries an OTP. 1M codes vs.
// at most a few thousand live OTPs means this almost never loops more than once.
const generateUniqueOtp = async () => {
    for (let attempt = 0; attempt < 25; attempt++) {
        const otp = otpGenerator();
        const taken = await ComplaintDetail.findOne({ where: { otp }, attributes: ['id'] });
        if (!taken) return otp;
    }
    // Practically unreachable — fall back to a longer code rather than throwing.
    return otpGenerator(8);
};

// Evidence photos are compressed with sharp and stored inline as base64 data URIs (in the DB,
// via the ComplaintFile.file TEXT column) rather than written to disk — keeps the complaint's
// evidence self-contained with the record and trivially embeddable as an <img src="..."> on the
// frontend, with no separate file-serving/cleanup story to maintain.
const saveComplaintFiles = async (files, complaintId) => {
    if (!files || !files.length) return;

    for (const file of files) {
        const filename = file.originalname;
        const isPng = path.extname(filename).toLowerCase() === '.png';

        // Resize + recompress
        let sharpPipeline = sharp(file.buffer).resize({ width: 800, withoutEnlargement: true });

        if (isPng) {
            sharpPipeline = sharpPipeline.png({ quality: 80 });
        } else {
            sharpPipeline = sharpPipeline
                .flatten({ background: { r: 255, g: 255, b: 255 } })
                .jpeg({ quality: 80 });
        }

        const buffer = await sharpPipeline.toBuffer();
        const base64 = buffer.toString('base64');
        const mimeType = isPng ? 'image/png' : 'image/jpeg';

        await ComplaintFile.create({
            complaintId,
            filename,
            file: `data:${mimeType};base64,${base64}`
        });
    }
};

// Notifies every super/admin user of a new event and pushes the refreshed notification list over
// the socket — targeted to that user's own connected socket(s) only (see utils/notifySocket), not
// a global broadcast. Best-effort: the complaint itself is already committed by the time this
// runs, so a notification failure here must never bubble up and turn a successful submission into
// a 500 for the citizen.
const notifyAdmins = async (content) => {
    try {
        const users = await User.findAll({
            include: [{ model: Staff, as: 'staff' }],
            where: { role: { [Op.in]: ['super', 'admin'] } }
        });
        for (const user of users) {
            await Notification.create({ receiverId: user.id, content });
            await pushNotifications(io, user.id);
        }
    } catch (error) {
        console.error('Failed to notify admins:', error);
    }
};

// In-app notification to every staff member of a complaint's currently-assigned office(s) — used
// when a supervisor changes the complaint's status (completed / cancelled / reopened) so the
// workstation(s) that were handling it find out. Best-effort, same convention as notifyAdmins.
const notifyOfficeStaff = async (complaintId, content) => {
    try {
        const offices = await ComplaintOffice.findAll({ where: { complaintId, isActive: true }, attributes: ['officeId'] });
        if (!offices.length) return;
        const staff = await Staff.findAll({
            where: { officeId: { [Op.in]: offices.map(o => o.officeId) } },
            attributes: ['userId']
        });
        for (const userId of [...new Set(staff.map(s => s.userId))]) {
            await Notification.create({ receiverId: userId, content });
            await pushNotifications(io, userId);
        }
    } catch (error) {
        console.error(`Failed to notify office staff for complaint ${complaintId}:`, error);
    }
};

// Emails each office and notifies its staff that a complaint has landed in their queue.
// Best-effort per office: one office's mailer hiccup shouldn't stop the others from being notified,
// and never blocks the routing decision that already happened by the time this runs.
const notifyOffices = async (offices) => {
    for (const office of offices) {
        try {
            const templatePath = path.join(__dirname, '../templates/complaint.html');
            const html = fs.readFileSync(templatePath, 'utf8');

            await transporter.sendMail({
                from: `"CSFLU - Complaint Hotline" <${process.env.MAIL_USER}>`,
                to: office.email,
                subject: 'New Complaint',
                html
            });

            const staffs = await Staff.findAll({ where: { officeId: office.id } });
            for (const staff of staffs) {
                await Notification.create({ receiverId: staff.userId, content: 'New feedback assigned to your office' });
                await pushNotifications(io, staff.userId);
            }
        } catch (error) {
            console.error(`Failed to notify office ${office.id} of new complaint:`, error);
        }
    }
};

// Signals the internal desk's ComplaintPage to re-fetch (see utils/notifySocket).
const broadcastComplaintsChanged = (reason) => broadcastChanged(io, reason);

const VALID_COMPLEXITIES = ['simple', 'complex', 'highly_technical'];

// Pulls a complaint's saved evidence photos back out as vision-ready { mediaType, data } pairs
// (capped — classification is a cheap routing step, not a full evidence review, and the photos
// are already resized/compressed by saveComplaintFiles). ComplaintFile.file is always an image
// data URI (never a PDF — that's response evidence only, see ResponseController.js).
const MAX_CLASSIFICATION_IMAGES = 3;
const loadComplaintImages = async (complaintId) => {
    const files = await ComplaintFile.findAll({
        where: { complaintId },
        order: [['createdAt', 'ASC']],
        limit: MAX_CLASSIFICATION_IMAGES
    });
    return files
        .map(f => {
            const match = /^data:([^;]+);base64,(.+)$/.exec(f.file || '');
            return match ? { mediaType: match[1], data: match[2] } : null;
        })
        .filter(Boolean);
};

// Reads a complaint's free-text content (plus any evidence photos), matches it against every
// active office's stated mandate to decide who's responsible, and classifies its ARTA/EODB
// complexity tier — all in one call. Returns { complexity: null, matches: [] } (never persists
// anything) whenever matching can't run: no API key configured, no office has a mandate set yet,
// or the model can't find a confident office match (complexity may still come back set even
// then). Pure/read-only, so it also backs the staff-facing "suggest an office" preview (see
// suggestOffice below) as well as auto-assignment on filing.
const matchOfficesToContent = async (content, images = []) => {
    const empty = { complexity: null, matches: [] };
    if (!hasLLM() || !content) return empty;

    const offices = await Office.findAll({
        where: { isActive: true, mandate: { [Op.ne]: null } },
        attributes: ['id', 'name', 'alias', 'mandate']
    });
    if (!offices.length) return empty;

    const officeList = offices
        .map(o => `${o.id}: ${o.name}${o.alias ? ` (${o.alias})` : ''} — ${o.mandate}`)
        .join('\n');

    try {
        const raw = await askLLM({
            system: 'You route citizen complaints to the city department(s) responsible for them, and ' +
                'classify how complex the request is to resolve, based strictly on each department\'s ' +
                'stated mandate below — there is no category system, match the complaint\'s content ' +
                'directly to a mandate. Reply with ONLY a JSON object, no other text and no markdown ' +
                'fences, in exactly this shape: {"complexity": "simple"|"complex"|"highly_technical", ' +
                '"offices": [{"officeId": <number>, "reason": "<one short sentence tying the complaint ' +
                'to that department\'s mandate>"}]}. Complexity guide — "simple": routine, ' +
                'straightforward, resolvable with standard/minor action (e.g. a single pothole, a missed ' +
                'garbage pickup, a document copy request). "complex": needs coordination, inspection, or ' +
                'multiple steps (e.g. recurring flooding, a permit dispute, a multi-household drainage ' +
                'issue). "highly_technical": needs specialized expertise or engineering/legal review ' +
                '(e.g. structural building safety, environmental contamination, large-scale ' +
                'infrastructure failure). Usually pick just one department for "offices"; only include ' +
                'more than one when the complaint genuinely spans multiple mandates. Always include ' +
                '"complexity" even when nothing matches — reply {"complexity": "...", "offices": []} in ' +
                'that case, never an empty array on its own.' +
                (images.length
                    ? ' Photo evidence is attached — weigh it alongside the text when judging severity ' +
                        'and scope: visible structural damage, a large affected area, or safety hazards ' +
                        'can push the complexity up (e.g. to "complex" or "highly_technical") even if the ' +
                        'written description alone reads as minor, and a photo showing the issue is minor ' +
                        'in scope can keep it at "simple". The photos can also help you pick the right ' +
                        'department when the text is ambiguous.'
                    : ''),
            prompt: `Departments (id: name — mandate):\n${officeList}\n\nComplaint:\n"""${content}"""`,
            maxTokens: 600,
            images
        }) || '{}';

        // Some models (notably Llama via Groq) wrap the JSON in a markdown fence despite being
        // told not to — strip that before parsing rather than failing the whole match on it.
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

        let picks;
        try {
            picks = JSON.parse(cleaned);
        } catch {
            return empty;
        }
        if (!picks || typeof picks !== 'object' || Array.isArray(picks)) return empty;

        const complexity = VALID_COMPLEXITIES.includes(picks.complexity) ? picks.complexity : null;
        const offerings = Array.isArray(picks.offices) ? picks.offices : [];

        const officeById = new Map(offices.map(o => [o.id, o]));
        const matches = [];

        for (const pick of offerings) {
            const officeId = parseInt(pick?.officeId, 10);
            const office = officeById.get(officeId);
            if (!office) continue; // never trust the model's ids blindly — must be one we actually sent it

            matches.push({
                office,
                reason: typeof pick.reason === 'string' ? pick.reason.slice(0, 500) : null
            });
        }

        return { complexity, matches };
    } catch (error) {
        console.error('Complaint office matching failed:', error);
        return empty;
    }
};

// Persists whatever matchOfficesToContent found for this complaint: creates the ComplaintOffice
// rows (with the AI's reasoning attached) that response-time tracking measures against, and moves
// the complaint into 'ongoing'. Returns false — leaving the complaint at its current status, for a
// staff member to assign manually — when nothing matched.
const assignComplaintToOffices = async (complaint) => {
    const images = await loadComplaintImages(complaint.id);
    const { complexity, matches } = await matchOfficesToContent(complaint.content, images);
    const resolutionDeadline = complexity ? await computeResolutionDeadline(complexity) : null;
    const complexityNote = complexity
        ? ` Classified as ${complexity.replace('_', ' ').toUpperCase()} (target: ${RESOLUTION_DAYS[complexity]} business days).`
        : '';

    if (!matches.length) {
        // No AI provider configured, or nothing matched confidently — leave it explicitly
        // 'unassigned' so a supervisor can find and route it manually. Complexity (and its
        // resolution deadline) is still recorded if the model managed to classify it.
        await complaint.update({ status: 'unassigned', complexity, resolutionDeadline });
        await logHistory({
            complaintId: complaint.id,
            actorRole: 'ai',
            actorLabel: 'AI Auto-Assignment',
            action: 'left_unassigned',
            description: `No office could be confidently matched to this feedback — left unassigned for manual routing.${complexityNote}`
        });
        return false;
    }

    const receiveDeadline = await computeReceiveDeadline();
    for (const { office, reason } of matches) {
        await ComplaintOffice.findOrCreate({
            where: { complaintId: complaint.id, officeId: office.id },
            defaults: { isActive: true, assignedBy: 'ai', assignmentReason: reason, receiveDeadline }
        });
    }

    await complaint.update({ status: 'ongoing', complexity, resolutionDeadline });
    await notifyOffices(matches.map(m => m.office));
    await logHistory({
        complaintId: complaint.id,
        actorRole: 'ai',
        actorLabel: 'AI Auto-Assignment',
        action: 'auto_assigned',
        description: `Auto-assigned to ${matches.map(m => m.office.alias || m.office.name).join(', ')}.${complexityNote}`
    });

    return true;
};

// An unclaimed complaint (userId null) carries its complainant on the ComplaintDetail's guest*
// fields, not a linked User. Synthesise the same { user: { firstname, lastname, citizen: {...} } }
// shape the readers already expect so nothing downstream (redactIfAnonymous below, the internal
// list/detail views, the staff edit-form prefill) needs to special-case a guest complaint.
// Anonymous filings deliberately have no guest name to surface, and their contact info is left
// out entirely — the anonymity has to hold in the payload, not just the rendered name.
const hydrateGuestComplainant = (complaintJSON) => {
    const d = complaintJSON && complaintJSON.complaintDetail;
    if (!d || d.user) return complaintJSON;
    if (complaintJSON.isAnonymous) {
        d.user = { firstname: null, lastname: null };
    } else if (d.guestFirstName || d.guestLastName || d.guestEmail) {
        d.user = {
            firstname: d.guestFirstName || null,
            lastname: d.guestLastName || null,
            citizen: { email: d.guestEmail || null, phoneNo: d.guestPhone || null }
        };
    }
    return complaintJSON;
};

// Anonymous complaints hide the complainant's name from anyone reading the complaint (staff, reports),
// without touching the stored User record — the same citizen may also have non-anonymous complaints.
const redactIfAnonymous = (complaintJSON) => {
    if (complaintJSON && complaintJSON.isAnonymous && complaintJSON.complaintDetail && complaintJSON.complaintDetail.user) {
        complaintJSON.complaintDetail.user.firstname = 'Anonymous';
        complaintJSON.complaintDetail.user.lastname = 'Citizen';
    }
    return complaintJSON;
};

// Decorates each active office assignment with its derived 24-business-hour acknowledgement
// compliance status — computed fresh from receivedAt/receiveDeadline on every read, never stored.
const annotateOfficeCompliance = (complaintJSON) => {
    if (complaintJSON && Array.isArray(complaintJSON.complaintOffices)) {
        for (const co of complaintJSON.complaintOffices) {
            co.receiveComplianceStatus = getReceiveComplianceStatus(co);
        }
    }
    return complaintJSON;
};

// Same idea as annotateOfficeCompliance above, but for the whole complaint's resolution
// deadline (ARTA/EODB complexity tier) rather than a single office's acknowledgement deadline.
const annotateResolutionCompliance = (complaintJSON) => {
    if (complaintJSON) {
        complaintJSON.resolutionComplianceStatus = getResolutionComplianceStatus(complaintJSON);
    }
    return complaintJSON;
};

module.exports = (_io) => {
    io = _io;

    return {
        sendOTP: async (req, res) => {

            const { firstname, lastname, isAnonymous, contactNo, email, content, latitude, longitude } = req.body;
            const files = req.files; // From Multer

            const otp = await generateUniqueOtp();
            const anonymous = isTruthy(isAnonymous);

            try {
                // No account is created here anymore. A guest complaint stands on its own —
                // contact info lives on the ComplaintDetail, and the citizen links it to a real
                // account later (if they want to) via claimComplaint, using the reference number
                // + OTP as proof. This keeps a guest filing from reserving an email address, and
                // keeps an anonymous complaint anonymous even if that email is later registered.
                const complaint = await Complaint.create({
                    content,
                    status: 'unverified',
                    via: 'otp',
                    isAnonymous: anonymous
                });

                const detail = await ComplaintDetail.create({
                    complaintId: complaint.id,
                    userId: null,
                    otp,
                    // Name is withheld for an anonymous filing; email/phone are always kept — the
                    // email is where the OTP and every future progress update is sent.
                    guestFirstName: anonymous ? null : (firstname || null),
                    guestLastName: anonymous ? null : (lastname || null),
                    guestEmail: email || null,
                    guestPhone: contactNo || null,
                    // Required by ComplaintValidator.validateForm above — already validated numeric.
                    latitude,
                    longitude
                });

                await saveComplaintFiles(files, complaint.id);

                // Sent after the complaint/reference number exist (not before) so the email can
                // carry the reference number alongside the OTP — verifying now requires both (see
                // validateOTP), and the reference number is otherwise only shown on-screen, which
                // doesn't survive a closed tab.
                const templatePath = path.join(__dirname, '../templates/complaint-otp.html');
                let html = fs.readFileSync(templatePath, 'utf8');
                html = html.replace('{{ otp }}', otp).replace('{{ referenceNo }}', complaint.referenceNo);

                await transporter.sendMail({
                    from: `"CSFLU - Complaint Hotline" <${process.env.MAIL_USER}>`,
                    to: email,
                    subject: 'One-Time Pin',
                    html
                });

                await notifyAdmins('New incoming feedback');
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: 'citizen',
                    actorLabel: anonymous ? null : `${firstname || ''} ${lastname || ''}`.trim() || null,
                    action: 'filed',
                    description: 'Complaint filed as a guest — awaiting OTP verification.'
                });

                res.status(201).json({
                    message: "Email sent.",
                    complaint,
                    detail
                });
            } catch (error) {
                console.error('Error creating complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Verification takes the OTP and nothing else — the citizen just types the code from their
        // email and gets the reference number back. Safe to key on the OTP alone because:
        //   - it's unique (see generateUniqueOtp — regenerated until it collides with nothing),
        //   - only a complaint still 'unverified' can be matched here, so a guessed code can't
        //     re-trigger anything on a complaint that's already moving,
        //   - the route is rate-limited (otpLimiter, 10 / 15 min / IP), and
        //   - the response carries only the reference number, never the complaint's content.
        // Worst case for a lucky guess is someone else's not-yet-confirmed complaint getting
        // routed a bit early — annoying, not a data exposure.
        validateOTP: async(req, res) => {
            const { otp } = req.body;

            if (!otp) {
                return res.status(400).json({ message: 'The verification code is required.' });
            }

            try {
                const complaint = await Complaint.findOne({
                    where: { status: 'unverified' },
                    include: {
                        model: ComplaintDetail,
                        as: 'complaintDetail',
                        where: { otp },
                        required: true
                    }
                });

                if (!complaint) {
                    return res.status(400).json({ message: 'That code is invalid or has already been used.' });
                }
                const detail = complaint.complaintDetail;

                complaint.status = 'pending';
                await complaint.save();

                await notifyAdmins('Complaint verified');
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: 'citizen',
                    // A claimed complaint resolves to the linked account's name; an unclaimed one
                    // falls back to the guest name it was filed under (null when anonymous).
                    actorLabel: detail.userId
                        ? await resolveCitizenActorLabel(detail.userId, complaint.isAnonymous)
                        : (complaint.isAnonymous ? null : `${detail.guestFirstName || ''} ${detail.guestLastName || ''}`.trim() || null),
                    action: 'verified',
                    description: 'Complaint verified via OTP.'
                });

                // Read the content, match it to the responsible department(s), and route it
                // immediately (a no-match just leaves it 'pending' for a staff member to assign).
                await assignComplaintToOffices(complaint);

                broadcastComplaintsChanged('verified');

                return res.status(200).json({
                    message: 'Feedback verified.',
                    // Only the reference number — this endpoint takes an unauthenticated code, so
                    // it must not hand back the complaint body.
                    complaint: { referenceNo: complaint.referenceNo }
                });
            } catch (error) {
                console.error('Error verifying complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        createAccountComplaint: async (req, res) => {
            const { content, latitude, longitude } = req.body;
            const files = req.files;
            const userId = req.userId;

            if (!content) {
                return res.status(400).json({ message: 'Feedback content is required.' });
            }
            // Same requirement as the guest path (ComplaintValidator.validateForm), checked inline
            // here since this route has no shared validator middleware of its own.
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (latitude == null || longitude == null || Number.isNaN(lat) || Number.isNaN(lng)) {
                return res.status(400).json({ message: 'Location is required to file feedback.' });
            }

            try {
                const complaint = await Complaint.create({
                    content,
                    status: 'pending',
                    via: 'account',
                    isAnonymous: false
                });

                await ComplaintDetail.create({
                    complaintId: complaint.id,
                    userId,
                    latitude: lat,
                    longitude: lng
                });

                await saveComplaintFiles(files, complaint.id);

                await logHistory({
                    complaintId: complaint.id,
                    actorRole: 'citizen',
                    actorLabel: await resolveActorLabel(userId),
                    action: 'filed',
                    description: 'Complaint filed by a signed-in citizen.'
                });

                // Already a verified account — no OTP gate to wait on, route straight away
                // (a no-match leaves it 'unassigned' for a staff member to assign).
                await assignComplaintToOffices(complaint);
                await notifyAdmins('New incoming feedback');
                broadcastComplaintsChanged('filed');

                return res.status(201).json({
                    message: 'Feedback submitted successfully.',
                    complaint
                });
            } catch (error) {
                console.error('Error creating account complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Super/admin files a complaint on a citizen's behalf (e.g. a walk-in or phone report) —
        // same intake fields as the external app's guest form, but skips the OTP-verification gate
        // entirely: a staff member is directly vouching for it, so it starts 'verified' rather than
        // 'unverified'/'pending', then goes straight into auto-assignment like any other verified
        // complaint. Like a guest OTP filing, this no longer mints a placeholder account — the
        // citizen's contact info is stored on the ComplaintDetail; if that person already has an
        // account they can link this complaint to it via the claim flow later.
        createStaffComplaint: async (req, res) => {
            const { firstname, lastname, email, contactNo, content } = req.body;
            const files = req.files;

            if (!content) {
                return res.status(400).json({ message: 'Feedback content is required.' });
            }
            if (!firstname || !lastname || !email) {
                return res.status(400).json({ message: 'Citizen firstname, lastname, and email are required.' });
            }

            try {
                const complaint = await Complaint.create({
                    content,
                    status: 'verified',
                    via: 'staff',
                    isAnonymous: false
                });

                await ComplaintDetail.create({
                    complaintId: complaint.id,
                    userId: null,
                    guestFirstName: firstname,
                    guestLastName: lastname,
                    guestEmail: email,
                    guestPhone: contactNo || null
                });
                await saveComplaintFiles(files, complaint.id);

                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'filed',
                    description: `Filed by ${actorLabel || 'staff'} on behalf of ${firstname} ${lastname} — verified at intake, no OTP step.`
                });

                // Same auto-assignment every other verified complaint goes through (a no-match
                // leaves it 'unassigned' for manual routing, same as any other path).
                await assignComplaintToOffices(complaint);
                await notifyAdmins('New incoming feedback');
                broadcastComplaintsChanged('filed');

                return res.status(201).json({
                    message: 'Feedback filed and routed.',
                    complaint
                });
            } catch (error) {
                console.error('Error creating staff-filed complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Any super/admin (not just the original filer — matches how every other action in this
        // system already scopes staff authority) can correct a complaint's content, citizen
        // contact info, and evidence — but ONLY for a complaint filed via the staff intake flow
        // (via: 'staff'). A citizen's own complaint (via: 'otp'/'account') is never editable here,
        // and neither is a complaint that's already been finalized. Editing the citizen's
        // name/email/contact updates their shared account record, which may be linked to other
        // complaints too — deliberate, but worth knowing before typing over it.
        editStaffComplaint: async (req, res) => {
            const { id } = req.params;
            const { content, firstname, lastname, email, contactNo, removeFileIds } = req.body;
            const files = req.files;

            try {
                const complaint = await Complaint.findByPk(id, {
                    include: [{ model: ComplaintDetail, as: 'complaintDetail' }]
                });
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }
                if (complaint.via !== 'staff') {
                    return res.status(403).json({ message: 'Only staff-filed feedback can be edited here.' });
                }
                if (['completed', 'cancelled'].includes(complaint.status)) {
                    return res.status(400).json({ message: 'This feedback is already finalized and can no longer be edited.' });
                }

                if (content) {
                    await complaint.update({ content });
                }

                const detail = complaint.complaintDetail;
                if (detail && (firstname || lastname || email || contactNo)) {
                    if (detail.userId) {
                        // Already linked to a real account — correcting the name/contact there
                        // touches a record that may back other complaints too (same as before).
                        const user = await User.findByPk(detail.userId, { include: [{ model: Citizen, as: 'citizen' }] });
                        if (user) {
                            const userUpdates = {};
                            if (firstname) userUpdates.firstname = firstname;
                            if (lastname) userUpdates.lastname = lastname;
                            if (Object.keys(userUpdates).length) await user.update(userUpdates);
                            if (user.citizen && (email || contactNo)) {
                                const citizenUpdates = {};
                                if (email) citizenUpdates.email = email;
                                if (contactNo) citizenUpdates.phoneNo = contactNo;
                                await user.citizen.update(citizenUpdates);
                            }
                        }
                    } else {
                        // Unclaimed — the contact info lives on this complaint alone.
                        const detailUpdates = {};
                        if (firstname) detailUpdates.guestFirstName = firstname;
                        if (lastname) detailUpdates.guestLastName = lastname;
                        if (email) detailUpdates.guestEmail = email;
                        if (contactNo) detailUpdates.guestPhone = contactNo;
                        await detail.update(detailUpdates);
                    }
                }

                const removeIds = Array.isArray(removeFileIds)
                    ? removeFileIds.map(n => parseInt(n, 10)).filter(Number.isFinite)
                    : (removeFileIds ? [parseInt(removeFileIds, 10)].filter(Number.isFinite) : []);
                if (removeIds.length) {
                    await ComplaintFile.destroy({ where: { id: removeIds, complaintId: complaint.id } });
                }
                await saveComplaintFiles(files, complaint.id);

                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'edited',
                    description: `Edited by ${actorLabel || 'staff'}.`
                });

                return res.status(200).json({ message: 'Feedback updated.', complaint });
            } catch (error) {
                console.error('Error editing staff-filed complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Staff-facing preview: re-runs the same content-vs-mandate matching used at filing time
        // and returns the result WITHOUT persisting anything, so a staff member can see what the
        // AI would suggest (and why) before deciding whether to act on it via reassignOffice below.
        suggestOffice: async (req, res) => {
            const { id } = req.params;

            try {
                const complaint = await Complaint.findByPk(id);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }

                const images = await loadComplaintImages(complaint.id);
                // Same single call already classifies a complexity tier alongside the office
                // matches — surfacing it here too means the complexity/SLA panel gets an AI
                // suggestion for free, off the same request, rather than a second LLM round-trip.
                const { matches, complexity } = await matchOfficesToContent(complaint.content, images);

                return res.status(200).json({
                    suggestions: matches.map(({ office, reason }) => ({
                        officeId: office.id,
                        name: office.name,
                        alias: office.alias,
                        reason
                    })),
                    complexity: VALID_COMPLEXITIES.includes(complexity) ? complexity : null
                });
            } catch (error) {
                console.error('Error suggesting office:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Lets a super/admin correct/set which office(s) a complaint is assigned to — whether the
        // AI left it unassigned or simply got it wrong. A true reassignment (sets the full active
        // set), not additive: every currently-active office assignment is deactivated, and every
        // office in the submitted list becomes (or stays) active. An empty list unassigns the
        // complaint entirely.
        reassignOffice: async (req, res) => {
            const { offices } = req.body;
            const { id } = req.params;

            if (!Array.isArray(offices)) {
                return res.status(400).json({ message: 'offices must be an array of { officeId, reason? }.' });
            }

            try {
                const complaint = await Complaint.findByPk(id);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }

                const resolvedOffices = [];
                for (const entry of offices) {
                    const officeId = parseInt(entry?.officeId, 10);
                    if (!officeId) continue;
                    const office = await Office.findByPk(officeId);
                    if (!office) continue;
                    resolvedOffices.push({ office, reason: entry.reason || null });
                }

                const keepIds = resolvedOffices.map(r => r.office.id);

                // Deactivate anything active that isn't in the new set.
                await ComplaintOffice.update(
                    { isActive: false },
                    {
                        where: {
                            complaintId: complaint.id,
                            isActive: true,
                            ...(keepIds.length ? { officeId: { [Op.notIn]: keepIds } } : {})
                        }
                    }
                );

                for (const { office, reason } of resolvedOffices) {
                    const [assignment, created] = await ComplaintOffice.findOrCreate({
                        where: { complaintId: complaint.id, officeId: office.id },
                        defaults: {
                            isActive: true, assignedBy: 'admin', assignmentReason: reason,
                            receiveDeadline: await computeReceiveDeadline()
                        }
                    });
                    // Read before any update below — reflects whether this office is newly
                    // landing in the queue (fresh row, or reactivated after being dropped), as
                    // opposed to already being active and just getting its reason edited.
                    const wasInactive = !assignment.isActive;

                    if (wasInactive || reason) {
                        const updates = {
                            isActive: true,
                            assignedBy: 'admin',
                            assignmentReason: reason || assignment.assignmentReason
                        };
                        // Newly (re)activated — start its acknowledgement clock over.
                        if (!created && wasInactive) {
                            updates.receiveDeadline = await computeReceiveDeadline();
                            updates.receivedAt = null;
                            updates.status = 'pending';
                        }
                        await assignment.update(updates);
                    }
                }

                if (resolvedOffices.length) {
                    if (['unverified', 'pending', 'unassigned'].includes(complaint.status)) {
                        await complaint.update({ status: 'ongoing' });
                    }
                    await notifyOffices(resolvedOffices.map(r => r.office));
                } else {
                    await complaint.update({ status: 'unassigned' });
                }

                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'reassigned',
                    description: resolvedOffices.length
                        ? `Reassigned by ${actorLabel || 'staff'} to ${resolvedOffices.map(r => r.office.alias || r.office.name).join(', ')}.`
                        : `All office assignments cleared by ${actorLabel || 'staff'} — left unassigned.`
                });

                broadcastComplaintsChanged('reassigned');

                return res.status(200).json({ message: 'Office(s) reassigned.', complaint });
            } catch (error) {
                console.error('Error reassigning complaint office:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Corrects a misclassified ARTA/EODB complexity tier after the fact — the AI classifies
        // once at assignment time (see matchOfficesToContent above) and nothing since then has
        // ever revisited it. There's no per-office SLA anymore (removed — every complaint's
        // deadline is governed by this tier alone), so this IS "reassigning the SLA": changing
        // the tier recomputes resolutionDeadline, which drives every overdue/compliance check
        // downstream (getResolutionComplianceStatus, the Report page's ARTA compliance rate, etc).
        reassignComplexity: async (req, res) => {
            const { id } = req.params;
            const { complexity } = req.body;

            if (!VALID_COMPLEXITIES.includes(complexity)) {
                return res.status(400).json({ message: `complexity must be one of: ${VALID_COMPLEXITIES.join(', ')}.` });
            }

            try {
                const complaint = await Complaint.findByPk(id);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }

                const previousComplexity = complaint.complexity;
                if (previousComplexity === complexity) {
                    return res.status(200).json({ message: 'Complexity unchanged.', complaint });
                }

                // Counted from when the complaint was actually filed (createdAt), not from this
                // correction's timestamp — the target was always "N business days from filing",
                // this just fixes which N applies, the same way the original auto-classification
                // effectively did (it ran moments after createdAt too).
                const resolutionDeadline = await computeResolutionDeadline(complexity, complaint.createdAt);
                await complaint.update({ complexity, resolutionDeadline });

                const actorLabel = await resolveActorLabel(req.userId);
                const fromLabel = previousComplexity ? previousComplexity.replace('_', ' ') : 'unclassified';
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'reclassified',
                    description: `Reclassified by ${actorLabel || 'staff'} from ${fromLabel} to ${complexity.replace('_', ' ')} ` +
                        `(target: ${RESOLUTION_DAYS[complexity]} business days). New deadline: ${moment(resolutionDeadline).format('MMM DD, YYYY hh:mm A')}.`
                });

                broadcastComplaintsChanged('reclassified');

                return res.status(200).json({ message: 'Complexity reassigned.', complaint });
            } catch (error) {
                console.error('Error reassigning complaint complexity:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        // Super/admin-only manual finalization. Finalizing it as completed or cancelled cascades
        // to every office it's currently assigned to. Not the ONLY way a complaint reaches
        // 'completed' — maybeCompleteComplaint (ResponseController.js) also auto-finalizes it the
        // moment every assigned office individually marks its own part done — this is the
        // supervisor's manual override/early-finalize path for everything else.
        updateStatus: async (req, res) => {
            // aiAssisted: true when the frontend's "suggest complete" banner (see
            // getCompletionSuggestion below) was showing an eligible suggestion at submit time —
            // purely for the history-log tag below, never trusted for anything else.
            const { status, remarks, aiAssisted } = req.body;
            const { id } = req.params;
            const allowed = ['completed', 'cancelled'];

            if (!allowed.includes(status)) {
                return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}.` });
            }

            try {
                const complaint = await Complaint.findByPk(id);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }

                const activeOffices = await ComplaintOffice.findAll({
                    where: { complaintId: complaint.id, isActive: true }
                });

                // Can't call it complete while an office it's assigned to hasn't even
                // acknowledged (received) it yet — nothing to show was actually resolved there.
                if (status === 'completed') {
                    const notReceived = activeOffices.filter(o => o.status === 'pending');
                    if (notReceived.length) {
                        return res.status(400).json({
                            message: `Cannot mark as completed — ${notReceived.length} assigned office(s) have not yet acknowledged/received the feedback.`
                        });
                    }
                }

                const previousStatus = complaint.status;
                const trimmedRemarks = remarks && remarks.trim() ? remarks.trim() : null;
                await complaint.update({
                    status,
                    completedAt: complaint.completedAt || new Date(),
                    remarks: trimmedRemarks
                });

                // Cancellation disables every office it was assigned to — they're no longer an
                // active workload for that office — but the rows themselves are kept (isActive:
                // false, not deleted) so they still show up on the record. Completion leaves
                // offices active; they did the work, they should still read as such.
                let officesTouched;
                if (status === 'cancelled') {
                    [officesTouched] = await ComplaintOffice.update(
                        { status, completedAt: new Date(), isActive: false },
                        { where: { complaintId: complaint.id, isActive: true } }
                    );
                } else {
                    // Only stamp completedAt for offices NOT already 'completed' — an office that
                    // already clicked its own "done" pill (ResponseController.complete) keeps ITS
                    // real completedAt rather than having it overwritten to match the supervisor's
                    // approval moment. This used to unconditionally reset every active office's
                    // completedAt to "now" here, which silently destroyed the very timestamp the
                    // office-done-to-approval lag (see avgApprovalLagHours in getAnalytics/
                    // getOfficePerformanceReport) needs to measure anything at all. An office that
                    // was still active-but-not-completed (the supervisor force-finalizing early)
                    // correctly still gets "now" — there was no earlier completion to preserve.
                    const [freshlyCompleted] = await ComplaintOffice.update(
                        { status, completedAt: new Date() },
                        { where: { complaintId: complaint.id, isActive: true, status: { [Op.ne]: 'completed' } } }
                    );
                    const alreadyCompleted = await ComplaintOffice.count({
                        where: { complaintId: complaint.id, isActive: true, status: 'completed' }
                    });
                    officesTouched = freshlyCompleted + alreadyCompleted;
                }

                // Resolution compliance only means anything for an actual completion — a
                // cancelled complaint is never judged against its resolution deadline.
                const resolutionNote = status === 'completed'
                    ? (getResolutionComplianceStatus(complaint) === 'on_time'
                        ? ' Resolved within the target resolution time.'
                        : getResolutionComplianceStatus(complaint) === 'late'
                            ? ' Resolved past the target resolution time.'
                            : '')
                    : '';

                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: status,
                    description: `Status changed from ${previousStatus} to ${status} by ${actorLabel || 'staff'}` +
                        (officesTouched
                            ? ` — ${officesTouched} assigned office(s) marked ${status}${status === 'cancelled' ? ' and disabled' : ''} as well.`
                            : '.') +
                        resolutionNote +
                        (trimmedRemarks ? ` Remarks: ${trimmedRemarks}` : '') +
                        (isTruthy(aiAssisted) ? ' (AI-suggested completion.)' : '')
                });

                // A supervisor changing the status reaches everyone: the complainant in-app AND by
                // email (account holder or guest — this is the outcome they must not miss), and the
                // workstation(s) that were handling it, in-app.
                await notifyComplainant(
                    io, complaint.id,
                    status === 'completed'
                        ? `Your feedback ${complaint.referenceNo} has been marked completed.${resolutionNote}`
                        : `Your feedback ${complaint.referenceNo} has been closed.`,
                    {
                        subject: status === 'completed' ? 'Your feedback has been resolved' : 'Your feedback has been closed',
                        alsoEmailAccount: true,
                    }
                );
                await notifyOfficeStaff(
                    complaint.id,
                    `Feedback ${complaint.referenceNo} was marked ${status} by ${actorLabel || 'a supervisor'}.`
                );

                broadcastComplaintsChanged('status');

                return res.status(200).json({ message: 'Status updated.', complaint });
            } catch (error) {
                console.error('Error updating complaint status:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Advisory only — NEVER changes complaint/office state. Tells the frontend's status tab
        // whether this complaint looks ready for a supervisor to finalize as completed, and hands
        // back an AI-drafted closing summary to pre-fill (and let them edit/discard) if so. See
        // utils/completionSuggestion.js for the actual eligibility rules and drafting.
        getCompletionSuggestion: async (req, res) => {
            const { id } = req.params;
            try {
                const suggestion = await getCompletionSuggestion(id);
                return res.status(200).json(suggestion);
            } catch (error) {
                console.error('Error computing completion suggestion:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        // Super/admin. The counterpart to Case A's per-office send-back (ResponseController.
        // reopenOffice) for when a complaint was ALREADY finalized as completed before the mistake
        // was caught — reverts the whole complaint (and every office that had been marked
        // completed) back to 'ongoing' so it can be worked again, and notifies the citizen, since
        // they were already told it was resolved. Still narrower than updateStatus in one way:
        // only ever reverses a 'completed' finalization, never a 'cancelled' one (a different,
        // deliberate call that isn't "not actually done").
        reopen: async (req, res) => {
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason || !reason.trim()) {
                return res.status(400).json({ message: 'A reason is required to reopen completed feedback.' });
            }

            try {
                const complaint = await Complaint.findByPk(id);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }
                if (complaint.status !== 'completed') {
                    return res.status(400).json({ message: 'Only completed feedback can be reopened.' });
                }

                await complaint.update({
                    status: 'ongoing',
                    completedAt: null,
                    // Clear the cached AI draft — a fresh one should reflect whatever prompted the
                    // reopen, not the (evidently wrong) prior state of the case.
                    suggestedRemarks: null,
                    suggestedRemarksAt: null
                });

                const [officesTouched] = await ComplaintOffice.update(
                    { status: 'ongoing', completedAt: null },
                    { where: { complaintId: complaint.id, isActive: true, status: 'completed' } }
                );

                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'reopened',
                    description: `Reopened by ${actorLabel || 'a supervisor'} — ${officesTouched} assigned office(s) reset to ongoing. Reason: ${reason.trim()}`
                });

                await notifyComplainant(
                    io, complaint.id,
                    `Your feedback ${complaint.referenceNo} was reopened — it wasn't actually fully resolved. We're on it.`,
                    { subject: 'Your feedback was reopened', alsoEmailAccount: true }
                );
                await notifyOfficeStaff(
                    complaint.id,
                    `Feedback ${complaint.referenceNo} was reopened by ${actorLabel || 'a supervisor'} — back to ongoing.`
                );

                broadcastComplaintsChanged('reopened');

                return res.status(200).json({ message: 'Feedback reopened.', complaint });
            } catch (error) {
                console.error('Error reopening complaint:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        // Manual multi-office override — a staff member assigns several offices at once directly,
        // bypassing AI matching entirely. Distinct from reassignOffice above (which moves a
        // complaint to a single office): this is additive and lets a complaint span offices.
        createComplaint: async(req, res) => {

            const { offices, complaintId } = req.body;

            try {
                if (!offices || !Array.isArray(offices)) {
                    return res.status(400).json({ message: 'Offices should be an array.' });
                }

                const resolvedOffices = [];
                for (const officeId of offices) {
                    const office = await Office.findByPk(officeId);
                    if (!office) continue;

                    // Save to ComplaintOffice — this is the authoritative "office is now responsible" record
                    // that response-time tracking is measured against, so it must land even if the
                    // best-effort notifications below fail (e.g. mailer outage).
                    await ComplaintOffice.findOrCreate({
                        where: { complaintId, officeId: office.id },
                        defaults: { isActive: true, receiveDeadline: await computeReceiveDeadline() }
                    });
                    resolvedOffices.push(office);
                }

                const complaint = await Complaint.findByPk(complaintId);
                await complaint.update({
                    status: 'ongoing'
                });

                await notifyOffices(resolvedOffices);
                const actorLabel = await resolveActorLabel(req.userId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'reassigned',
                    description: `Assigned by ${actorLabel || 'staff'} to ${resolvedOffices.map(o => o.alias || o.name).join(', ')}.`
                });

                return res.status(201).json({
                    message: 'Feedback assigned to offices.',
                    assigned: resolvedOffices.map(o => o.id)
                });
            } catch (error) {
                console.error('Error creating complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        getAllComplaints: async (req, res) => {
            const userId = req.userId;
            const userRole = req.role;

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const status = req.query.status ? req.query.status.trim() : '';
            // Multi-select — a comma-separated list of office ids from the rail's pill filter
            // (e.g. "3,5,8"); empty/absent means no office filter at all.
            const officeIds = req.query.office
                ? req.query.office.split(',').map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id))
                : [];
            const searchTerm = req.query.filter ? req.query.filter.trim() : '';
            // Surfaces complaints auto-assignment couldn't place anywhere (no AI provider
            // configured, or no office's mandate matched) — the queue a supervisor works from to
            // assign them manually. Admin/super only; a staff member's view is already scoped to
            // their own office's assignments, where "unassigned" has no meaning.
            const unassignedOnly = req.query.unassigned === 'true';
            // Surfaces complaints with at least one office still past its 24-business-hour
            // acknowledgement deadline and not yet received — the "not compliant" queue a
            // supervisor works from to follow up. Admin/super only, same reasoning as above.
            const overdueOnly = req.query.overdue === 'true';
            // Surfaces complaints still open past their ARTA/EODB complexity-tier resolution
            // deadline (see resolutionDeadline / getResolutionComplianceStatus). Admin/super only.
            const resolutionOverdueOnly = req.query.resolutionOverdue === 'true';

            try {
                const user = await Staff.findOne({
                    where: {
                        userId: userId
                    }
                });

                if (!user && !['super', 'admin', 'monitoring'].includes(userRole)) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                const complaintWhere = {};

                if (status) {
                    complaintWhere.status = status;
                }

                // Free-text search — reference no. or the complaint's own content. (Citizen name
                // isn't searchable here since it lives on a joined, sometimes-anonymized table.)
                if (searchTerm) {
                    complaintWhere[Op.or] = [
                        { referenceNo: { [Op.like]: `%${searchTerm}%` } },
                        { content: { [Op.like]: `%${searchTerm}%` } }
                    ];
                }

                // Admin (and monitoring, read-only) sees all complaints
                if (['super', 'admin', 'monitoring'].includes(userRole)) {
                    const complaintOfficeInclude = {
                        model: ComplaintOffice,
                        as: 'complaintOffices',
                        required: officeIds.length > 0,
                        include: [
                            {
                                model: Office,
                                as: 'office',
                                attributes: ['alias']
                            }
                        ]
                    };

                    if (officeIds.length) {
                        complaintOfficeInclude.where = {
                            officeId: { [Op.in]: officeIds }
                        };
                    }

                    if (unassignedOnly) {
                        // Now a persisted status rather than an inferred absence of ComplaintOffice
                        // rows — see the 'unassigned' status added to the Complaint model.
                        complaintWhere.status = 'unassigned';
                    }

                    if (overdueOnly) {
                        const overdueRows = await ComplaintOffice.findAll({
                            where: { isActive: true, receivedAt: null, receiveDeadline: { [Op.lt]: new Date() } },
                            attributes: ['complaintId'],
                            raw: true
                        });
                        const overdueIds = [...new Set(overdueRows.map(r => r.complaintId))];
                        complaintWhere.id = { [Op.in]: overdueIds.length ? overdueIds : [0] };
                    }

                    if (resolutionOverdueOnly) {
                        complaintWhere.resolutionDeadline = { [Op.lt]: new Date() };
                        complaintWhere.completedAt = null;
                        complaintWhere.status = { [Op.notIn]: ['cancelled'] };
                    }

                    const { count, rows } = await Complaint.findAndCountAll({
                        where: complaintWhere,
                        include: [
                            {
                                model: ComplaintDetail,
                                as: 'complaintDetail',
                                include: [
                                    {
                                        model: User,
                                        as: 'user',
                                        attributes: { exclude: ['password'] }
                                    }
                                ]
                            },
                            complaintOfficeInclude
                        ],
                        distinct: true,
                        limit,
                        offset,
                        order: [['createdAt', 'DESC']]
                    });

                    return res.json({
                        data: rows.map(row => annotateResolutionCompliance(annotateOfficeCompliance(redactIfAnonymous(hydrateGuestComplainant(row.toJSON()))))),
                        meta: {
                            TotalItems: count,
                            TotalPages: Math.ceil(count / limit),
                            CurrentPage: page
                        }
                    });
                }

                // Others see complaints assigned to their office
                const complaintOfficeWhere = {
                    officeId: user.officeId
                };

                if (officeIds.length) {
                    complaintOfficeWhere.officeId = { [Op.in]: officeIds };
                }

                const complaintIds = await ComplaintOffice.findAll({
                    where: complaintOfficeWhere,
                    attributes: ['complaintId'],
                    raw: true
                });

                let ids = complaintIds.map(c => c.complaintId);

                // Same two quick filters the admin branch offers, just scoped to this office (or
                // offices, if the multi-select filter above already narrowed complaintOfficeWhere)
                // — the KPI tiles above the list stay meaningful for a workstation view too.
                if (overdueOnly) {
                    const overdueRows = await ComplaintOffice.findAll({
                        where: { ...complaintOfficeWhere, isActive: true, receivedAt: null, receiveDeadline: { [Op.lt]: new Date() } },
                        attributes: ['complaintId'],
                        raw: true
                    });
                    const overdueIds = new Set(overdueRows.map(r => r.complaintId));
                    ids = ids.filter(id => overdueIds.has(id));
                }

                if (resolutionOverdueOnly) {
                    complaintWhere.resolutionDeadline = { [Op.lt]: new Date() };
                    complaintWhere.completedAt = null;
                    complaintWhere.status = { [Op.notIn]: ['cancelled'] };
                }

                const { count, rows } = await Complaint.findAndCountAll({
                    where: {
                        ...complaintWhere,
                        id: {
                            [Op.in]: ids.length ? ids : [0]
                        }
                    },
                    include: [
                        {
                            model: ComplaintDetail,
                            as: 'complaintDetail',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: { exclude: ['password'] }
                                }
                            ]
                        },
                        {
                            model: ComplaintOffice,
                            as: 'complaintOffices',
                            required: false,
                            include: [
                                {
                                    model: Office,
                                    as: 'office',
                                    attributes: ['alias']
                                }
                            ]
                        }
                    ],
                    distinct: true,
                    limit,
                    offset,
                    order: [['createdAt', 'DESC']]
                });

                return res.json({
                    data: rows.map(row => annotateResolutionCompliance(annotateOfficeCompliance(redactIfAnonymous(hydrateGuestComplainant(row.toJSON()))))),
                    meta: {
                        TotalItems: count,
                        TotalPages: Math.ceil(count / limit),
                        CurrentPage: page
                    }
                });

            } catch (error) {
                console.error('Error generating complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Aggregate view for the Complaint page's analytics panels — every figure is derived from
        // Complaint/ComplaintOffice/ComplaintHistory/ResponseRating directly, computed fresh on
        // each call rather than cached, since none of this is on a hot path. Super/admin get the
        // whole system; workstation staff get the same panels scoped to their own office only —
        // see `scope` below, threaded through every query in this function.
        getAnalytics: async (req, res) => {
            const isSystemWide = ['super', 'admin', 'monitoring'].includes(req.role);
            let scopeOfficeId = null;
            let scopeLabel = null;

            if (!isSystemWide) {
                const staff = await Staff.findOne({
                    where: { userId: req.userId },
                    include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }]
                });
                if (!staff) {
                    return res.status(403).json({ message: 'You do not have access to this data.' });
                }
                scopeOfficeId = staff.officeId;
                scopeLabel = staff.office?.alias || staff.office?.name || null;
            }

            // Every figure on this dashboard describes complaints FILED within the selected
            // window (Complaint.createdAt) — one consistent definition, rather than mixing
            // period-scoped counts with always-current ones. 'week' aligns to the ISO week
            // (Monday) so it matches the trend bucketing below; month/year align to the
            // calendar unit. The KPI tiles above this panel (needs assignment / ack overdue /
            // resolution overdue) are deliberately NOT period-scoped — those describe the
            // current operational backlog regardless of when it was filed, so they stay on
            // their own always-current endpoints.
            const period = ['week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';

            try {
                // `now` stays the true current moment throughout — it's what
                // getReceiveComplianceStatus/getResolutionComplianceStatus (utils/businessHours.js)
                // judge "overdue" against internally, and can't be pinned to a past reference
                // without changing those shared, still-live helpers. Only the period WINDOW (which
                // complaints get included) shifts for a past year — same pattern as
                // FeedbackController's resolvePeriodRange: for the current year it's relative to
                // `now` as usual; for any other year, the window's own "now" becomes Dec 31 of that
                // year, so period='year' shows the whole year and 'week'/'month' show its last
                // week/month.
                const now = new Date();
                const currentYear = moment().year();
                const requestedYear = Number.isInteger(Number(req.query.year)) && Number(req.query.year) > 0
                    ? Number(req.query.year)
                    : currentYear;
                const referenceMoment = requestedYear === currentYear
                    ? moment(now)
                    : moment(`${requestedYear}-12-31`, 'YYYY-MM-DD').endOf('day');
                const sinceMoment = period === 'week' ? moment(referenceMoment).startOf('isoWeek') : moment(referenceMoment).startOf(period);
                const since = sinceMoment.toDate();
                const until = referenceMoment.toDate();
                const range = {
                    period,
                    year: requestedYear,
                    label: `${sinceMoment.format('MMM D')} – ${moment(until).format('MMM D, YYYY')}`,
                    since,
                    until
                };
                const scope = { officeId: scopeOfficeId, label: scopeLabel };

                // Every complaint id this office has ever touched (any ComplaintOffice row, not
                // just active ones — matches how getAllComplaints scopes a workstation's own
                // list) — null for system-wide, meaning "no restriction" everywhere below.
                let officeComplaintIds = null;
                if (scopeOfficeId) {
                    const officeAssignments = await ComplaintOffice.findAll({
                        where: { officeId: scopeOfficeId },
                        attributes: ['complaintId'],
                        raw: true
                    });
                    officeComplaintIds = [...new Set(officeAssignments.map(a => a.complaintId))];
                }

                // Base filter for every Complaint-level query below — the period window, plus
                // (for a scoped office) restricted to complaints that office has ever handled.
                // Needs the upper bound too, not just the lower — without it, a past year's window
                // would leak every complaint from `since` all the way through the real current date.
                const complaintScopeWhere = { createdAt: { [Op.gte]: since, [Op.lte]: until } };
                if (officeComplaintIds) {
                    complaintScopeWhere.id = { [Op.in]: officeComplaintIds.length ? officeComplaintIds : [0] };
                }
                // Same idea for ComplaintOffice-level queries — a scoped office also needs its
                // own officeId on the row itself, not just "touches one of my complaints": a
                // multi-office complaint's OTHER office's row must never leak into my numbers.
                const officeRowWhere = scopeOfficeId ? { officeId: scopeOfficeId } : {};

                const periodComplaintRows = await Complaint.findAll({
                    where: complaintScopeWhere,
                    attributes: ['id', 'createdAt'],
                    raw: true
                });
                const periodComplaintIds = periodComplaintRows.map(c => c.id);
                // A safe "matches nothing" fallback for Op.in — an empty array on its own still
                // needs a non-empty list to compare against.
                const periodComplaintWhere = { complaintId: { [Op.in]: periodComplaintIds.length ? periodComplaintIds : [0] } };

                const statusRows = await Complaint.findAll({
                    where: complaintScopeWhere,
                    attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                    group: ['status'],
                    raw: true
                });
                const statusBreakdown = statusRows.map(r => ({ status: r.status, count: parseInt(r.count, 10) }));
                const totalComplaints = statusBreakdown.reduce((sum, r) => sum + r.count, 0);

                // Always 0 for a scoped office — an "unassigned" complaint by definition has no
                // ComplaintOffice row for any office yet, so it can never appear here.
                const unassignedCount = statusBreakdown.find(r => r.status === 'unassigned')?.count || 0;

                // Mirrors getAllComplaints' overdueOnly filter — offices still not received past
                // their 24-business-hour acknowledgement deadline, among this period's complaints.
                const overdueRows = await ComplaintOffice.findAll({
                    where: { ...periodComplaintWhere, ...officeRowWhere, isActive: true, receivedAt: null, receiveDeadline: { [Op.lt]: now } },
                    attributes: ['complaintId'],
                    raw: true
                });
                const ackOverdueCount = new Set(overdueRows.map(r => r.complaintId)).size;

                // Mirrors getAllComplaints' resolutionOverdueOnly filter.
                const resolutionOverdueCount = await Complaint.count({
                    where: {
                        ...complaintScopeWhere,
                        resolutionDeadline: { [Op.lt]: now },
                        completedAt: null,
                        status: { [Op.notIn]: ['cancelled'] }
                    }
                });

                // Avg. days from filing to completion, across this period's completed complaints.
                // Full precision (not toFixed(1)) — a resolution that took under an hour would
                // otherwise round to "0.0" days; the frontend picks minutes/hours/days itself
                // based on magnitude (see formatResolutionTime on ComplaintPage.vue).
                const avgResolutionDaysFor = async (where) => {
                    const rows = await Complaint.findAll({
                        where: { ...where, status: 'completed', completedAt: { [Op.ne]: null } },
                        attributes: ['createdAt', 'completedAt'],
                        raw: true
                    });
                    return rows.length
                        ? +(rows.reduce((sum, c) =>
                            sum + (new Date(c.completedAt) - new Date(c.createdAt)) / 86400000, 0
                          ) / rows.length).toFixed(5)
                        : null;
                };
                const avgResolutionDays = await avgResolutionDaysFor(complaintScopeWhere);

                // Avg. time from a ComplaintOffice row going active to actually being received,
                // across this period's received rows — the acknowledgement-side counterpart to
                // avgResolutionDays above. Scoped by complaintId (periodComplaintWhere), same
                // convention as every other per-office query below (ackTally, backlogRaw, etc.),
                // not by the office row's own createdAt.
                const avgAcknowledgementDaysFor = async (complaintIdWhere) => {
                    const rows = await ComplaintOffice.findAll({
                        where: { ...complaintIdWhere, ...officeRowWhere, isActive: true, receivedAt: { [Op.ne]: null } },
                        attributes: ['createdAt', 'receivedAt'],
                        raw: true
                    });
                    return rows.length
                        ? +(rows.reduce((sum, o) =>
                            sum + (new Date(o.receivedAt) - new Date(o.createdAt)) / 86400000, 0
                          ) / rows.length).toFixed(5)
                        : null;
                };
                const avgAcknowledgementDays = await avgAcknowledgementDaysFor(periodComplaintWhere);

                // Avg. time between when the LAST assigned office finished its own part
                // (ComplaintOffice.completedAt) and when a supervisor actually finalized the whole
                // complaint (Complaint.completedAt) — the "approval lag" the AI completion-
                // suggestion banner (getCompletionSuggestion) exists to shrink. Requires
                // updateStatus to have preserved each office's real completedAt rather than
                // stomping it to match the complaint's own — see the fix there. A complaint the
                // supervisor force-completed early (before every office was individually done)
                // naturally comes out with 0 lag: there was nothing to wait on.
                const avgApprovalLagHoursFor = async (where) => {
                    const completedRows = await Complaint.findAll({
                        where: { ...where, status: 'completed', completedAt: { [Op.ne]: null } },
                        attributes: ['id', 'completedAt'],
                        raw: true
                    });
                    if (!completedRows.length) return null;
                    const completedIds = completedRows.map(c => c.id);
                    const officeRows = await ComplaintOffice.findAll({
                        where: { complaintId: { [Op.in]: completedIds }, ...officeRowWhere, isActive: true, completedAt: { [Op.ne]: null } },
                        attributes: ['complaintId', 'completedAt'],
                        raw: true
                    });
                    const lastOfficeDoneAt = {};
                    officeRows.forEach(o => {
                        const t = new Date(o.completedAt).getTime();
                        if (!lastOfficeDoneAt[o.complaintId] || t > lastOfficeDoneAt[o.complaintId]) {
                            lastOfficeDoneAt[o.complaintId] = t;
                        }
                    });
                    const samples = completedRows
                        .filter(c => lastOfficeDoneAt[c.id] != null)
                        .map(c => (new Date(c.completedAt).getTime() - lastOfficeDoneAt[c.id]) / 3600000)
                        .filter(hours => hours >= 0); // guards against any pre-fix legacy rows
                    return samples.length ? +(samples.reduce((s, h) => s + h, 0) / samples.length).toFixed(2) : null;
                };
                const avgApprovalLagHours = await avgApprovalLagHoursFor(complaintScopeWhere);

                // Trend badges — this period vs. the immediately preceding one of the same kind
                // (last week/month/year, matching whichever period button is selected), not a
                // fixed lookback. Calendar-unit-over-calendar-unit, same convention as `range`
                // itself; a partial "this month so far" is compared against the FULL prior month,
                // which can understate an in-progress period's growth — acceptable for a simple
                // trend indicator, not a normalized rate.
                const prevSinceMoment = period === 'week'
                    ? moment(sinceMoment).subtract(1, 'week')
                    : period === 'year'
                        ? moment(sinceMoment).subtract(1, 'year')
                        : moment(sinceMoment).subtract(1, 'month');
                const prevUntilMoment = period === 'week'
                    ? moment(prevSinceMoment).endOf('isoWeek')
                    : moment(prevSinceMoment).endOf(period === 'year' ? 'year' : 'month');
                const prevWhere = { createdAt: { [Op.gte]: prevSinceMoment.toDate(), [Op.lte]: prevUntilMoment.toDate() } };
                if (officeComplaintIds) {
                    prevWhere.id = { [Op.in]: officeComplaintIds.length ? officeComplaintIds : [0] };
                }
                const prevTotalComplaints = await Complaint.count({ where: prevWhere });
                const prevAvgResolutionDays = await avgResolutionDaysFor(prevWhere);

                const prevComplaintRows = await Complaint.findAll({ where: prevWhere, attributes: ['id'], raw: true });
                const prevComplaintIds = prevComplaintRows.map(c => c.id);
                const prevPeriodComplaintWhere = { complaintId: { [Op.in]: prevComplaintIds.length ? prevComplaintIds : [0] } };
                const prevAvgAcknowledgementDays = await avgAcknowledgementDaysFor(prevPeriodComplaintWhere);

                const pctChange = (current, previous) => {
                    if (current == null || previous == null || previous === 0) return null;
                    return +((current - previous) / previous * 100).toFixed(1);
                };
                const trendLabel = period === 'week' ? 'last week' : period === 'year' ? 'last year' : 'last month';
                const trends = {
                    totalComplaints: { current: totalComplaints, previous: prevTotalComplaints, pctChange: pctChange(totalComplaints, prevTotalComplaints), label: trendLabel },
                    avgResolutionDays: { current: avgResolutionDays, previous: prevAvgResolutionDays, pctChange: pctChange(avgResolutionDays, prevAvgResolutionDays), label: trendLabel },
                    avgAcknowledgementDays: { current: avgAcknowledgementDays, previous: prevAvgAcknowledgementDays, pctChange: pctChange(avgAcknowledgementDays, prevAvgAcknowledgementDays), label: trendLabel }
                };

                // Complexity mix + on-time resolution rate per ARTA/EODB tier — same 4-state
                // compliance logic the detail modal uses, tallied instead of shown per-row.
                const classified = await Complaint.findAll({
                    where: { ...complaintScopeWhere, complexity: { [Op.ne]: null } },
                    attributes: ['complexity', 'status', 'completedAt', 'resolutionDeadline'],
                    raw: true
                });
                const totalClassified = classified.length;
                const complexityMix = Object.keys(RESOLUTION_DAYS).map(tier => {
                    const rows = classified.filter(c => c.complexity === tier);
                    const finished = rows.filter(c => c.status === 'completed');
                    const onTime = finished.filter(c => getResolutionComplianceStatus(c) === 'on_time').length;
                    return {
                        tier,
                        targetDays: RESOLUTION_DAYS[tier],
                        count: rows.length,
                        share: totalClassified ? +(rows.length / totalClassified * 100).toFixed(1) : 0,
                        onTimeRate: finished.length ? +(onTime / finished.length * 100).toFixed(1) : null
                    };
                });

                // Open backlog (not completed/cancelled) among this period's complaints, by
                // office — top 8. For a scoped office this naturally comes back as a single row
                // (their own), so the frontend skips rendering this panel outside the
                // system-wide view rather than showing a one-bar chart.
                const backlogRaw = await ComplaintOffice.findAll({
                    where: { ...periodComplaintWhere, ...officeRowWhere, isActive: true, status: { [Op.notIn]: ['completed', 'cancelled'] } },
                    attributes: ['officeId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                    group: ['officeId'],
                    order: [[Sequelize.literal('count'), 'DESC']],
                    limit: 8,
                    raw: true
                });
                const backlogOfficeIds = backlogRaw.map(r => r.officeId);
                const backlogOffices = backlogOfficeIds.length
                    ? await Office.findAll({ where: { id: backlogOfficeIds }, attributes: ['id', 'name', 'alias'], raw: true })
                    : [];
                const officesById = Object.fromEntries(backlogOffices.map(o => [o.id, o]));
                const officeBacklog = backlogRaw.map(r => ({
                    officeId: r.officeId,
                    label: officesById[r.officeId]?.alias || officesById[r.officeId]?.name || 'Unknown office',
                    count: parseInt(r.count, 10)
                }));

                // SLA compliance snapshot — acknowledgement (per office assignment) and
                // resolution (per complaint), both rates computed only over cases where the
                // deadline has actually been tested (on_time/late/overdue), excluding rows still
                // 'awaiting' or with no deadline at all ('not_applicable'). Eager-loads the parent
                // Complaint so the same query also feeds the per-office breakdown below without a
                // second round-trip.
                const activeOffices = await ComplaintOffice.findAll({
                    where: { ...periodComplaintWhere, ...officeRowWhere, isActive: true },
                    include: [{ model: Complaint, as: 'complaint', attributes: ['status', 'completedAt', 'resolutionDeadline'] }]
                });
                const ackTally = { on_time: 0, late: 0, overdue: 0 };
                // A multi-office complaint's resolution outcome counts toward EACH assigned
                // office's own resolution rate — same convention officeBacklog already uses
                // (one tally per office assignment, not per complaint).
                const complianceByOffice = {};
                activeOffices.forEach(o => {
                    const ackStatus = getReceiveComplianceStatus(o);
                    if (ackStatus in ackTally) ackTally[ackStatus]++;

                    if (!complianceByOffice[o.officeId]) {
                        complianceByOffice[o.officeId] = { ack: { on_time: 0, late: 0, overdue: 0 }, res: { on_time: 0, late: 0, overdue: 0 } };
                    }
                    if (ackStatus in complianceByOffice[o.officeId].ack) complianceByOffice[o.officeId].ack[ackStatus]++;

                    const resStatus = o.complaint ? getResolutionComplianceStatus(o.complaint) : 'not_applicable';
                    if (resStatus in complianceByOffice[o.officeId].res) complianceByOffice[o.officeId].res[resStatus]++;
                });
                const ackDenom = ackTally.on_time + ackTally.late + ackTally.overdue;
                const ackRate = ackDenom ? +(ackTally.on_time / ackDenom * 100).toFixed(1) : null;

                const allComplaints = await Complaint.findAll({
                    where: complaintScopeWhere,
                    attributes: ['status', 'completedAt', 'resolutionDeadline'],
                    raw: true
                });
                const resTally = { on_time: 0, late: 0, overdue: 0 };
                allComplaints.forEach(c => {
                    const s = getResolutionComplianceStatus(c);
                    if (s in resTally) resTally[s]++;
                });
                const resDenom = resTally.on_time + resTally.late + resTally.overdue;
                const resolutionRate = resDenom ? +(resTally.on_time / resDenom * 100).toFixed(1) : null;

                // Ack vs. resolution rate, per office — flags an office that's fast to acknowledge
                // but slow to actually resolve (or vice versa), which the single system-wide SLA
                // panel above can't distinguish.
                const complianceOfficeIds = Object.keys(complianceByOffice).map(Number);
                const complianceOffices = complianceOfficeIds.length
                    ? await Office.findAll({ where: { id: complianceOfficeIds }, attributes: ['id', 'name', 'alias'], raw: true })
                    : [];
                const complianceOfficesById = Object.fromEntries(complianceOffices.map(o => [o.id, o]));
                const ackResolutionByOffice = complianceOfficeIds
                    .map(id => {
                        const c = complianceByOffice[id];
                        const officeAckDenom = c.ack.on_time + c.ack.late + c.ack.overdue;
                        const officeResDenom = c.res.on_time + c.res.late + c.res.overdue;
                        return {
                            officeId: id,
                            label: complianceOfficesById[id]?.alias || complianceOfficesById[id]?.name || 'Unknown office',
                            ackRate: officeAckDenom ? +(c.ack.on_time / officeAckDenom * 100).toFixed(1) : null,
                            resolutionRate: officeResDenom ? +(c.res.on_time / officeResDenom * 100).toFixed(1) : null,
                        };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label));

                // Routing accuracy — how much of this period's workload the AI actually carried
                // (ComplaintOffice.assignedBy), and how often a supervisor had to correct its
                // initial call (a ComplaintHistory 'reassigned' entry — distinct from the
                // 'auto_assigned'/'left_unassigned' entries the AI itself logs).
                const aiAssignedCount = await ComplaintOffice.count({ where: { ...periodComplaintWhere, ...officeRowWhere, assignedBy: 'ai' } });
                const adminAssignedCount = await ComplaintOffice.count({ where: { ...periodComplaintWhere, ...officeRowWhere, assignedBy: 'admin' } });
                const reassignedRows = await ComplaintHistory.findAll({
                    where: { ...periodComplaintWhere, action: 'reassigned' },
                    attributes: ['complaintId'],
                    raw: true
                });
                const reassignedCount = new Set(reassignedRows.map(r => r.complaintId)).size;
                const reassignmentRate = totalComplaints ? +(reassignedCount / totalComplaints * 100).toFixed(1) : 0;

                // Filing volume trend, bucketed to a granularity that fits the selected period —
                // daily across a week, weekly across a month, monthly across a year.
                let bucketDefs;
                if (period === 'week') {
                    bucketDefs = Array.from({ length: 7 }, (_, i) => {
                        const day = moment(sinceMoment).add(i, 'days');
                        return { label: day.format('ddd D'), start: moment(day).startOf('day'), end: moment(day).endOf('day') };
                    });
                } else if (period === 'year') {
                    bucketDefs = Array.from({ length: 12 }, (_, i) => {
                        const m = moment(sinceMoment).add(i, 'months');
                        return { label: m.format('MMM'), start: moment(m).startOf('month'), end: moment(m).endOf('month') };
                    });
                } else {
                    const weekSpan = Math.max(1, Math.ceil(moment(until).diff(sinceMoment, 'days') / 7) + 1);
                    bucketDefs = Array.from({ length: weekSpan }, (_, i) => {
                        const w = moment(sinceMoment).add(i, 'weeks');
                        return { label: w.format('MMM D'), start: moment(w).startOf('day'), end: moment(w).add(6, 'days').endOf('day') };
                    });
                }
                const volumeTrend = bucketDefs.map(b => ({ label: b.label, count: 0 }));
                periodComplaintRows.forEach(c => {
                    const created = moment(c.createdAt);
                    const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
                    if (idx >= 0) volumeTrend[idx].count++;
                });

                // Citizen satisfaction — 1-5 star ratings left on responses. Scoped by when the
                // rating was GIVEN (not when the underlying complaint was filed), unlike the rest
                // of this endpoint — a complaint filed last month can still be rated this week,
                // and it's this week's ratings that belong in "this week's" satisfaction panel.
                // For a scoped office, further restricted to ratings on THAT office's own staff
                // responses (Response.userId -> Staff.officeId), not just responses on complaints
                // the office happens to also be assigned to.
                const ratingWhere = { createdAt: { [Op.gte]: since, [Op.lte]: until } };
                if (scopeOfficeId) {
                    const officeStaff = await Staff.findAll({ where: { officeId: scopeOfficeId }, attributes: ['userId'], raw: true });
                    const officeUserIds = officeStaff.map(s => s.userId);
                    const officeResponses = await Response.findAll({
                        where: { userId: { [Op.in]: officeUserIds.length ? officeUserIds : [0] } },
                        attributes: ['id'],
                        raw: true
                    });
                    const officeResponseIds = officeResponses.map(r => r.id);
                    ratingWhere.responseId = { [Op.in]: officeResponseIds.length ? officeResponseIds : [0] };
                }
                const periodRatings = await ResponseRating.findAll({
                    where: ratingWhere,
                    attributes: ['rate'],
                    raw: true
                });
                const totalRatings = periodRatings.length;
                const avgSatisfaction = totalRatings
                    ? +(periodRatings.reduce((sum, r) => sum + r.rate, 0) / totalRatings).toFixed(1)
                    : null;
                const satisfactionDistribution = [1, 2, 3, 4, 5].map(stars => ({
                    stars,
                    count: periodRatings.filter(r => Math.round(r.rate) === stars).length
                }));

                return res.json({
                    data: {
                        range,
                        scope,
                        kpis: {
                            totalComplaints,
                            unassignedCount,
                            ackOverdueCount,
                            resolutionOverdueCount,
                            avgResolutionDays,
                            avgAcknowledgementDays,
                            avgApprovalLagHours,
                            avgSatisfaction
                        },
                        trends,
                        statusBreakdown,
                        complexityMix,
                        officeBacklog,
                        slaCompliance: { ackRate, resolutionRate },
                        ackResolutionByOffice,
                        routingAccuracy: {
                            aiAssignedCount,
                            adminAssignedCount,
                            reassignedCount,
                            reassignmentRate
                        },
                        satisfaction: {
                            avgRating: avgSatisfaction,
                            totalRatings,
                            distribution: satisfactionDistribution
                        },
                        volumeTrend
                    }
                });
            } catch (error) {
                console.error('Error generating complaint analytics:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        // Feeds the "feedback locations" map on the overview — every complaint that has a
        // latitude/longitude on file (only ever set for a citizen-filed one, see
        // ComplaintValidator/createAccountComplaint; staff-filed and pre-geolocation-feature
        // complaints just don't appear here). Not period-scoped — the map plots everything on
        // record, same "all feedback" framing as the citizen-base tiles elsewhere on Home.
        // Same office-scoping as getAnalytics: a workstation only sees pins for complaints ever
        // assigned to its own office; super/admin/monitoring see every pin system-wide.
        getComplaintLocations: async (req, res) => {
            const isSystemWide = ['super', 'admin', 'monitoring'].includes(req.role);
            let scopeOfficeId = null;

            if (!isSystemWide) {
                const staff = await Staff.findOne({ where: { userId: req.userId } });
                if (!staff) {
                    return res.status(403).json({ message: 'You do not have access to this data.' });
                }
                scopeOfficeId = staff.officeId;
            }

            try {
                let complaintIdWhere = {};
                if (scopeOfficeId) {
                    const officeAssignments = await ComplaintOffice.findAll({
                        where: { officeId: scopeOfficeId },
                        attributes: ['complaintId'],
                        raw: true
                    });
                    const ids = [...new Set(officeAssignments.map(a => a.complaintId))];
                    complaintIdWhere = { id: { [Op.in]: ids.length ? ids : [0] } };
                }

                const complaints = await Complaint.findAll({
                    where: complaintIdWhere,
                    attributes: ['id', 'referenceNo', 'status', 'content', 'createdAt'],
                    include: [{
                        model: ComplaintDetail,
                        as: 'complaintDetail',
                        attributes: ['latitude', 'longitude'],
                        where: { latitude: { [Op.ne]: null }, longitude: { [Op.ne]: null } },
                        required: true
                    }],
                    order: [['createdAt', 'DESC']],
                    limit: 1000
                });

                const data = complaints.map(c => ({
                    id: c.id,
                    referenceNo: c.referenceNo,
                    status: c.status,
                    // Popup-sized snippet only — this endpoint is for map pins, not the full record.
                    content: (c.content || '').slice(0, 140),
                    createdAt: c.createdAt,
                    latitude: Number(c.complaintDetail.latitude),
                    longitude: Number(c.complaintDetail.longitude)
                }));

                return res.status(200).json({ data });
            } catch (error) {
                console.error('Error fetching complaint locations:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        getComplaintDetail: async(req, res) => {

            const { id } = req.params;
            const userId = req.userId;
            const userRole = req.role;

            try {
                const rows  = await Complaint.findOne({
                    where: {
                        id
                    },
                    include: [
                        {
                            model: ComplaintDetail,
                            as: 'complaintDetail',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: { exclude: ['password'] },
                                    // Citizen's email/phone — only populated for a citizen user, needed to
                                    // prefill the edit form for a staff-filed (via: 'staff') complaint.
                                    include: [{ model: Citizen, as: 'citizen' }]
                                }
                            ]
                        },
                        {
                            model: ComplaintOffice,
                            as: 'complaintOffices',
                            include: [
                                {
                                    model: Office,
                                    as: 'office',
                                    attributes: ['alias', 'name']
                                }
                            ]
                        },
                        {
                            model: ComplaintFile,
                            as: 'complaintFiles'
                        },
                        {
                            model: Response,
                            as: 'responses',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: { exclude: ['password'] },
                                    // So a response can be attributed to the department that sent it,
                                    // not just the staff member's name.
                                    include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }] }]
                                },
                                { model: ResponseFile, as: 'responseFiles' },
                                { model: ResponseRating, as: 'responseRatings' }
                            ],
                            separate: true,
                            order: [['createdAt', 'DESC']]
                        },
                        {
                            model: ComplaintHistory,
                            as: 'history',
                            separate: true,
                            order: [['createdAt', 'DESC']]
                        }
                    ]
                });

                if (!rows) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }

                // Citizens may only open the detail of their own complaint. Super/admin/monitoring
                // see any complaint. Workstation staff are scoped to their own office — same
                // definition getAllComplaints already uses for their list (any ComplaintOffice row
                // for their office, active or not), so anything they can see in the list they can
                // open here.
                if (userRole === 'citizen') {
                    if (rows.complaintDetail?.userId !== userId) {
                        return res.status(403).json({ message: 'You do not have access to this feedback.' });
                    }
                } else if (!['super', 'admin', 'monitoring'].includes(userRole)) {
                    const staff = await Staff.findOne({ where: { userId } });
                    const hasAccess = staff && rows.complaintOffices?.some(co => co.officeId === staff.officeId);
                    if (!hasAccess) {
                        return res.status(403).json({ message: 'You do not have access to this feedback.' });
                    }
                }

                const data = annotateResolutionCompliance(annotateOfficeCompliance(
                    userRole === 'citizen'
                        ? hydrateGuestComplainant(rows.toJSON())
                        : redactIfAnonymous(hydrateGuestComplainant(rows.toJSON()))
                ));

                res.json({
                    data
                });

            } catch (error) {
                console.error('Error generating complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        getMyComplaints: async (req, res) => {
            const userId = req.userId;

            try {
                const details = await ComplaintDetail.findAll({
                    where: { userId },
                    include: [
                        {
                            model: Complaint,
                            as: 'complaint',
                            include: [
                                {
                                    model: ComplaintOffice,
                                    as: 'complaintOffices',
                                    include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }]
                                }
                            ]
                        }
                    ],
                    order: [['createdAt', 'DESC']]
                });

                return res.json({ data: details.map(d => d.complaint) });
            } catch (error) {
                console.error('Error fetching citizen complaints:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        trackComplaint: async (req, res) => {
            const { referenceNo } = req.params;
            const { otp } = req.query;

            if (!otp) {
                return res.status(400).json({ message: 'An access code is required to track feedback.' });
            }

            try {
                const complaint = await Complaint.findOne({
                    where: { referenceNo },
                    include: [
                        {
                            model: ComplaintDetail,
                            as: 'complaintDetail',
                            where: { otp },
                            required: true
                        },
                        {
                            model: ComplaintOffice,
                            as: 'complaintOffices',
                            include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }]
                        },
                        {
                            model: ComplaintFile,
                            as: 'complaintFiles'
                        },
                        {
                            model: Response,
                            as: 'responses',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: { exclude: ['password'] },
                                    include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office', attributes: ['name', 'alias'] }] }]
                                },
                                { model: ResponseFile, as: 'responseFiles' }
                            ],
                            separate: true,
                            order: [['createdAt', 'DESC']]
                        },
                        {
                            model: ComplaintHistory,
                            as: 'history',
                            separate: true,
                            order: [['createdAt', 'DESC']]
                        }
                    ]
                });

                if (!complaint) {
                    return res.status(404).json({ message: 'No feedback found for that reference number and access code.' });
                }

                return res.json({ data: annotateResolutionCompliance(annotateOfficeCompliance(hydrateGuestComplainant(complaint.toJSON()))) });
            } catch (error) {
                console.error('Error tracking complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        },
        // Pulls a complaint filed before the citizen was logged in (a different email, or filed
        // anonymously) into their account. Knowing the reference number + OTP is the same proof of
        // ownership trackComplaint already relies on — reassigning ComplaintDetail.userId on that
        // basis is consistent with the trust model used everywhere else in this flow.
        claimComplaint: async (req, res) => {
            const { referenceNo, otp } = req.body;
            const userId = req.userId;

            if (!referenceNo || !otp) {
                return res.status(400).json({ message: 'Reference number and access code are both required.' });
            }

            try {
                const complaint = await Complaint.findOne({
                    where: { referenceNo },
                    include: {
                        model: ComplaintDetail,
                        as: 'complaintDetail',
                        where: { otp },
                        required: true
                    }
                });

                if (!complaint) {
                    return res.status(404).json({ message: 'No feedback found for that reference number and access code.' });
                }

                // An anonymous complaint stays unlinked on purpose — linking it to an identified
                // account would undo the anonymity the filer chose. It can still be followed with
                // its reference number and access code on the Track page.
                if (complaint.isAnonymous) {
                    return res.status(403).json({
                        message: 'This feedback was filed anonymously and can\'t be linked to an account. You can still track it with its reference number and access code.'
                    });
                }

                if (complaint.complaintDetail.userId === userId) {
                    return res.status(200).json({ message: 'This feedback is already linked to your account.', complaint });
                }
                if (complaint.complaintDetail.userId && complaint.complaintDetail.userId !== userId) {
                    return res.status(409).json({ message: 'This feedback is already linked to a different account.' });
                }

                await complaint.complaintDetail.update({ userId });

                return res.status(200).json({ message: 'Feedback linked to your account.', complaint });
            } catch (error) {
                console.error('Error claiming complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }
        }
    };

};
