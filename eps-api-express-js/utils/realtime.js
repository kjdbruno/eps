// "Something changed" for the screens that are open: after a write, the API tells every connected client which
// MODULE changed (discussion, poll, feedback, office...), so the pages showing it can quietly load the new data
// instead of waiting for someone to press refresh.
//
// The message carries no data, only the module and what happened ({ module, reason }), so there is nothing private
// in it and it can go to everyone; each page then asks the API for what it is allowed to see, as it always does.
// Best-effort: it follows a write that is already saved, so it never throws.
let io = null;

const setIo = (instance) => {
    io = instance;
};

const emitChanged = (module, reason) => {
    try {
        if (io) io.emit('data:changed', { module, reason: reason || null });
    } catch (error) {
        console.error(`Failed to broadcast data:changed (${module}):`, error);
    }
};

// the feedback desk listens for its own event (see ComplaintPage.vue)
const emitComplaintsChanged = (reason) => {
    try {
        if (io) io.emit('complaints:changed', { reason: reason || null });
    } catch (error) {
        console.error('Failed to broadcast complaints:changed:', error);
    }
};

module.exports = { setIo, emitChanged, emitComplaintsChanged };
