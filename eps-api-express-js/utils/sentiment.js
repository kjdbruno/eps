const { Complaint, KioskRating, Office } = require('../models');
const { askLLM, hasLLM } = require('./llm');
const { emitChanged, emitComplaintsChanged } = require('./realtime');

// The impression of a feedback or a CSM report: positive, neutral or negative, read by an AI model when it is filed so the
// desk can tell them apart at a glance (a badge on the lists, the details and every overview).
//
//   feedback    judged from what the citizen wrote
//   CSM report  judged from the comments and the satisfaction score of the answers (the comment wins when it clearly says
//               something else than the score). With no AI model, or when it fails, a report falls back to its score alone:
//               85% and up positive, under 70 negative, in between neutral. A feedback has no such fallback: it stays unread
//               (null) until it is read, see backfillSentiments.

const SQD_KEYS = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
const VALID = ['positive', 'neutral', 'negative'];

const SYSTEM = 'You read what a citizen of a Philippine city wrote to the city government and say how it reads. The text may be in ' +
    'English, Filipino/Tagalog, Ilocano, or a mix. Answer with ONLY a JSON object, no markdown, in exactly this shape: ' +
    '{"sentiment": "positive" | "neutral" | "negative", "reason": "<one short sentence, in English, on what made you say so>"}. ' +
    '"positive" means praise, thanks, satisfaction or a good experience. "negative" means a complaint, a problem, a grievance, ' +
    'frustration or dissatisfaction. "neutral" means a plain question, request, report of facts or suggestion with no clear ' +
    'feeling either way. Judge the feeling of the citizen, not how serious the matter is.';

const parse = (raw) => {
    if (!raw) return null;
    try {
        const out = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
        const sentiment = String(out?.sentiment || '').toLowerCase();
        if (!VALID.includes(sentiment)) return null;
        return { sentiment, reason: typeof out.reason === 'string' ? out.reason.slice(0, 280) : null };
    } catch {
        return null;
    }
};

const fromScore = (pct) => (pct >= 85 ? 'positive' : pct < 70 ? 'negative' : 'neutral');
const scoreOf = (k) => (SQD_KEYS.reduce((s, key) => s + (Number(k[key]) || 0), 0) / SQD_KEYS.length) / 5 * 100;

// the text of a feedback -> { sentiment, reason } (null when nothing could read it)
const readFeedback = async (content) => {
    if (!hasLLM() || !String(content || '').trim()) return null;
    const raw = await askLLM({ system: SYSTEM, prompt: `Feedback:\n"""${String(content).slice(0, 4000)}"""`, maxTokens: 400, json: true });
    return parse(raw);
};

// a CSM report -> { sentiment, reason }
const readReport = async (k) => {
    const pct = Math.round(scoreOf(k) * 10) / 10;
    const comment = [k.suggestion, k.serviceAvailed && `Service availed: ${k.serviceAvailed}`].filter(Boolean).join('\n');
    if (hasLLM()) {
        try {
            const raw = await askLLM({
                system: `${SYSTEM} This is a customer satisfaction survey: the score is the average of nine service-quality answers ` +
                    '(100% is the best). Use the score and the comments together; the comments win when they clearly say something ' +
                    'different from the score.',
                prompt: `Satisfaction score: ${pct}%\n${comment ? `Comments:\n"""${comment.slice(0, 3000)}"""` : 'No comments were written.'}`,
                maxTokens: 400,
                json: true,
            });
            const out = parse(raw);
            if (out) return out;
        } catch (error) {
            console.error('CSM sentiment reading failed, using the score:', error.message);
        }
    }
    return { sentiment: fromScore(pct), reason: `From the satisfaction score (${pct}%).` };
};

// Reads one feedback and saves it. Best-effort: filing never waits on it and never fails because of it.
const tagComplaint = async (complaintId) => {
    try {
        const complaint = await Complaint.findByPk(complaintId, { attributes: ['id', 'content'] });
        if (!complaint) return null;
        const out = await readFeedback(complaint.content);
        if (!out) return null;
        await Complaint.update({ sentiment: out.sentiment, sentimentReason: out.reason, sentimentAt: new Date() }, { where: { id: complaintId } });
        emitComplaintsChanged('sentiment');
        return out;
    } catch (error) {
        console.error(`Reading the sentiment of feedback ${complaintId} failed:`, error.message);
        return null;
    }
};

const tagReport = async (reportId) => {
    try {
        const report = await KioskRating.findByPk(reportId);
        if (!report) return null;
        const out = await readReport(report);
        await KioskRating.update({ sentiment: out.sentiment, sentimentReason: out.reason, sentimentAt: new Date() }, { where: { id: reportId } });
        emitChanged('feedback', 'sentiment');
        return out;
    } catch (error) {
        console.error(`Reading the sentiment of CSM report ${reportId} failed:`, error.message);
        return null;
    }
};

// Reads the ones nobody has read yet (older ones, or those the AI could not read when they were filed).
//   kind   'feedback' | 'csm' | 'all'
//   limit  at most this many (per kind)
//   pause  ms between two, to stay inside the provider's rate limits
const backfillSentiments = async ({ kind = 'all', limit = 1000, pause = 250, onProgress } = {}) => {
    const result = { feedback: { read: 0, failed: 0 }, csm: { read: 0, failed: 0 } };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const run = async (key, Model, tag) => {
        const rows = await Model.findAll({ where: { sentiment: null }, attributes: ['id'], order: [['id', 'DESC']], limit, raw: true });
        for (const row of rows) {
            const out = await tag(row.id);
            if (out) result[key].read++; else result[key].failed++;
            if (onProgress) onProgress(key, result[key]);
            await sleep(pause);
        }
    };
    if (kind === 'feedback' || kind === 'all') await run('feedback', Complaint, tagComplaint);
    if (kind === 'csm' || kind === 'all') await run('csm', KioskRating, tagReport);
    return result;
};

module.exports = { tagComplaint, tagReport, backfillSentiments, readFeedback, fromScore };
