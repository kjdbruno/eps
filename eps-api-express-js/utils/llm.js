// Shared LLM plumbing — used by ComplaintController (auto-classification / office matching),
// DiscussionController (auto-assigning a discussion to the responsible office), and
// ReportController ("Analyze Data" recommendations).
//
// PROVIDER FALLBACK CHAIN — tried strictly in this order, each skipped when its API key is not
// set, and the next one tried on ANY failure: missing credit, rate limit / quota, model retired,
// network error, malformed or empty response, OR the provider being too slow (each call is given
// LLM_TIMEOUT_MS, default 40s, then aborted and the next provider tried). The first provider to
// return a usable answer wins; only if every configured provider fails does askLLM throw.
//
//   1. OpenAI      OPENAI_API_KEY      — the paid primary (gpt-4o-mini by default). Vision-capable.
//   2. Anthropic   ANTHROPIC_API_KEY   — paid 2nd choice (claude-haiku-4-5). Vision-capable.
//   3. Google Gemini  GEMINI_API_KEY   — FREE tier, no card. https://aistudio.google.com/apikey
//                                        (gemini-flash-latest). Vision-capable, generous limits.
//   4. Groq        GROQ_API_KEY        — FREE tier, no card. https://console.groq.com/keys
//                                        (openai/gpt-oss-120b). Text only, very fast.
//   5. OpenRouter  OPENROUTER_API_KEY  — FREE models, no card. https://openrouter.ai/keys
//                                        (llama-3.3-70b-instruct:free). Text only.
//   6. Cerebras    CEREBRAS_API_KEY    — FREE tier, no card. https://cloud.cerebras.ai
//                                        (llama-3.3-70b). Text only, fastest inference.
//
// Every model name can be overridden with <PROVIDER>_MODEL (e.g. OPENAI_MODEL=gpt-4o). Providers
// 2-6 all speak the OpenAI /chat/completions shape, so they share one call function.
//
// Other free options not wired here but easy to add the same way: Mistral (MISTRAL_API_KEY,
// api.mistral.ai/v1), GitHub Models (api.github.com token, models.inference.ai.azure.com),
// Hugging Face Inference (router.huggingface.co/v1). Cohere has a rate-limited free trial tier
// but a non-OpenAI response shape.
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// How long any single provider gets before it's considered "too slow" — the request is aborted
// and askLLM falls through to the next provider. Generous by default so a legitimate long
// generation (the 8000-token "Analyze Data" prescriptions) isn't cut off; override with
// LLM_TIMEOUT_MS if a provider tends to hang.
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 40000;

// ---- Anthropic (native SDK — its message shape differs from everyone else's) ----
const askAnthropic = async ({ system, prompt, maxTokens, images, json }) => {
    const content = images.length
        ? [
            ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })),
            { type: 'text', text: prompt },
        ]
        : prompt;
    const messages = [{ role: 'user', content }];
    // Prefill the assistant turn with "{" so the model must continue a JSON object; glue it back
    // on before returning.
    if (json) messages.push({ role: 'assistant', content: '{' });
    const message = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system,
        messages,
    }, { timeout: LLM_TIMEOUT_MS });
    const text = message.content?.[0]?.text?.trim();
    return json && text != null ? `{${text}` : text;
};

// ---- Any OpenAI-compatible /chat/completions endpoint (OpenAI, Gemini, Groq, OpenRouter, Cerebras) ----
const askOpenAICompatible = async ({ baseURL, apiKey, model, vision, extraHeaders = {} }, { system, prompt, maxTokens, images, json }) => {
    const userContent = vision && images.length
        ? [
            ...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mediaType};base64,${img.data}` } })),
            { type: 'text', text: prompt },
        ]
        : prompt;
    // Abort the request if the provider takes longer than LLM_TIMEOUT_MS so the chain can move on.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                ...(json ? { response_format: { type: 'json_object' } } : {}),
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userContent },
                ],
            }),
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`${model} timed out after ${LLM_TIMEOUT_MS / 1000}s`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        throw new Error(`${model} request failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim();
};

// The chain. `enabled` decides whether this link is even attempted; `call(args)` runs it.
const PROVIDERS = [
    {
        name: 'openai',
        enabled: () => !!process.env.OPENAI_API_KEY,
        call: (args) => askOpenAICompatible({
            baseURL: 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            vision: true,
        }, args),
    },
    {
        name: 'anthropic',
        enabled: () => !!anthropic,
        call: (args) => askAnthropic(args),
    },
    {
        name: 'gemini',
        enabled: () => !!process.env.GEMINI_API_KEY,
        call: (args) => askOpenAICompatible({
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
            vision: true,
        }, args),
    },
    {
        name: 'groq',
        enabled: () => !!process.env.GROQ_API_KEY,
        call: (args) => askOpenAICompatible({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY,
            // gpt-oss is a reasoning model — it needs headroom above the visible answer for its
            // hidden reasoning, so callers pass a comfortable maxTokens. On an unrealistically
            // tight budget it can return empty content, which just moves the chain to the next
            // provider (see askLLM).
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
            vision: false,
        }, args),
    },
    {
        name: 'openrouter',
        enabled: () => !!process.env.OPENROUTER_API_KEY,
        call: (args) => askOpenAICompatible({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            vision: false,
            extraHeaders: { 'X-Title': 'CSFLU Community Engagement Platform' },
        }, args),
    },
    {
        name: 'cerebras',
        enabled: () => !!process.env.CEREBRAS_API_KEY,
        call: (args) => askOpenAICompatible({
            baseURL: 'https://api.cerebras.ai/v1',
            apiKey: process.env.CEREBRAS_API_KEY,
            model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
            vision: false,
        }, args),
    },
];

// `images`: optional array of { mediaType, data (base64) } — vision input. Kept for the
// vision-capable providers (Anthropic, OpenAI, Gemini), silently dropped for the text-only
// fallbacks so the call still runs, just without the photos.
// `json: true` asks for a strictly-valid JSON body (response_format for the OpenAI-compatible
// providers, an assistant prefill for Anthropic) — use it whenever the result gets JSON.parse'd.
const askLLM = async ({ system, prompt, maxTokens, images = [], json = false }) => {
    const active = PROVIDERS.filter(p => p.enabled());
    if (!active.length) return null; // nothing configured — callers treat this as "skip the AI step"

    let lastError;
    for (const provider of active) {
        try {
            const out = await provider.call({ system, prompt, maxTokens, images, json });
            if (out != null && out !== '') return out;
            lastError = new Error(`${provider.name} returned an empty response`);
        } catch (error) {
            lastError = error;
            console.warn(`LLM provider "${provider.name}" failed, trying next:`, error.message);
        }
    }
    // Every configured provider failed — surface it (callers that must not break wrap this).
    throw lastError || new Error('All configured LLM providers failed.');
};

// True whenever SOME provider has a key — callers use this to short-circuit before doing any DB
// work for a call that couldn't run anyway.
const hasLLM = () => PROVIDERS.some(p => p.enabled());

module.exports = { askLLM, hasLLM };
