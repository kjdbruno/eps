<template>
    <div class="pv tone-survey">
        <q-btn
            v-if="!hideBack" flat dense no-caps size="sm" color="primary" icon="bi-arrow-left" label="all surveys"
            :to="`${basePath}/poll`" class="q-mb-md"
        />

        <div v-if="poll">
            <!-- what the survey is -->
            <div class="pv-hero">
                <div class="pv-hero-top">
                    <span class="pv-eyebrow">public survey</span>
                    <span class="pt-pill" :class="statusClass(poll)">{{ statusLabel(poll) }}</span>
                </div>
                <div class="pv-q">{{ poll.question }}</div>
                <div v-if="poll.description" class="pv-desc">{{ poll.description }}</div>
                <div class="pv-meta">
                    <span v-for="o in poll.offices" :key="o.id" class="pv-office"><q-icon name="bi-building" size="12px" />{{ o.alias || o.name }}</span>
                    <span v-if="poll.expiresAt"><q-icon name="bi-hourglass-split" size="13px" /> {{ poll.isExpired ? 'ended' : 'closes' }} {{ formatDate(poll.expiresAt) }}</span>
                </div>
                <div class="pv-stats">
                    <div><b>{{ poll.totalVotes }}</b><small>response{{ poll.totalVotes === 1 ? '' : 's' }}</small></div>
                    <div><b>{{ poll.questions.length }}</b><small>question{{ poll.questions.length === 1 ? '' : 's' }}</small></div>
                    <div><b>{{ poll.hasVoted ? 'Yes' : 'Not yet' }}</b><small>you answered</small></div>
                </div>
            </div>

            <!-- a guest can read the questions, but only a signed-in resident can answer -->
            <template v-if="!poll.hasVoted && canVote && !authStore.isAuthenticated">
                <div class="pv-section">the questions</div>
                <div v-for="(q, qi) in poll.questions" :key="q.id" class="pv-q-card pv-q-card--ro">
                    <div class="pv-q-head"><span class="pv-q-n">{{ qi + 1 }}</span><span class="pv-q-t">{{ q.prompt }}<span v-if="q.required" class="pv-req">*</span></span></div>
                    <div class="pv-q-kind"><q-icon :name="kindIcon(q.type)" size="14px" /> {{ kindLabel(q.type) }}</div>
                    <div v-if="q.options.length" class="pv-opts">
                        <div v-for="o in q.options" :key="o.id" class="pv-opt pv-opt--ro"><span class="pv-dot" :class="{ 'pv-dot--sq': q.type === 'checkbox' }" />{{ o.label }}</div>
                    </div>
                </div>
                <div class="pt-gate">
                    <span class="pt-gate-ico"><q-icon name="bi-person-lock" /></span>
                    <div class="pt-gate-t">Sign in to answer this survey</div>
                    <div class="pt-gate-s">Anyone can read the questions. Answering is for signed-in residents, one response each, and the results appear once you have answered.</div>
                    <div class="row justify-center q-gutter-sm q-mt-sm">
                        <q-btn unelevated rounded no-caps color="primary" label="Sign in" to="/login" />
                        <q-btn outline rounded no-caps color="primary" label="Create an account" to="/register" />
                    </div>
                </div>
            </template>

            <!-- not yet answered, still genuinely open (status AND not expired): the form -->
            <template v-else-if="!poll.hasVoted && canVote">
                <div class="pv-section">your answers</div>
                <div v-for="(q, qi) in poll.questions" :key="q.id" :id="'pq-' + q.id" class="pv-q-card" :class="{ 'pv-q-card--bad': errors[q.id] }">
                    <div class="pv-q-head"><span class="pv-q-n">{{ qi + 1 }}</span><span class="pv-q-t">{{ q.prompt }}<span v-if="q.required" class="pv-req">*</span></span></div>

                    <q-input
                        v-if="q.type === 'short'" v-model="answers[q.id]" outlined dense maxlength="500" placeholder="Your answer"
                        class="pv-input" @update:model-value="errors[q.id] = ''"
                    />
                    <q-input
                        v-else-if="q.type === 'paragraph'" v-model="answers[q.id]" outlined type="textarea" autogrow maxlength="2000" placeholder="Your answer"
                        class="pv-input" input-style="min-height: 96px" @update:model-value="errors[q.id] = ''"
                    />
                    <div v-else class="pv-opts">
                        <button
                            v-for="o in q.options" :key="o.id" type="button" class="pv-opt"
                            :class="{ 'pv-opt--on': isPicked(q, o.id) }" @click="pick(q, o.id)"
                        >
                            <span class="pv-dot" :class="{ 'pv-dot--sq': q.type === 'checkbox' }"><i /></span>
                            <span class="pv-opt-l">{{ o.label }}</span>
                            <q-icon v-if="isPicked(q, o.id)" name="bi-check-circle-fill" size="18px" />
                        </button>
                        <div v-if="q.type === 'checkbox'" class="pv-hint">Choose all that apply.</div>
                    </div>
                    <div v-if="errors[q.id]" class="pv-err"><q-icon name="bi-exclamation-circle" size="14px" /> {{ errors[q.id] }}</div>
                </div>

                <div class="text-negative text-caption q-mb-sm" v-if="error">{{ error }}</div>
                <q-btn unelevated rounded no-caps color="primary" size="lg" icon-right="bi-send" label="Submit my answers" class="full-width pv-submit" :loading="voting" @click="submit" />
                <div class="pv-note"><q-icon name="bi-info-circle" size="14px" /> One response per person. Questions marked * are required. Results appear once you have answered.</div>
            </template>

            <!-- already answered, or closed/expired: the results -->
            <template v-else>
                <div class="pv-section">results</div>
                <div v-for="(q, qi) in poll.questions" :key="q.id" class="pv-q-card">
                    <div class="pv-q-head"><span class="pv-q-n">{{ qi + 1 }}</span><span class="pv-q-t">{{ q.prompt }}</span></div>
                    <div class="pv-q-kind"><q-icon :name="kindIcon(q.type)" size="14px" /> {{ kindLabel(q.type) }} &middot; {{ q.answered }} answered</div>

                    <div v-if="q.options.length" class="pv-results">
                        <div v-for="o in ranked(q)" :key="o.id" class="pv-res" :class="{ 'pv-res--lead': o.lead, 'pv-res--mine': (q.myOptionIds || []).includes(o.id) }">
                            <div class="pv-res-top">
                                <span class="pv-res-l">
                                    {{ o.label }}
                                    <span v-if="(q.myOptionIds || []).includes(o.id)" class="pv-mine"><q-icon name="bi-check-circle-fill" size="12px" /> your answer</span>
                                </span>
                                <span class="pv-res-p">{{ o.percent || 0 }}%</span>
                            </div>
                            <div class="pv-track"><span :style="{ width: (o.percent || 0) + '%' }" /></div>
                            <div class="pv-res-v">{{ o.votes }} {{ o.votes === 1 ? 'person' : 'people' }}</div>
                        </div>
                    </div>
                    <div v-else class="pv-mytext">
                        <template v-if="q.myText"><small>your answer</small><div>{{ q.myText }}</div></template>
                        <small v-else>You did not answer this one. What people write here is read by the office, not shown publicly.</small>
                    </div>
                </div>
                <div class="pv-note" v-if="poll.hasVoted"><q-icon name="bi-heart-fill" size="14px" /> Thank you for answering!</div>
                <div class="pv-note" v-else-if="!canVote"><q-icon name="bi-lock-fill" size="14px" /> This survey is closed to new responses.</div>
            </template>
        </div>

        <div class="text-center q-pa-lg" v-else-if="loading">
            <q-spinner-oval size="lg" color="primary" />
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { getGuestToken } from 'src/utils/guestToken';
import moment from 'moment';
import { useAuthStore } from 'src/stores/auth-store';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';

// id/hideBack let this same component serve two contexts: standalone on its own route (default —
// id falls back to route.params.id, back button shown) and embedded as modal content from
// PollList.vue (id passed explicitly, hideBack set — there's no "back", just closing the dialog).
const props = defineProps({
    id: { type: [String, Number], default: null },
    hideBack: { type: Boolean, default: false },
});

const route = useRoute();
const authStore = useAuthStore();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));
const pollId = computed(() => props.id ?? route.params.id);

const loading = ref(false);
const poll = ref(null);
const voting = ref(false);
const error = ref('');

// The answers being typed or picked, by question id: text for a short answer / paragraph, one option id for multiple
// choice, a list of option ids for checkboxes.
const answers = reactive({});
const errors = reactive({});

const KINDS = {
    short: { label: 'Short answer', icon: 'bi-input-cursor-text' },
    paragraph: { label: 'Paragraph', icon: 'bi-text-paragraph' },
    radio: { label: 'Multiple choice', icon: 'bi-record-circle' },
    checkbox: { label: 'Checkboxes', icon: 'bi-check2-square' },
};
const kindLabel = (t) => KINDS[t]?.label || t;
const kindIcon = (t) => KINDS[t]?.icon || 'bi-question-circle';

const isPicked = (q, optionId) => (q.type === 'checkbox' ? (answers[q.id] || []).includes(optionId) : answers[q.id] === optionId);
const pick = (q, optionId) => {
    errors[q.id] = '';
    if (q.type === 'checkbox') {
        const list = answers[q.id] || [];
        answers[q.id] = list.includes(optionId) ? list.filter(x => x !== optionId) : [...list, optionId];
    } else {
        answers[q.id] = optionId;
    }
};

// the choices from the most to the least chosen; the top one (when anyone chose) leads
const ranked = (q) => {
    const list = [...(q.options || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return list.map((o, i) => ({ ...o, lead: i === 0 && (o.votes || 0) > 0 }));
};

// A survey can be "open" in status but past its own expiresAt — the backend rejects an answer
// either way (see PollController.vote), so the form has to check both, not just status.
const canVote = computed(() => poll.value?.status === 'open' && !poll.value?.isExpired);
const statusLabel = (p) => (p.status === 'open' && p.isExpired) ? 'expired' : p.status;
const statusClass = (x) => ((x.status === 'open' && x.isExpired) ? 'pt-st-expired' : `pt-st-${x.status}`);

const formatDate = (timestamp) => moment(timestamp).fromNow();

const resetForm = () => {
    Object.keys(answers).forEach(k => delete answers[k]);
    Object.keys(errors).forEach(k => delete errors[k]);
    (poll.value?.questions || []).forEach(q => {
        answers[q.id] = q.type === 'checkbox' ? [] : (q.type === 'radio' ? null : '');
    });
};

// `quiet`: load it again without blanking the page first (after a refused answer, to show how it stands)
const loadPoll = async ({ quiet = false } = {}) => {
    if (!pollId.value) return;
    loading.value = true;
    if (!quiet) poll.value = null;
    try {
        const response = await api.get(`/poll/${pollId.value}`, { params: { guestToken: getGuestToken() } });
        poll.value = response.data.data;
        if (!quiet) resetForm();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

// what is missing: marks each required question that has no answer, and says which was first
const check = () => {
    let first = null;
    (poll.value?.questions || []).forEach(q => {
        const a = answers[q.id];
        const empty = q.type === 'checkbox' ? !(a || []).length : (q.type === 'radio' ? !a : !String(a || '').trim());
        errors[q.id] = q.required && empty ? 'Please answer this question.' : '';
        if (errors[q.id] && first === null) first = q.id;
    });
    return first;
};

const submit = async () => {
    error.value = '';
    if (!authStore.isAuthenticated) {
        error.value = 'Please sign in to answer this survey.';
        return;
    }
    const firstBad = check();
    if (firstBad !== null) {
        document.getElementById('pq-' + firstBad)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    voting.value = true;
    try {
        const payload = poll.value.questions.map(q => {
            const a = answers[q.id];
            if (q.type === 'checkbox') return { questionId: q.id, optionIds: a || [] };
            if (q.type === 'radio') return { questionId: q.id, optionIds: a ? [a] : [] };
            return { questionId: q.id, text: String(a || '').trim() };
        });
        const response = await api.post(`/poll/${pollId.value}/vote`, { answers: payload });
        poll.value = response.data.data;
    } catch (e) {
        error.value = e.response?.data?.message || 'Unable to record your answers.';
        // already answered (409) or closed meanwhile (400): load it again so it shows the results
        if ([409].includes(e.response?.status)) loadPoll({ quiet: true });
    } finally {
        voting.value = false;
    }
};

// the results move as other people answer, and the survey closes when it is closed: your answers so far stay as they are
useLiveRefresh(['poll'], () => loadPoll({ quiet: true }));

// One reactive source drives loading, whether the id comes from the route (standalone page) or
// changes because PollList.vue reused this same component instance across clicks on different
// rows (modal mode). immediate: true covers the initial mount, so a separate onMounted isn't
// needed. The form resets on every load, or a half-filled form from the previous survey would carry over.
watch(pollId, (newId) => {
    if (!newId) return;
    error.value = '';
    loadPoll();
}, { immediate: true });
</script>

<style scoped>
.pv-hero { padding: 20px 22px; border-radius: 18px; color: var(--tone-on); background: linear-gradient(135deg, var(--tone) 0%, var(--tone-2) 100%); position: relative; overflow: hidden; margin-bottom: 18px; }
.pv-hero::after { content: ''; position: absolute; right: -50px; top: -60px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255, 255, 255, .07); }
.pv-hero > * { position: relative; z-index: 1; }
.pv-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pv-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--tone-eyebrow); }
.pv-q { font-size: 23px; font-weight: 800; line-height: 1.25; margin: 8px 0 8px; }
.pv-desc { margin-bottom: 12px; font-size: 14px; line-height: 1.5; opacity: .92; white-space: pre-wrap; }
.pv-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; opacity: .92; }
.pv-meta > span { display: inline-flex; align-items: center; gap: 6px; }
.pv-office { padding: 2px 10px; border-radius: 99px; background: rgba(255, 255, 255, .16); font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
.pv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
.pv-stats > div { padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, .12); }
.pv-stats b { display: block; font-size: 18px; line-height: 1.1; }
.pv-stats small { display: block; margin-top: 2px; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; opacity: .8; }

.pv-section { display: flex; align-items: center; gap: 10px; margin: 4px 2px 12px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #4C5C79; }
.pv-section::after { content: ''; flex: 1; height: 1px; background: #DCE4F0; }

/* one question: a card with its number, the question and how it is answered */
.pv-q-card { margin-bottom: 14px; padding: 18px 20px; border: 1px solid #E6ECF5; border-left: 4px solid var(--tone); border-radius: 16px; background: #fff; }
.pv-q-card--bad { border-color: #F3CFD2; border-left-color: #C0392B; background: #FFFDFD; }
.pv-q-card--ro { background: #F9FBFE; }
.pv-q-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.pv-q-n { flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--tone-soft); color: var(--tone-ink); font-weight: 800; font-size: 13px; }
.pv-q-t { font-size: 15.5px; font-weight: 700; line-height: 1.35; color: #1E2A44; }
.pv-req { margin-left: 4px; color: #C0392B; }
.pv-q-kind { display: flex; align-items: center; gap: 6px; margin: -4px 0 12px 40px; font-size: 12px; color: #8493AC; }
.pv-input { margin-left: 40px; }
.pv-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0 40px; font-size: 12.5px; color: #C0392B; }
.pv-hint { margin: 2px 2px 0; font-size: 12px; color: #8493AC; }
.pv-q-card .pv-opts { margin-left: 40px; margin-bottom: 0; }

/* the choices: each one a tile you tap */
.pv-opts { display: grid; gap: 10px; margin-bottom: 16px; }
.pv-opt { display: flex; align-items: center; gap: 14px; width: 100%; padding: 13px 16px; border: 1.5px solid #DCE4F0; border-radius: 14px; background: #fff; color: #1E2A44; font: inherit; font-size: 14.5px; font-weight: 600; text-align: left; cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s, transform .15s; }
.pv-opt:hover { border-color: var(--tone); transform: translateY(-1px); }
.pv-opt--on { border-color: var(--tone); background: var(--tone-soft); box-shadow: 0 0 0 1px var(--tone) inset; }
.pv-opt--on .q-icon { color: var(--tone); }
.pv-opt-l { flex: 1; min-width: 0; }
.pv-opt--ro { cursor: default; color: #4C5C79; background: #F6F9FC; font-weight: 500; }
.pv-opt--ro:hover { transform: none; border-color: #DCE4F0; }
.pv-dot { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #B8C4D9; display: inline-flex; align-items: center; justify-content: center; }
.pv-dot--sq { border-radius: 6px; }
.pv-dot i { width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: background .15s; }
.pv-dot--sq i { border-radius: 3px; }
.pv-opt--on .pv-dot { border-color: var(--tone); }
.pv-opt--on .pv-dot i { background: var(--tone); }

/* the results: a bar for each choice, the leader in gold */
.pv-results { display: grid; gap: 12px; margin: 4px 0 0 40px; }
.pv-res { padding: 12px 14px; background: #fff; border: 1px solid #E6ECF5; border-radius: 14px; }
.pv-res--mine { border-color: var(--tone-2); box-shadow: 0 0 0 1px var(--tone-2) inset; }
.pv-res-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.pv-res-l { font-size: 14px; font-weight: 700; color: #1E2A44; }
.pv-mine { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; padding: 1px 8px; border-radius: 99px; background: var(--tone-soft); color: var(--tone-ink); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; vertical-align: 2px; }
.pv-res-p { font-size: 20px; font-weight: 800; color: var(--tone-ink); font-variant-numeric: tabular-nums; }
.pv-res--lead .pv-res-p { color: var(--tone); }
.pv-track { height: 10px; border-radius: 10px; background: #EEF2F8; overflow: hidden; margin: 8px 0 6px; }
.pv-track span { display: block; height: 100%; border-radius: 10px; background: linear-gradient(90deg, #F5D36B, var(--tone-bar)); transition: width .5s ease; }
.pv-res--lead .pv-track span { background: linear-gradient(90deg, var(--tone), var(--tone-2)); }
.pv-res-v { font-size: 12px; color: #8493AC; }
.pv-mytext { margin: 4px 0 0 40px; padding: 10px 14px; border-radius: 12px; background: #F6F9FC; font-size: 14px; color: #1E2A44; white-space: pre-wrap; word-break: break-word; }
.pv-mytext small { display: block; font-size: 11.5px; color: #8493AC; }
.pv-submit { background: var(--tone) !important; color: var(--tone-on) !important; }
.pv-note { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 12px; color: #8493AC; text-align: center; }
@media (max-width: 599px) {
    .pv-input, .pv-q-card .pv-opts, .pv-results, .pv-mytext, .pv-err { margin-left: 0; }
    .pv-q-kind { margin-left: 0; }
}
</style>
