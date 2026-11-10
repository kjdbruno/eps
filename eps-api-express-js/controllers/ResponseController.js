const { Op } = require("sequelize");
const path = require('path');
const sharp = require('sharp');
const { Complaint, ComplaintDetail, ComplaintOffice, Response, ResponseFile, ResponseRating, Rating, User, Staff, Office, Notification } = require('../models');
const { logHistory, resolveActorLabel, resolveCitizenActorLabel } = require('../utils/complaintHistory');
const { getReceiveComplianceStatus } = require('../utils/businessHours');
const { pushNotifications, broadcastComplaintsChanged } = require('../utils/notifySocket');
const { notifyComplainant } = require('../utils/notifyComplainant');

let io; // Declare io variable

// Best-effort in-app notification: write the row, then push the recomputed unread list to the
// receiver's live socket(s) (see utils/notifySocket — a no-op if they're not currently
// connected, so the "real-time" push only lands for a user who's signed in on the app right
// now; the row is still there for their next login). Never throws — the action that triggered
// it is already committed by the time this runs.
const notifyUser = async (receiverId, content) => {
    if (!receiverId) return;
    try {
        await Notification.create({ receiverId, content });
        await pushNotifications(io, receiverId);
    } catch (error) {
        console.error(`Failed to notify user ${receiverId}:`, error);
    }
};

// Every staff member of the office(s) currently handling a complaint — the "concerned
// workstation(s)" for a citizen follow-up. Pass `exceptOfficeId` to leave one office out: on a
// staff response, the OTHER assigned office(s) are notified, not the one that just posted.
const getConcernedStaffUserIds = async (complaintId, exceptOfficeId = null) => {
    const offices = await ComplaintOffice.findAll({ where: { complaintId, isActive: true } });
    const officeIds = offices.map(o => o.officeId).filter(id => id !== exceptOfficeId);
    if (!officeIds.length) return [];
    const staff = await Staff.findAll({
        where: { officeId: { [Op.in]: officeIds } }
    });
    return [...new Set(staff.map(s => s.userId))];
};

// Every super/admin account — they oversee the whole complaint queue, so they're kept in the
// loop on office responses in-app (rather than the complainant being emailed for each one).
const getSupervisorUserIds = async () => {
    const admins = await User.findAll({
        where: { role: { [Op.in]: ['super', 'admin'] } },
        attributes: ['id']
    });
    return admins.map(a => a.id);
};

const officeLabel = async (officeId) => {
    const office = await Office.findByPk(officeId);
    return office ? (office.alias || office.name) : 'a city office';
};

// Evidence attached to a follow-up response — same blob-in-DB convention as
// ComplaintController's saveComplaintFiles: images are resized/recompressed, PDFs pass through
// as-is. Both end up as a base64 data URI in ResponseFile.file, no on-disk storage.
const saveResponseFiles = async (files, responseId) => {
    if (!files || !files.length) return;

    for (const file of files) {
        const filename = file.originalname;
        const isPdf = file.mimetype === 'application/pdf';

        let base64;
        let mimeType;

        if (isPdf) {
            base64 = file.buffer.toString('base64');
            mimeType = 'application/pdf';
        } else {
            const isPng = path.extname(filename).toLowerCase() === '.png';
            let sharpPipeline = sharp(file.buffer).resize({ width: 800, withoutEnlargement: true });
            sharpPipeline = isPng
                ? sharpPipeline.png({ quality: 80 })
                : sharpPipeline.flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({ quality: 80 });

            const buffer = await sharpPipeline.toBuffer();
            base64 = buffer.toString('base64');
            mimeType = isPng ? 'image/png' : 'image/jpeg';
        }

        await ResponseFile.create({
            responseId,
            filename,
            file: `data:${mimeType};base64,${base64}`
        });
    }
};

// Resolves the acting staff member's office, and the ComplaintOffice row that tracks
// that office's share of the given complaint (the unit response-time is measured against).
const getStaffComplaintOffice = async (userId, complaintId) => {
    const staff = await Staff.findOne({ where: { userId } });
    if (!staff) return { staff: null, complaintOffice: null };

    const complaintOffice = await ComplaintOffice.findOne({
        // an office that handed the feedback over no longer acts on it
        where: { complaintId, officeId: staff.officeId, isActive: true }
    });

    return { staff, complaintOffice };
};

// NOTE: there used to be a maybeCompleteComplaint() here that auto-finalized the whole Complaint
// the instant every active office's ComplaintOffice row flipped to 'completed'. Deliberately
// removed — every office finishing its own part no longer finalizes the complaint by itself, even
// implicitly. A supervisor always makes that call explicitly via ComplaintController.updateStatus,
// now assisted (not replaced) by the AI completion suggestion — see
// utils/completionSuggestion.js, which treats "every active office completed" as its strongest
// eligibility signal rather than something to auto-act on.

module.exports = (_io) => {
    io = _io;

    return {
        receive: async (req, res) => {

            const { complaintId, content } = req.body;
            const userId = req.userId;

            try {
                const { complaintOffice } = await getStaffComplaintOffice(userId, complaintId);
                if (!complaintOffice) {
                    return res.status(404).json({ message: 'This feedback is not assigned to your office.' });
                }

                const wasFirstReceive = complaintOffice.status === 'pending';
                if (wasFirstReceive) {
                    await complaintOffice.update({ status: 'received', receivedAt: new Date(), receivedByUserId: userId });
                }

                await Complaint.update(
                    { status: 'ongoing' },
                    { where: { id: complaintId, status: { [Op.in]: ['pending', 'unassigned'] } } }
                );

                let response = null;
                if (content) {
                    response = await Response.create({ complaintId, userId, content });
                }

                const actorLabel = await resolveActorLabel(userId);
                // Note whether the 24-business-hour acknowledgement window was met — computed
                // fresh from the just-updated row, never stored.
                const complianceStatus = wasFirstReceive ? getReceiveComplianceStatus(complaintOffice) : null;
                const complianceNote = complianceStatus === 'on_time'
                    ? ' Acknowledged on time.'
                    : complianceStatus === 'late'
                        ? ' Acknowledged past the 24-business-hour deadline.'
                        : '';
                await logHistory({
                    complaintId,
                    actorRole: req.role,
                    actorLabel,
                    action: 'received',
                    description: `Received by ${actorLabel || 'a staff member'}.${complianceNote}`
                });

                // Notify the complainant that an office has picked up their complaint (and/or
                // posted an initial response). Only meaningful the first time, or when a
                // message came with it.
                if (wasFirstReceive || response) {
                    const complaint = await Complaint.findByPk(complaintId);
                    const office = await officeLabel(complaintOffice.officeId);
                    const ref = complaint ? complaint.referenceNo : '';
                    await notifyComplainant(
                        io, complaintId,
                        response
                            ? `${office} responded to your feedback ${ref}.`
                            : `${office} received your feedback ${ref}.`
                    );

                    // Every super/admin is looped in on all responses, in-app.
                    if (response) {
                        const supers = await getSupervisorUserIds();
                        await Promise.all(
                            supers.filter(uid => uid !== userId).map(uid =>
                                notifyUser(uid, `${office} responded to feedback ${ref}.`)
                            )
                        );
                    }
                }

                broadcastComplaintsChanged(io, 'received');

                return res.status(201).json({
                    message: 'Feedback marked as received by your office.',
                    complaintOffice,
                    response
                });

            } catch (error) {
                console.error('Error receiving complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }

        },
        // Workstation posts a response as their office (ties into that office's ComplaintOffice
        // row, moving it to 'ongoing' if it wasn't already). Super/admin can also post a response
        // — as a supervisor's general update, not tied to any single office's queue — since
        // they're not linked to a specific office via a Staff row in the first place. Citizen can
        // post a follow-up on their OWN complaint only.
        respond: async (req, res) => {

            const { complaintId, content } = req.body;
            const files = req.files; // From Multer

            const userId = req.userId;
            const role = req.role;

            try {
                let complaintOffice = null;
                let isAnonymousComplaint = false; // only ever true when role === 'citizen' below

                if (role === 'workstation') {
                    ({ complaintOffice } = await getStaffComplaintOffice(userId, complaintId));
                    if (!complaintOffice) {
                        return res.status(404).json({ message: 'This feedback is not assigned to your office.' });
                    }
                } else if (role === 'citizen') {
                    const detail = await ComplaintDetail.findOne({ where: { complaintId } });
                    if (!detail || detail.userId !== userId) {
                        return res.status(403).json({ message: 'You do not have access to this feedback.' });
                    }
                    const complaint = await Complaint.findByPk(complaintId);
                    if (!complaint) {
                        return res.status(404).json({ message: 'Feedback not found.' });
                    }
                    if (['completed', 'cancelled'].includes(complaint.status)) {
                        return res.status(400).json({ message: 'This feedback is already finalized — no further follow-ups can be added.' });
                    }
                    isAnonymousComplaint = complaint.isAnonymous;
                } else {
                    const complaint = await Complaint.findByPk(complaintId);
                    if (!complaint) {
                        return res.status(404).json({ message: 'Feedback not found.' });
                    }
                    // A super/admin whose own office (Staff row) is assigned to this complaint is
                    // acting for that office too, so their response stamps its receipt exactly like
                    // a workstation response does. null for a super/admin with no office, or whose
                    // office isn't assigned here — their response then stays a general supervisory
                    // update that touches no office's queue.
                    ({ complaintOffice } = await getStaffComplaintOffice(userId, complaintId));
                }

                const response = await Response.create({
                    complaintId,
                    userId,
                    content
                });

                // Evidence (optional) — stored as blobs, images resized/recompressed, PDFs as-is.
                await saveResponseFiles(files, response.id);

                if (complaintOffice && ['pending', 'received'].includes(complaintOffice.status)) {
                    await complaintOffice.update({
                        status: 'ongoing',
                        receivedAt: complaintOffice.receivedAt || new Date()
                    });
                }

                // Staff (workstation/super/admin) always get their real name in the trail — only a
                // citizen's own name is ever subject to the complaint's anonymity setting.
                const actorLabel = role === 'citizen'
                    ? await resolveCitizenActorLabel(userId, isAnonymousComplaint)
                    : await resolveActorLabel(userId);
                const fallbackLabel = role === 'citizen' ? 'The citizen' : 'A staff member';
                await logHistory({
                    complaintId,
                    actorRole: role,
                    actorLabel,
                    action: 'responded',
                    description: `${actorLabel || fallbackLabel} posted a follow-up response${files?.length ? ` with ${files.length} attachment(s)` : ''}.`
                });

                const respondComplaint = await Complaint.findByPk(complaintId);
                const respondRef = respondComplaint ? respondComplaint.referenceNo : '';
                if (role === 'citizen') {
                    // Citizen follow-up → every super/admin (they're looped in on ALL responses),
                    // plus the concerned workstation(s) handling it.
                    const recipients = new Set([
                        ...await getSupervisorUserIds(),
                        ...await getConcernedStaffUserIds(complaintId),
                    ]);
                    await Promise.all([...recipients].map(uid =>
                        notifyUser(uid, `New follow-up from the complainant on ${respondRef}.`)
                    ));
                } else {
                    // A routine staff response no longer emails the complainant — only the
                    // milestones (an office receiving it, and the final status change) do that. An
                    // account-holding complainant still gets an in-app note; a guest hears nothing
                    // here. Everyone else on the complaint is kept in the loop in-app: every
                    // super/admin, plus the OTHER assigned office(s) on a multi-office complaint,
                    // so one office's response reaches the rest. Never the poster themselves.
                    await notifyComplainant(io, complaintId, `New response on your feedback ${respondRef}.`, { emailGuest: false });

                    const actorOfficeId = complaintOffice ? complaintOffice.officeId : null;
                    const staffRecipients = [
                        ...await getSupervisorUserIds(),
                        ...await getConcernedStaffUserIds(complaintId, actorOfficeId),
                    ];
                    await Promise.all(
                        [...new Set(staffRecipients)]
                            .filter(uid => uid !== userId)
                            .map(uid => notifyUser(uid, `New response on feedback ${respondRef} from ${actorLabel || 'a staff member'}.`))
                    );
                }

                broadcastComplaintsChanged(io, 'responded');

                return res.status(201).json({
                    message: 'Response successfully saved!.',
                    response
                });

            } catch (error) {
                console.error('Error responding complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }

        },
        complete: async (req, res) => {

            const { complaintId, content } = req.body;
            const userId = req.userId;

            try {
                const { complaintOffice } = await getStaffComplaintOffice(userId, complaintId);
                if (!complaintOffice) {
                    return res.status(404).json({ message: 'This feedback is not assigned to your office.' });
                }
                // an office marks its part done only after it has received the feedback
                if (complaintOffice.status === 'pending') {
                    return res.status(409).json({ message: 'Your office has not received this feedback yet. Receive it first.' });
                }

                const response = await Response.create({
                    complaintId,
                    userId,
                    content
                });

                await complaintOffice.update({ status: 'completed', completedAt: new Date(), completedByUserId: userId });

                const actorLabel = await resolveActorLabel(userId);
                await logHistory({
                    complaintId,
                    actorRole: 'workstation',
                    actorLabel,
                    action: 'office_completed',
                    description: `${actorLabel || 'A staff member'}'s department marked its part complete.`
                });

                // Only THIS office's share is done — the complaint as a whole is never
                // auto-finalized here (a supervisor always makes that call explicitly, see
                // ComplaintController.updateStatus/getCompletionSuggestion). Progress, not a
                // resolution, so a guest isn't emailed (emailGuest: false) — they get the email
                // when the whole complaint is finalized; an account holder gets the in-app note.
                const doneComplaint = await Complaint.findByPk(complaintId);
                const doneRef = doneComplaint ? doneComplaint.referenceNo : '';
                const office = await officeLabel(complaintOffice.officeId);
                await notifyComplainant(
                    io, complaintId,
                    `${office} completed its part of your feedback ${doneRef}.`,
                    { emailGuest: false }
                );

                // Loop in the supervisors and any other assigned office, same as a staff response.
                const doneRecipients = [
                    ...await getSupervisorUserIds(),
                    ...await getConcernedStaffUserIds(complaintId, complaintOffice.officeId),
                ];
                await Promise.all(
                    [...new Set(doneRecipients)]
                        .filter(uid => uid !== userId)
                        .map(uid => notifyUser(uid, `${office} marked its part of feedback ${doneRef} complete.`))
                );

                broadcastComplaintsChanged(io, 'office_completed');

                return res.status(201).json({
                    message: 'Your office\'s response has been marked complete.',
                    response
                });
            } catch (error) {
                console.error('Error completing complaint:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }

        },
        // Super/admin-only. Case A of "office marked Done but it isn't really" — the complaint
        // itself hasn't been finalized yet (see reopen on ComplaintController for the case where
        // it already was), so this just walks back the ONE office's own completion, not the whole
        // complaint. Deliberately the mirror image of complete() above: same fields reset, reverse
        // direction.
        reopenOffice: async (req, res) => {
            // No reason required here — a plain confirm is enough (unlike ComplaintController.
            // reopen, which reverses an already citizen-notified finalization and keeps its
            // mandatory reason). trimmedReason is still logged/sent when a caller does pass one.
            const { complaintOfficeId, reason } = req.body;
            const trimmedReason = reason && reason.trim() ? reason.trim() : null;

            try {
                const complaintOffice = await ComplaintOffice.findByPk(complaintOfficeId);
                if (!complaintOffice) {
                    return res.status(404).json({ message: 'Assigned office not found.' });
                }

                const complaint = await Complaint.findByPk(complaintOffice.complaintId);
                if (!complaint) {
                    return res.status(404).json({ message: 'Feedback not found.' });
                }
                if (['completed', 'cancelled'].includes(complaint.status)) {
                    return res.status(400).json({
                        message: 'This feedback has already been finalized — use "reopen feedback" instead of sending a single office back.'
                    });
                }
                if (complaintOffice.status !== 'completed') {
                    return res.status(400).json({ message: 'This office has not marked its part complete.' });
                }

                // Captured before clearing — the account whose "done" mark is being reversed, so
                // ReportController.getAccountPerformanceReport can count it against them even
                // after completedByUserId itself gets nulled out below (and possibly overwritten
                // by someone else re-completing it later).
                const undoneUserId = complaintOffice.completedByUserId;

                await complaintOffice.update({ status: 'ongoing', completedAt: null, completedByUserId: null });

                const actorLabel = await resolveActorLabel(req.userId);
                const office = await officeLabel(complaintOffice.officeId);
                await logHistory({
                    complaintId: complaint.id,
                    actorRole: req.role,
                    actorLabel,
                    action: 'office_reopened',
                    description: `${office}'s completion was marked undone by ${actorLabel || 'a supervisor'}.` +
                        (trimmedReason ? ` Reason: ${trimmedReason}` : ''),
                    targetUserId: undoneUserId
                });

                const staffs = await Staff.findAll({ where: { officeId: complaintOffice.officeId } });
                for (const staff of staffs) {
                    await notifyUser(
                        staff.userId,
                        `${office}'s completed status on feedback ${complaint.referenceNo} was marked undone.` +
                            (trimmedReason ? ` Reason: ${trimmedReason}` : '')
                    );
                }

                broadcastComplaintsChanged(io, 'office_reopened');

                return res.status(200).json({ message: `${office}'s part has been sent back for more work.` });
            } catch (error) {
                console.error('Error reopening office completion:', error);
                return res.status(500).json({ message: 'Server error.', error: error.message });
            }
        },
        // Citizen-only: rate a single office response, 1-5 stars. One rating per (response,
        // citizen) — re-rating updates the existing row rather than creating a duplicate.
        rate: async (req, res) => {

            const { responseId, rate } = req.body;
            const userId = req.userId;

            const rateNum = Number(rate);
            if (!responseId || !Number.isFinite(rateNum) || rateNum < 1 || rateNum > 5) {
                return res.status(400).json({ message: 'responseId and a rate between 1 and 5 are required.' });
            }

            try {
                const response = await Response.findByPk(responseId, {
                    include: [{ model: Complaint, as: 'complaint', include: [{ model: ComplaintDetail, as: 'complaintDetail' }] }]
                });
                if (!response) {
                    return res.status(404).json({ message: 'Response not found.' });
                }

                // Only the citizen who owns the complaint this response belongs to may rate it.
                if (response.complaint?.complaintDetail?.userId !== userId) {
                    return res.status(403).json({ message: 'You do not have access to rate this response.' });
                }

                const [rating] = await ResponseRating.findOrCreate({
                    where: { responseId, userId },
                    defaults: { rate: rateNum }
                });
                if (rating.rate !== rateNum) {
                    await rating.update({ rate: rateNum });
                }

                // Derive the office being rated server-side — via the responding staff member's
                // office, falling back to the complaint's active office if that can't be resolved.
                const staff = await Staff.findOne({ where: { userId: response.userId } });
                let officeId = staff?.officeId;
                if (!officeId) {
                    const co = await ComplaintOffice.findOne({ where: { complaintId: response.complaintId, isActive: true } });
                    officeId = co?.officeId;
                }
                if (officeId) {
                    await Rating.create({ officeId, rating: rateNum });
                }

                const actorLabel = await resolveCitizenActorLabel(userId, response.complaint?.isAnonymous);
                await logHistory({
                    complaintId: response.complaintId,
                    actorRole: 'citizen',
                    actorLabel,
                    action: 'rated',
                    description: `${actorLabel || 'The citizen'} rated a response ${rateNum}/5.`
                });

                // Let the staff member who wrote the response know it was rated, and nudge the
                // internal desk's open Complaint Info modal to re-fetch so the new stars +
                // office satisfaction show without a manual refresh.
                await notifyUser(response.userId, `A citizen rated your response ${rateNum}/5.`);
                broadcastComplaintsChanged(io, 'rated');

                return res.status(201).json({
                    message: 'Rating successfully saved!.'
                });

            } catch (error) {
                console.error('Error rating response:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }

        },
        // Not called by either frontend today (both read responses embedded in
        // getComplaintDetail/getMyComplaints instead) but reachable directly by anyone with a
        // valid token, so it gets the same access scoping as those: citizens only their own
        // complaint, workstation only their own office's, super/admin any.
        getAllResponses: async (req, res) => {

            const { id } = req.params;
            const userId = req.userId;
            const userRole = req.role;

            try {
                if (userRole === 'citizen') {
                    const detail = await ComplaintDetail.findOne({ where: { complaintId: id } });
                    if (!detail || detail.userId !== userId) {
                        return res.status(403).json({ message: 'You do not have access to this feedback.' });
                    }
                } else if (!['super', 'admin', 'monitoring'].includes(userRole)) {
                    const staff = await Staff.findOne({ where: { userId } });
                    const assigned = staff && await ComplaintOffice.findOne({ where: { complaintId: id, officeId: staff.officeId } });
                    if (!assigned) {
                        return res.status(403).json({ message: 'You do not have access to this feedback.' });
                    }
                }

                const responses = await Response.findAll({
                    where: {
                        complaintId: id
                    },
                    include: [
                        {
                            model: Complaint,
                            as: 'complaint'
                        },
                        {
                            model: User,
                            as: 'user',
                            attributes: { exclude: ['password'] },
                            include: [
                                {
                                    model: Staff,
                                    as: 'staff',
                                    include: [
                                        {
                                            model: Office,
                                            as: 'office'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: ResponseFile,
                            as: 'responseFiles'
                        },
                        {
                            model: ResponseRating,
                            as: 'responseRatings'
                        }
                    ],
                    order: [['createdAt', 'DESC']]
                });

                res.status(200).json({ responses });

            } catch (error) {
                console.error('Error getting responses:', error);
                return res.status(500).json({ message: 'Server error.', error });
            }

        },
    };
};
