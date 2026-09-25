const { ComplaintHistory, User, Staff, Office } = require('../models');

// Builds a human-readable, self-contained snapshot of who acted — e.g. "Juan Dela Cruz — OCE"
// for staff, or just a name for a citizen/admin. Falls back gracefully if the user can't be
// resolved (never blocks the caller — logHistory below is best-effort by design).
const resolveActorLabel = async (userId) => {
    if (!userId) return null;
    try {
        const user = await User.findByPk(userId, {
            include: [{ model: Staff, as: 'staff', include: [{ model: Office, as: 'office' }] }]
        });
        if (!user) return null;
        const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username;
        const office = user.staff?.office?.alias || user.staff?.office?.name;
        return office ? `${name} — ${office}` : name;
    } catch (error) {
        console.error('Failed to resolve actor label:', error);
        return null;
    }
};

// Same as resolveActorLabel, but NEVER returns the citizen's real name when the complaint this
// history entry belongs to was filed anonymously. The complaint card itself already hides the
// complainant behind "Anonymous" — that has to hold for every citizen-attributed history entry
// too (filed, verified, responded, rated), not just the name shown on the card, or the activity
// trail quietly leaks exactly who the complaint said it wouldn't.
const resolveCitizenActorLabel = async (userId, isAnonymous) => {
    if (isAnonymous) return null;
    return resolveActorLabel(userId);
};

// Appends one line to a complaint's audit trail. Best-effort: the action being logged has
// already happened by the time this runs, so a logging failure must never turn a successful
// action into a 500 — matches the notifyAdmins/notifyOffices convention in ComplaintController.
const logHistory = async ({ complaintId, actorRole, actorLabel, action, description, targetUserId }) => {
    try {
        await ComplaintHistory.create({
            complaintId,
            actorRole: actorRole || null,
            actorLabel: actorLabel || null,
            action,
            description,
            targetUserId: targetUserId || null
        });
    } catch (error) {
        console.error(`Failed to log complaint history (${action}) for complaint ${complaintId}:`, error);
    }
};

module.exports = { logHistory, resolveActorLabel, resolveCitizenActorLabel };
