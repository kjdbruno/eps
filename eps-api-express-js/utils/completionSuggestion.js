const { Complaint, ComplaintOffice, Office, Response, Staff } = require('../models');
const { askLLM, hasLLM } = require('./llm');

const MIN_RESPONSE_LENGTH = 20;

// Computes whether a complaint looks ready for a supervisor to finalize as "completed" via
// updateStatus, and — if so — an AI-drafted closing summary to pre-fill the remarks field with.
// This NEVER touches Complaint/ComplaintOffice status itself; it's purely advisory, read by
// ComplaintController.getCompletionSuggestion and shown as a dismissible banner on the frontend's
// status tab. The supervisor's own click on "submit" (requestStatusChange -> updateStatus) is the
// ONLY thing that ever actually finalizes the whole complaint — marking one office 'completed'
// (the response composer's "done" pill, see ResponseController.complete) only ever finalizes that
// office's own share, never cascades to the complaint automatically, no matter how many/which
// offices have done so. This function's whole job is to help the supervisor make that manual call
// faster, not to make it for them.
//
// Two layers:
//   1. Structural floor — mirrors (and is strictly narrower than) updateStatus's own "notReceived"
//      guard, so nothing is ever suggested that the backend would reject. Every active
//      ComplaintOffice must be at least 'received' (not 'pending'), AND each one must have engaged:
//      either 'completed' (clicked its own done pill) or has posted a substantive Response.
//   2. Response-based AI judgement — once the floor is cleared, the LLM reads the complaint and the
//      full response thread (grouped by office) and decides whether the matter is actually
//      resolved. A "done" mark is treated as a weak signal; the substance of the responses is what
//      counts, so the AI can hold back a complaint whose offices ALL marked done when the thread
//      doesn't show a real resolution (returns eligible:false, aiJudged:true). When it says ready
//      it also hands back the closing summary to pre-fill. If no LLM is configured, or the call
//      fails, the structural floor alone decides eligibility (llmUnavailable:true) — a judgement
//      failure never blocks a supervisor who wants to finalize.
const getCompletionSuggestion = async (complaintId) => {
    const complaint = await Complaint.findByPk(complaintId);
    if (!complaint) {
        return { eligible: false, reason: 'Complaint not found.' };
    }

    if (['completed', 'cancelled'].includes(complaint.status)) {
        return { eligible: false, reason: 'This complaint is already finalized.' };
    }

    const activeOffices = await ComplaintOffice.findAll({
        where: { complaintId, isActive: true },
        include: [{ model: Office, as: 'office', attributes: ['id', 'name', 'alias'] }]
    });

    if (!activeOffices.length) {
        return { eligible: false, reason: 'Not yet assigned to any office.' };
    }

    const notReceived = activeOffices.filter(o => o.status === 'pending');
    if (notReceived.length) {
        return {
            eligible: false,
            reason: `${notReceived.length} assigned office(s) haven't acknowledged/received the complaint yet: ` +
                notReceived.map(o => o.office?.alias || o.office?.name).join(', ') + '.'
        };
    }

    const responses = await Response.findAll({ where: { complaintId }, raw: true });

    // A response is attributed to an office via the responding user's Staff row, not a direct FK —
    // same lookup ResponseController.getStaffComplaintOffice does, just batched here across every
    // response at once rather than one office at a time.
    const staffRows = await Staff.findAll({ attributes: ['userId', 'officeId'], raw: true });
    const officeByUserId = Object.fromEntries(staffRows.map(s => [s.userId, s.officeId]));

    const notYetReady = activeOffices.filter(office => {
        if (office.status === 'completed') return false; // explicit done pill — always ready
        const hasSubstantiveResponse = responses.some(r =>
            officeByUserId[r.userId] === office.officeId && (r.content || '').trim().length >= MIN_RESPONSE_LENGTH
        );
        return !hasSubstantiveResponse;
    });

    if (notYetReady.length) {
        return {
            eligible: false,
            reason: `Still waiting on a substantive response (or a "done" mark) from: ` +
                notYetReady.map(o => o.office?.alias || o.office?.name).join(', ') + '.'
        };
    }

    // Structural floor cleared. `everyOfficeDone` is no longer the whole answer — it just tags the
    // fallback basis and lets the frontend say "offices all marked done, but the AI isn't convinced".
    const everyOfficeDone = activeOffices.every(o => o.status === 'completed');

    // Reuse a cached verdict/draft if one was already generated for this complaint (avoids
    // re-calling the LLM on every dialog open) — invalidated by ComplaintController.reopen, which
    // clears both columns, so a complaint that gets sent back for more work is re-assessed fresh
    // next time it's actually ready again. Only a "ready" verdict is ever cached (see below).
    if (complaint.suggestedRemarks) {
        return { eligible: true, reason: null, draftRemarks: complaint.suggestedRemarks, llmUnavailable: false, basis: 'ai-reviewed' };
    }

    if (!hasLLM()) {
        return { eligible: true, reason: null, draftRemarks: null, llmUnavailable: true, basis: everyOfficeDone ? 'done-marks' : 'responses' };
    }

    try {
        const officeSummaries = activeOffices.map(office => {
            const officeResponses = responses
                .filter(r => officeByUserId[r.userId] === office.officeId && (r.content || '').trim())
                .map(r => r.content.trim());
            const label = office.office?.name || office.office?.alias || `Office ${office.officeId}`;
            const doneMark = office.status === 'completed' ? ' [marked its part done]' : '';
            return `${label}${doneMark}: ${officeResponses.join(' | ') || '(no written response on record)'}`;
        }).join('\n');

        // Posts from accounts not tied to one handling office — super/admin supervisors, or the
        // citizen's own follow-ups — context the per-office lines above don't carry.
        const generalResponses = responses
            .filter(r => !officeByUserId[r.userId] && (r.content || '').trim())
            .map(r => r.content.trim());
        const generalBlock = generalResponses.length
            ? `\n\nGeneral / follow-up posts:\n${generalResponses.join(' | ')}`
            : '';

        const verdict = await askLLM({
            system: 'You review a citizen complaint and the responses its handling offices have posted, for ' +
                'a local government complaint tracking system, and decide whether the complaint has actually ' +
                'been resolved and is ready for a supervisor to close. Judge STRICTLY from the complaint text ' +
                'and the office responses given — an office marking its part "done" is a weak signal, the ' +
                'substance of the responses is what matters. Reply with a JSON object: ' +
                '{"ready": boolean, "reason": string, "summary": string}. "reason": one sentence — when not ' +
                'ready, state what is still missing or unresolved; when ready, one line on how it was ' +
                'resolved. "summary": a concise professional 2-4 sentence closing resolution summary (only ' +
                'meaningful when ready; may be empty otherwise). Never invent facts, dates, names, or ' +
                'details not present in the input.',
            prompt: `Original complaint:\n${complaint.content}\n\nOffice response(s):\n${officeSummaries}${generalBlock}`,
            maxTokens: 400,
            json: true
        });

        let parsed;
        try { parsed = JSON.parse(verdict); } catch { parsed = null; }

        if (parsed && typeof parsed.ready === 'boolean') {
            if (parsed.ready) {
                const summary = (parsed.summary || '').trim() || null;
                if (summary) {
                    await complaint.update({ suggestedRemarks: summary, suggestedRemarksAt: new Date() });
                }
                return { eligible: true, reason: null, draftRemarks: summary, llmUnavailable: !summary, basis: 'ai-reviewed' };
            }
            return {
                eligible: false,
                reason: (parsed.reason || '').trim() || "The responses on file don't yet show this complaint was resolved.",
                draftRemarks: null,
                aiJudged: true,
                officeMarksReady: everyOfficeDone
            };
        }

        // Unparseable verdict — fall back to the structural floor, don't block the supervisor.
        return { eligible: true, reason: null, draftRemarks: null, llmUnavailable: true, basis: everyOfficeDone ? 'done-marks' : 'responses' };
    } catch (error) {
        // Best-effort, same convention as matchOfficesToContent — a judgement failure should never
        // block the supervisor from finalizing, just leave them without an AI opinion or draft.
        console.error(`Failed to assess completion readiness for complaint ${complaintId}:`, error.message);
        return { eligible: true, reason: null, draftRemarks: null, llmUnavailable: true, basis: everyOfficeDone ? 'done-marks' : 'responses' };
    }
};

module.exports = { getCompletionSuggestion };
