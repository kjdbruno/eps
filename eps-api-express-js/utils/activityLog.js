const { ActivityLog } = require('../models');
const { resolveActorLabel } = require('./complaintHistory');

// One line in the Report page's Activity Log tab. Best-effort, same as complaintHistory's
// logHistory: the action being logged has already succeeded by the time this runs, so a logging
// failure must never turn a successful request into a 500.
//
//   module      'discussion' | 'poll' | 'office' | 'user' | 'holiday' | 'feedback'
//   entityId    id of the row the action happened to (nullable)
//   action      short verb, e.g. 'created' | 'updated' | 'closed' | 'reopened' | 'enabled' | 'disabled' | 'reassigned'
//   actorId     req.userId of whoever performed the action
//   actorRole   req.role of whoever performed the action
//   description human-readable line, e.g. `Closed discussion "Barangay road repair"`
const logActivity = async ({ module, entityId, action, actorId, actorRole, description }) => {
    try {
        const actorLabel = await resolveActorLabel(actorId);
        await ActivityLog.create({
            module,
            entityId: entityId ?? null,
            action,
            actorId: actorId || null,
            actorRole: actorRole || null,
            actorLabel,
            description
        });
    } catch (error) {
        console.error(`Failed to log activity (${module}.${action}):`, error);
    }
};

module.exports = { logActivity };
