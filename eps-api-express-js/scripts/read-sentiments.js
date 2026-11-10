// Has the AI model read the feedback and CSM reports that have no impression yet (positive / neutral / negative).
//   node scripts/read-sentiments.js                  both, all of them
//   node scripts/read-sentiments.js feedback 20      only feedback, the newest 20
//   node scripts/read-sentiments.js csm
require('dotenv').config();
const { backfillSentiments } = require('../utils/sentiment');
const { hasLLM } = require('../utils/llm');

const kind = ['feedback', 'csm'].includes(process.argv[2]) ? process.argv[2] : 'all';
const limit = parseInt(process.argv[3], 10) || 1000;

(async () => {
    if (!hasLLM()) {
        console.error('No AI provider is configured (see utils/llm.js), so nothing can be read.');
        process.exit(1);
    }
    const out = await backfillSentiments({
        kind, limit,
        onProgress: (key, r) => process.stdout.write(`\r${key}: ${r.read} read, ${r.failed} could not be read   `),
    });
    console.log(`\nDone. Feedback: ${out.feedback.read} read, ${out.feedback.failed} not. CSM reports: ${out.csm.read} read, ${out.csm.failed} not.`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
