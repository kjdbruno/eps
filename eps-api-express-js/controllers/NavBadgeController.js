const { Op } = require('sequelize');
const { NavLastSeen, KioskRating, DiscussionComment, DiscussionOffice, PollVote, PollOffice, ComplaintOffice, Staff } = require('../models');

// Sections whose badge is "new since you last opened it" — tracked via NavLastSeen.
const TIME_BASED_SECTIONS = ['feedback', 'discussion', 'poll'];
const EPOCH = new Date(0); // no NavLastSeen row yet = never visited = everything counts as new

// Left-nav badge counts for the currently logged-in staff member. Three of the four
// (feedback/discussion/poll) are "created since I last opened that section" — a real per-user
// unread count. Complaint is different on purpose: it's a live operational state (offices still
// holding an unreceived complaint right now), not a "have I looked at it" count, so it's always
// current and never clears just by visiting the page.
//
// Every count here follows the same scoping rule every other module in the app already uses:
// super/admin see the system-wide number, a workstation account only ever sees its own office's
// share of it — matching what the Feedback/Complaint/Discussion/Poll pages themselves would show
// that same user if they opened them right now.
exports.getBadges = async (req, res) => {
    const userId = req.userId;
    const role = req.role;

    try {
        const seenRows = await NavLastSeen.findAll({
            where: { userId, section: { [Op.in]: TIME_BASED_SECTIONS } },
            raw: true
        });
        const seenBySection = Object.fromEntries(seenRows.map(r => [r.section, r.lastSeenAt]));

        const isScoped = !['super', 'admin', 'monitoring'].includes(role);
        const staff = isScoped ? await Staff.findOne({ where: { userId } }) : null;
        // No Staff row for a scoped role (shouldn't normally happen) — officeId 0 matches nothing,
        // same "locked out" fallback the complaint count below already used.
        const officeId = isScoped ? (staff ? staff.officeId : 0) : null;

        const feedbackWhere = { createdAt: { [Op.gt]: seenBySection.feedback || EPOCH } };
        if (isScoped) feedbackWhere.officeId = officeId;
        const feedbackCount = await KioskRating.count({ where: feedbackWhere });

        // DiscussionComment/PollVote don't carry an officeId of their own — a discussion/poll can
        // be assigned to more than one office, so scoping goes through the *Office join table,
        // same as every Discussion/Poll endpoint already does.
        let discussionCount;
        if (isScoped) {
            const myDiscussionIds = (await DiscussionOffice.findAll({
                where: { officeId, isActive: true },
                attributes: ['discussionId'],
                raw: true
            })).map(r => r.discussionId);
            discussionCount = myDiscussionIds.length
                ? await DiscussionComment.count({
                    where: { createdAt: { [Op.gt]: seenBySection.discussion || EPOCH }, discussionId: { [Op.in]: myDiscussionIds } }
                })
                : 0;
        } else {
            discussionCount = await DiscussionComment.count({
                where: { createdAt: { [Op.gt]: seenBySection.discussion || EPOCH } }
            });
        }

        let pollCount;
        if (isScoped) {
            const myPollIds = (await PollOffice.findAll({
                where: { officeId, isActive: true },
                attributes: ['pollId'],
                raw: true
            })).map(r => r.pollId);
            pollCount = myPollIds.length
                ? await PollVote.count({
                    where: { createdAt: { [Op.gt]: seenBySection.poll || EPOCH }, pollId: { [Op.in]: myPollIds } }
                })
                : 0;
        } else {
            pollCount = await PollVote.count({
                where: { createdAt: { [Op.gt]: seenBySection.poll || EPOCH } }
            });
        }

        // Workstation only ever sees their own office's queue elsewhere in the app — the badge
        // matches that scoping. Super/admin see every office's unreceived complaints.
        const complaintWhere = { isActive: true, receivedAt: null };
        if (isScoped) complaintWhere.officeId = officeId;
        const complaintCount = await ComplaintOffice.count({ where: complaintWhere });

        return res.json({
            data: {
                feedback: feedbackCount,
                complaint: complaintCount,
                discussion: discussionCount,
                poll: pollCount
            }
        });
    } catch (error) {
        console.error('Error computing nav badges:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Called when the user opens a time-based section (feedback/discussion/poll) — resets that
// section's "last seen" clock so its badge counts only what shows up after this moment.
exports.markSeen = async (req, res) => {
    const userId = req.userId;
    const { section } = req.body;

    if (!TIME_BASED_SECTIONS.includes(section)) {
        return res.status(400).json({ message: `section must be one of: ${TIME_BASED_SECTIONS.join(', ')}.` });
    }

    try {
        await NavLastSeen.upsert({ userId, section, lastSeenAt: new Date() });
        return res.status(200).json({ message: 'Marked as seen.' });
    } catch (error) {
        console.error('Error marking nav section seen:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};
