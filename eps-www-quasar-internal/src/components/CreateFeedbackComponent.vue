<template>
    <q-dialog persistent :model-value="modelValue" class="dialog dialog--wide" @update:model-value="v => emit('update:modelValue', v)" @before-show="onShow">
        <q-card>
            <q-card-section class="row items-center no-wrap">
                <div>
                    <div class="text-caption">citizen CSM report &middot; entered by staff</div>
                    <div class="text-h5 text-uppercase">file new CSM report</div>
                    <div class="rc-hero-badges">
                        <span class="rc-hero-pill rc-hero-pill--on">new</span>
                        <span v-if="officeName" class="rc-hero-pill">{{ officeName }}</span>
                        <span class="rc-hero-pill">{{ answeredCount }} of {{ SQD_QUESTIONS.length }} rated</span>
                        <span v-if="answeredCount" class="rc-hero-pill">{{ satisfactionLabel }}</span>
                    </div>
                </div>
                <q-space />
                <q-btn unelevated round flat icon="bi-x-circle" @click="() => emit('update:modelValue', false)" />
            </q-card-section>

            <q-card-section class="col rc-split">
                <!-- the pages of the form: one opens only when the ones before it are complete -->
                <aside class="rc-side">
                    <template v-for="(n, i) in pages" :key="n.key">
                        <div v-if="i === 0" class="rc-side-title">Filing</div>
                        <button
                            type="button" class="rc-side-item" :class="{ 'rc-side-item--on': page === n.key, 'rc-side-item--locked': !n.open }"
                            :disabled="!n.open" @click="go(n.key)"
                        >
                            <q-icon :name="n.icon" />
                            <span>{{ n.label }}</span>
                            <q-icon v-if="!n.open" name="bi-lock-fill" size="12px" class="cc-state" />
                            <q-icon v-else-if="n.state === 'bad'" name="bi-exclamation-circle-fill" size="14px" class="cc-state cc-state--bad" />
                            <q-icon v-else-if="n.state === 'ok'" name="bi-check-circle-fill" size="14px" class="cc-state cc-state--ok" />
                            <b v-else-if="n.count">{{ n.count }}</b>
                        </button>
                    </template>
                </aside>

                <div class="rc-main">
                    <div class="rc-page rc-page--form">
                        <div class="rc-pg-head">
                            <div class="wz-action" :style="{ '--wz-bg': current.bg, '--wz-fg': current.fg }">
                                <div class="wz-action-icon"><q-icon :name="current.icon" size="24px" /></div>
                                <div class="col" style="min-width: 0;">
                                    <div class="wz-action-eyebrow">step {{ pageIndex + 1 }} of {{ pages.length }}</div>
                                    <div class="wz-action-title">{{ current.title }}</div>
                                    <div class="wz-action-hint">{{ current.hint }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="rc-pg-main" ref="bodyRef">
                            <!-- ============================== visit ============================== -->
                            <div v-show="page === 'visit'">
                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.office.type }">{{ errors.office.type ? errors.office.message : 'which office is this report for' }}</div>
                                    <div v-if="loadingOffices"><q-spinner-ios size="1.5em" /></div>
                                    <div v-else class="row q-gutter-xs">
                                        <q-btn
                                            v-for="o in offices" :key="o.id"
                                            no-caps unelevated rounded size="sm" :label="o.alias || o.name"
                                            class="cf-chip" :class="officeId === o.id ? 'cf-chip--active' : ''"
                                            @click="officeId = o.id"
                                        >
                                            <q-tooltip>{{ o.name }}</q-tooltip>
                                        </q-btn>
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.date.type }">{{ errors.date.type ? errors.date.message : 'date of visit' }}</div>
                                    <DateInput v-model="date" :options="dateOptions" :error="!!errors.date.type" />
                                </div>
                            </div>

                            <!-- ============================== client ============================== -->
                            <div v-show="page === 'client'">
                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.type.type }">{{ errors.type.type ? errors.type.message : 'client type' }}</div>
                                    <div class="row q-gutter-xs">
                                        <q-btn
                                            v-for="opt in CLIENT_TYPES" :key="opt.value"
                                            no-caps unelevated rounded size="sm" :label="opt.label"
                                            class="cf-chip" :class="type === opt.value ? 'cf-chip--active' : ''"
                                            @click="type = opt.value"
                                        />
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-block-title">personal details<span class="rc-count">optional</span></div>
                                    <div class="cf-grid cf-grid--3">
                                        <div>
                                            <div class="rc-cap">sex</div>
                                            <q-select v-model="sex" :options="['Male', 'Female', 'Others']" outlined emit-value map-options hide-dropdown-icon placeholder="Choose sex" />
                                        </div>
                                        <div>
                                            <div class="rc-cap">age</div>
                                            <q-input v-model="age" outlined placeholder="Age" />
                                        </div>
                                        <div>
                                            <div class="rc-cap">email</div>
                                            <q-input v-model="email" type="email" outlined placeholder="name@example.com" />
                                        </div>
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-block-title">transaction<span class="rc-count">optional</span></div>
                                    <div class="cf-grid">
                                        <div>
                                            <div class="rc-cap">residence / city</div>
                                            <q-input v-model="residence" outlined placeholder="Residence or city" />
                                        </div>
                                        <div>
                                            <div class="rc-cap">service availed</div>
                                            <q-input v-model="serviceAvailed" outlined placeholder="Service availed" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ============================== charter (CC1-CC3) ============================== -->
                            <div v-show="page === 'charter'">
                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.cc1.type }">{{ errors.cc1.type ? errors.cc1.message : 'awareness' }}</div>
                                    <div class="text-caption text-grey q-mb-sm">Which of the following best describes your awareness of a Citizen's Charter (CC)?</div>
                                    <div class="column q-gutter-xs">
                                        <q-btn
                                            v-for="opt in CC1_OPTIONS" :key="opt.value"
                                            no-caps unelevated rounded align="left" :label="opt.label"
                                            class="cf-chip cf-chip--wide" :class="cc1 === opt.value ? 'cf-chip--active' : ''"
                                            @click="cc1 = opt.value"
                                        />
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.cc2.type }">{{ errors.cc2.type ? errors.cc2.message : 'visibility' }}</div>
                                    <div class="text-caption text-grey q-mb-sm">If aware of the CC, was it visible in the office you transacted with?</div>
                                    <div v-if="cc1 === '4'" class="cf-na"><q-icon name="bi-info-circle" size="14px" /> Not applicable: no CC was seen in this office.</div>
                                    <div class="row q-gutter-xs">
                                        <q-btn
                                            v-for="opt in CC2_OPTIONS" :key="opt.value"
                                            no-caps unelevated rounded size="sm" :label="opt.label" :disable="cc1 === '4'"
                                            class="cf-chip" :class="cc2 === opt.value ? 'cf-chip--active' : ''"
                                            @click="cc2 = opt.value"
                                        />
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': errors.cc3.type }">{{ errors.cc3.type ? errors.cc3.message : 'usefulness' }}</div>
                                    <div class="text-caption text-grey q-mb-sm">How much did the CC help you in your transaction?</div>
                                    <div v-if="cc1 === '4'" class="cf-na"><q-icon name="bi-info-circle" size="14px" /> Not applicable: no CC was seen in this office.</div>
                                    <div class="row q-gutter-xs">
                                        <q-btn
                                            v-for="opt in CC3_OPTIONS" :key="opt.value"
                                            no-caps unelevated rounded size="sm" :label="opt.label" :disable="cc1 === '4'"
                                            class="cf-chip" :class="cc3 === opt.value ? 'cf-chip--active' : ''"
                                            @click="cc3 = opt.value"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- ============================== service (SQD0-8) ============================== -->
                            <div v-show="page === 'service'">
                                <div class="cf-hint">Rate each statement. Anything left on N/A is not counted.</div>
                                <div v-for="q in SQD_QUESTIONS" :key="q.key" class="rc-block">
                                    <div class="rc-block-title">{{ q.key }}<span class="rc-count">{{ sqd[q.key] ? SQD_SCALE_LABELS[sqd[q.key] - 1] : 'N/A' }}</span></div>
                                    <div class="q-mb-sm">{{ q.label }}</div>
                                    <div class="cf-scale">
                                        <div v-for="n in 5" :key="n" class="choice-tile cf-tile" :class="{ 'is-on': sqd[q.key] === n }" @click="sqd[q.key] = n">
                                            <q-icon :name="icons[n - 1]" :color="colors[n - 1]" />
                                            <span>{{ SQD_SCALE_LABELS[n - 1] }}</span>
                                        </div>
                                        <div class="choice-tile cf-tile" :class="{ 'is-on': sqd[q.key] === 0 }" @click="sqd[q.key] = 0">
                                            <q-icon name="bi-dash-circle" color="grey" />
                                            <span>N/A</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ============================== review ============================== -->
                            <div v-if="page === 'review'">
                                <div class="rc-block">
                                    <div class="rc-block-title">about to be filed</div>
                                    <div class="rc-facts">
                                        <div v-for="row in reviewFacts" :key="row.label" class="rc-fact">
                                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                            <span class="rc-fact-text">
                                                <span class="rc-fact-label">{{ row.label }}</span>
                                                <span class="rc-fact-value">{{ row.value || 'Not given' }}</span>
                                            </span>
                                            <q-space />
                                            <q-btn flat no-caps rounded size="sm" color="primary" label="Change" @click="go(row.page)" />
                                        </div>
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-block-title">service ratings<span class="rc-count">{{ answeredCount }} of {{ SQD_QUESTIONS.length }}</span></div>
                                    <div v-for="q in SQD_QUESTIONS" :key="q.key" class="cf-row">
                                        <div class="cf-qty text-uppercase">{{ q.key.replace('sqd', '') }}</div>
                                        <div class="col" style="min-width: 0;">{{ q.label }}</div>
                                        <div class="text-weight-bold cf-rating">{{ sqd[q.key] ? SQD_SCALE_LABELS[sqd[q.key] - 1] : 'N/A' }}</div>
                                    </div>
                                </div>

                                <div class="rc-block">
                                    <div class="rc-cap">anything else to share? (optional)</div>
                                    <q-input outlined v-model="suggestion" type="textarea" rows="4" placeholder="A suggestion from the client..." />
                                </div>
                            </div>
                        </div>

                        <div class="rc-pg-foot">
                            <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" :disable="pageIndex === 0" @click="stepBy(-1)"><q-tooltip>Previous step</q-tooltip></q-btn>
                            <span v-if="!stepDone(page) && page !== 'review'" class="cc-foot-hint"><q-icon name="bi-lock" size="13px" /> Complete this step to open the next one</span>
                            <q-btn v-if="pageIndex < pages.length - 1" flat round size="sm" color="grey-8" icon="bi-arrow-right" @click="stepBy(1)"><q-tooltip>Next step</q-tooltip></q-btn>
                        </div>

                        <!-- the rail: the running score, what is still missing, and the button that files it -->
                        <div class="rc-pg-side">
                            <div class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="cf-score">
                                            <div class="cf-score-n">{{ answeredCount ? satisfactionPct + '%' : '—' }}</div>
                                            <div class="cf-score-l">
                                                <b>{{ answeredCount ? scoreBand : 'no ratings yet' }}</b>
                                                <span>{{ answeredCount }} of {{ SQD_QUESTIONS.length }} rated</span>
                                            </div>
                                        </div>
                                        <div class="rc-cap">before it can be filed<span class="rc-count">{{ checks.filter(c => c.ok).length }} / {{ checks.length }}</span></div>
                                        <ValidationCards :pages="pages" :checks="checks" :page="page" @go="go" />
                                    </div>
                                    <div v-if="problems.length" class="rc-problems">
                                        <div v-for="p in problems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        no-caps unelevated color="primary" icon="bi-send" label="file CSM report"
                                        class="rc-send rc-reply-send" :disable="page !== 'review'" :loading="feedbackLoading" @click="submit"
                                    >
                                        <q-tooltip v-if="page !== 'review'">Go through the steps first: it is filed from the review.</q-tooltip>
                                    </q-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>

            <q-inner-loading :showing="feedbackLoading">
                <q-spinner-ios color="primary" size="md" />
                <div class="text-caption text-uppercase text-grey">we're working on it</div>
            </q-inner-loading>
        </q-card>
    </q-dialog>
</template>

<script setup>
import ValidationCards from 'src/components/ValidationCards.vue';
import DateInput from 'src/components/DateInput.vue';
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { api } from 'src/boot/axios';
import { Toast } from 'src/boot/sweetalert';

// One create-a-CSM-report flow, laid out like the Feedback Desk's filing dialog: a side stepper whose steps open
// one after the other, one page of white blocks per step, and a right rail with the running score, what is still
// missing, and the filing button (which belongs to the review step only).
// Pages: visit -> client -> charter -> service -> review.
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    // start with this office already chosen (filing from the office's own dialog)
    presetOfficeId: { type: Number, default: null },
});
const emit = defineEmits(['update:modelValue', 'created']);

const CLIENT_TYPES = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'business', label: 'Business' },
    { value: 'government', label: 'Government' },
];

const CC1_OPTIONS = [
    { value: '1', label: "I know what a CC is and I saw this office's CC." },
    { value: '2', label: "I know what a CC is but I did NOT see this office's CC." },
    { value: '3', label: "I do not know what a CC is, but I saw this office's CC." },
    { value: '4', label: 'I do not know what a CC is and I did not see one in this office.' },
];
const CC2_OPTIONS = [
    { value: '1', label: 'Easy to see' },
    { value: '2', label: 'Somewhat easy to see' },
    { value: '3', label: 'Difficult to see' },
    { value: '4', label: 'Not visible at all' },
    { value: '5', label: 'Not Applicable' },
];
const CC3_OPTIONS = [
    { value: '1', label: 'Helped very much' },
    { value: '2', label: 'Somewhat helped' },
    { value: '3', label: 'Did not help' },
    { value: '4', label: 'Not Applicable' },
];

const SQD_QUESTIONS = [
    { key: 'sqd0', label: 'I am satisfied with the service that I availed' },
    { key: 'sqd1', label: 'I spent a reasonable amount of time for my transaction' },
    { key: 'sqd2', label: "The office followed the transaction's requirements and steps based on the information provided" },
    { key: 'sqd3', label: 'The steps (including payment) I needed to do for my transaction were easy and simple' },
    { key: 'sqd4', label: 'I easily found information about my transaction from the office or its website' },
    { key: 'sqd5', label: 'I paid a reasonable amount of fees for my transaction' },
    { key: 'sqd6', label: 'I feel the office was fair to everyone, or "walang palakasan" during my transaction' },
    { key: 'sqd7', label: 'I was treated courteously by the staff, and (if ask for help) the staff was helpful' },
    { key: 'sqd8', label: 'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained' },
];
const SQD_SCALE_LABELS = ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'];
const icons = ['bi-emoji-angry', 'bi-emoji-frown', 'bi-emoji-neutral', 'bi-emoji-smile', 'bi-emoji-laughing'];
const colors = ['red', 'amber', 'yellow', 'light-green', 'green'];

const page = ref('visit');
const bodyRef = ref(null);
const feedbackLoading = ref(false);

/* -------------------- office picker -------------------- */

const offices = ref([]);
const loadingOffices = ref(false);
const officeId = ref(null);
const officeName = computed(() => {
    const o = offices.value.find(x => x.id === officeId.value);
    return o ? (o.alias || o.name) : '';
});

const loadOffices = async () => {
    loadingOffices.value = true;
    try {
        const { data } = await api.get('/preference/office/getOffice');
        offices.value = data || [];
    } catch (error) {
        console.error('Error loading offices:', error);
    } finally {
        loadingOffices.value = false;
    }
};

/* -------------------- form state -------------------- */

const date = ref(null);
const type = ref('');
const email = ref('');
const sex = ref('');
const age = ref('');
const residence = ref('');
const serviceAvailed = ref('');
const cc1 = ref('');
const cc2 = ref('');
const cc3 = ref('');
const sqd = reactive({ sqd0: 0, sqd1: 0, sqd2: 0, sqd3: 0, sqd4: 0, sqd5: 0, sqd6: 0, sqd7: 0, sqd8: 0 });
const suggestion = ref('');

const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
const dateOptions = (d) => d <= todayStr;

const errors = reactive({
    office: { message: null, type: null },
    date: { message: null, type: null },
    type: { message: null, type: null },
    cc1: { message: null, type: null },
    cc2: { message: null, type: null },
    cc3: { message: null, type: null },
});
const setError = (key, message) => {
    errors[key].type = message ? true : null;
    errors[key].message = message || null;
};

const resetForm = () => {
    page.value = 'visit';
    officeId.value = props.presetOfficeId || null;
    date.value = null;
    type.value = '';
    email.value = '';
    sex.value = '';
    age.value = '';
    residence.value = '';
    serviceAvailed.value = '';
    cc1.value = '';
    cc2.value = '';
    cc3.value = '';
    Object.keys(sqd).forEach(k => { sqd[k] = 0; });
    suggestion.value = '';
    Object.keys(errors).forEach(k => setError(k, null));
};

const onShow = () => {
    resetForm();
    loadOffices();
};

// CC1 = 4 means "not aware, never saw a CC": CC2/CC3 don't apply, so pin them to their N/A value
// rather than forcing the client to answer a question about something they never saw.
watch(cc1, (val) => {
    if (val === '4') {
        cc2.value = '5';
        cc3.value = '4';
    } else {
        cc2.value = '';
        cc3.value = '';
    }
});

/* -------------------- running score -------------------- */

const answeredCount = computed(() => SQD_QUESTIONS.filter(q => sqd[q.key] > 0).length);
// same formula the dashboards use: average of the answered SQD ratings, out of 5, as a percentage
const satisfactionPct = computed(() => {
    if (!answeredCount.value) return 0;
    const sum = SQD_QUESTIONS.reduce((s, q) => s + (sqd[q.key] || 0), 0);
    return Math.round((sum / answeredCount.value) / 5 * 100);
});
const satisfactionLabel = computed(() => (answeredCount.value ? `${satisfactionPct.value}% satisfied` : '—'));
const scoreBand = computed(() => {
    const v = satisfactionPct.value;
    return v >= 95 ? 'excellent' : v >= 85 ? 'good' : v >= 70 ? 'fair' : 'needs improvement';
});
const optionLabel = (options, value) => options.find(o => o.value === value)?.label || '';

/* -------------------- the steps -------------------- */

// A step is complete when what it requires is filled in; a step opens only once every step before it is complete.
const ORDER = ['visit', 'client', 'charter', 'service', 'review'];
const PAGE_FIELDS = { visit: ['office', 'date'], client: ['type'], charter: ['cc1', 'cc2', 'cc3'] };
const stepDone = (key) => {
    if (key === 'visit') return !!officeId.value && !!date.value;
    if (key === 'client') return !!type.value;
    if (key === 'charter') return !!cc1.value && !!cc2.value && !!cc3.value;
    return true;
};
const isOpen = (key) => ORDER.slice(0, ORDER.indexOf(key)).every(stepDone);

const pageState = (key) => {
    if ((PAGE_FIELDS[key] || []).some(k => errors[k].type)) return 'bad';
    return PAGE_FIELDS[key] && stepDone(key) ? 'ok' : '';
};
const pages = computed(() => [
    { key: 'visit', open: isOpen('visit'), icon: 'bi-geo-alt', label: 'visit', state: pageState('visit') },
    { key: 'client', open: isOpen('client'), icon: 'bi-person', label: 'client', state: pageState('client') },
    { key: 'charter', open: isOpen('charter'), icon: 'bi-journal-check', label: 'charter', state: pageState('charter') },
    { key: 'service', open: isOpen('service'), icon: 'bi-emoji-smile', label: 'service', count: answeredCount.value },
    { key: 'review', open: isOpen('review'), icon: 'bi-clipboard-check', label: 'review' },
]);
const pageIndex = computed(() => Math.max(0, ORDER.indexOf(page.value)));
const go = (key) => {
    if (isOpen(key)) page.value = key;
};

const PAGE_INFO = {
    visit: { icon: 'bi-geo-alt', bg: '#E5EEFC', fg: '#204888', title: 'The visit', hint: 'Which office the client went to, and when.' },
    client: { icon: 'bi-person', bg: '#E4F6EA', fg: '#1C8A3B', title: 'The client', hint: 'What kind of client, and a few optional details.' },
    charter: { icon: 'bi-journal-check', bg: '#FFF1D6', fg: '#9A6B00', title: 'The citizen\'s charter', hint: 'Did the client know it, see it, and find it useful.' },
    service: { icon: 'bi-emoji-smile', bg: '#FDE7EC', fg: '#B3121F', title: 'The service', hint: 'Nine statements, rated from very dissatisfied to very satisfied.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then file it.' },
};
const current = computed(() => PAGE_INFO[page.value] || PAGE_INFO.visit);

const reviewFacts = computed(() => [
    { label: 'Office', value: officeName.value, icon: 'bi-building', tone: 'blue', page: 'visit' },
    { label: 'Date of visit', value: date.value, icon: 'bi-calendar-check', tone: 'teal', page: 'visit' },
    { label: 'Client type', value: CLIENT_TYPES.find(c => c.value === type.value)?.label, icon: 'bi-person', tone: 'purple', page: 'client' },
    { label: 'Sex · age', value: [sex.value || 'Others', age.value].filter(Boolean).join(' · '), icon: 'bi-person-vcard', tone: 'amber', page: 'client' },
    { label: 'Email', value: email.value, icon: 'bi-envelope', tone: 'red', page: 'client' },
    { label: 'Residence', value: residence.value, icon: 'bi-geo', tone: 'teal', page: 'client' },
    { label: 'Service availed', value: serviceAvailed.value, icon: 'bi-briefcase', tone: 'blue', page: 'client' },
    { label: 'Charter awareness', value: optionLabel(CC1_OPTIONS, cc1.value), icon: 'bi-journal-text', tone: 'amber', page: 'charter' },
    { label: 'Charter visibility', value: optionLabel(CC2_OPTIONS, cc2.value), icon: 'bi-eye', tone: 'purple', page: 'charter' },
    { label: 'Charter usefulness', value: optionLabel(CC3_OPTIONS, cc3.value), icon: 'bi-hand-thumbs-up', tone: 'teal', page: 'charter' },
]);

const checks = computed(() => [
    { key: 'office', page: 'visit', required: true, ok: !!officeId.value, title: 'The office', detail: officeId.value ? officeName.value : 'Choose the office the report is for.' },
    { key: 'date', page: 'visit', required: true, ok: !!date.value, title: 'Date of visit', detail: date.value || 'Pick the day of the visit.' },
    { key: 'type', page: 'client', required: true, ok: !!type.value, title: 'Client type', detail: CLIENT_TYPES.find(c => c.value === type.value)?.label || 'Citizen, business or government.' },
    { key: 'cc1', page: 'charter', required: true, ok: !!cc1.value, title: 'Charter awareness', detail: cc1.value ? 'Answered.' : 'Required.' },
    { key: 'cc2', page: 'charter', required: true, ok: !!cc2.value, title: 'Charter visibility', detail: cc2.value ? 'Answered.' : 'Required.' },
    { key: 'cc3', page: 'charter', required: true, ok: !!cc3.value, title: 'Charter usefulness', detail: cc3.value ? 'Answered.' : 'Required.' },
    { key: 'sqd', page: 'service', required: false, ok: answeredCount.value > 0, title: 'Service ratings', detail: `${answeredCount.value} of ${SQD_QUESTIONS.length} rated. Optional, N/A is not counted.` },
]);
const problems = computed(() => {
    const out = [];
    if (!officeId.value) out.push('Choose the office.');
    if (!date.value) out.push('Pick the date of the visit.');
    if (!type.value) out.push('Choose the client type.');
    if (!cc1.value || !cc2.value || !cc3.value) out.push('Answer the three charter questions.');
    return out;
});

/* -------------------- validation -------------------- */

// fills `errors` for one page and returns whether that page is valid
const validatePage = (key) => {
    if (key === 'visit') {
        setError('office', officeId.value ? null : 'Please choose an office');
        setError('date', date.value ? null : 'Date is required');
    } else if (key === 'client') {
        setError('type', type.value ? null : 'Client type is required');
    } else if (key === 'charter') {
        setError('cc1', cc1.value ? null : 'Please select an option for awareness');
        setError('cc2', cc2.value ? null : 'Please select an option for visibility');
        setError('cc3', cc3.value ? null : 'Please select an option for usefulness');
    }
    return !(PAGE_FIELDS[key] || []).some(k => errors[k].type);
};

// once something was marked wrong, the marks follow what is chosen: they clear as it gets fixed
watch([officeId, date, type, cc1, cc2, cc3], () => {
    if (Object.values(errors).some(e => e.type)) validatePage(page.value);
});

const scrollToProblem = async () => {
    await nextTick();
    const target = [...(bodyRef.value?.querySelectorAll('.rc-cap--bad') || [])].find(el => el.offsetParent !== null);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

// going forward asks the step you are on to be complete: what is missing is marked, and you stay
const stepBy = (dir) => {
    const next = ORDER[pageIndex.value + dir];
    if (!next) return;
    if (dir > 0 && !validatePage(page.value)) {
        scrollToProblem();
        return;
    }
    page.value = next;
};

const submit = async () => {
    const bad = ORDER.find(k => !validatePage(k));
    if (bad) {
        page.value = bad;
        scrollToProblem();
        return;
    }
    createKioskRating();
};

const createKioskRating = async () => {
    feedbackLoading.value = true;
    try {
        const response = await api.post('/feedback/kiosk', {
            date: date.value,
            email: email.value,
            officeId: officeId.value,
            type: type.value,
            sex: (!sex.value ? 'Others' : sex.value),
            age: age.value,
            residence: residence.value,
            serviceAvailed: serviceAvailed.value,
            cc1: cc1.value,
            cc2: cc2.value,
            cc3: cc3.value,
            ...sqd,
            suggestion: suggestion.value,
        });
        feedbackLoading.value = false;
        Toast.fire({
            icon: "success",
            html: `<div class="text-h6 text-bold text-uppercase">filed!</div><div class="text-caption">${response.data.message}<div>`
        });
        emit('created');
    } catch (error) {
        feedbackLoading.value = false;
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">something went wrong</div><div class="text-caption">${error?.response?.data?.message || 'Please try again.'}<div>`
        });
    }
};
</script>

<style scoped>
.cf-date { width: 100%; max-width: 340px; }
.cf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
.cf-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 900px) { .cf-grid, .cf-grid--3 { grid-template-columns: minmax(0, 1fr); } }
.cf-hint { margin-bottom: 12px; font-size: 12.5px; color: #6B7A99; }
.cf-na { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 12px; color: #8493AC; }

/* The office pills: same look as the list rail's quick-filter chips: plain white pill, thin border,
   fills solid primary when selected. */
.cf-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.cf-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.cf-chip.disabled { opacity: 0.6; }
/* the answers are read as written (the dialog capitalizes buttons, which mangles a whole sentence) */
.dialog--wide .cf-chip, .dialog--wide .cf-chip .block { text-transform: none !important; }
/* The Citizen's Charter awareness options are full sentences: one pill per line, stretched to the
   full width, instead of the short wrapped word-pills used elsewhere. */
.cf-chip--wide {
    width: 100%;
    justify-content: flex-start;
    white-space: normal;
    text-align: left;
    padding: 10px 16px;
    min-height: auto;
}

/* the five-point scale: six equal tiles (very dissatisfied ... very satisfied, N/A) */
.cf-scale { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.cf-tile { flex-direction: column; justify-content: center; gap: 4px; padding: 10px 4px; text-align: center; font-size: 10.5px; line-height: 1.2; letter-spacing: .02em; }
.cf-tile > .q-icon { font-size: 26px; }

/* review: one row per rating, numbered */
.cf-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #EEF2F8; font-size: 13px; }
.cf-qty { flex: 0 0 30px; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0, 78, 168, .1); color: var(--q-primary); font-weight: 700; font-size: 13px; }
.cf-rating { flex: 0 0 auto; color: var(--q-primary); }

/* the running score at the top of the rail */
.cf-score { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding: 12px 14px; border-radius: 12px; background: #204888; color: #fff; }
.cf-score-n { font-size: 30px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.cf-score-l { display: flex; flex-direction: column; font-size: 12px; opacity: .92; }
.cf-score-l b { font-size: 13px; text-transform: capitalize; }

.cc-state--ok { color: #1C8A3B; }
.cc-state--bad { color: #C0392B; }
.cc-checks { display: flex; flex-direction: column; gap: 8px; }
.cc-check { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid #E6ECF5; border-radius: 10px; background: #fff; text-align: left; font: inherit; cursor: pointer; transition: border-color .15s; }
.cc-check:hover { border-color: var(--q-primary); }
.cc-check > .q-icon { margin-top: 1px; }
.cc-check-t { display: block; font-size: 13px; font-weight: 700; color: #16233A; }
.cc-check-d { display: block; margin-top: 1px; font-size: 12px; color: #6B7A99; word-break: break-word; }
.cc-check--ok > .q-icon { color: #1C8A3B; }
.cc-check--bad { border-color: #F3CFD2; background: #FFF8F8; }
.cc-check--bad > .q-icon { color: #C0392B; }
.cc-check--opt > .q-icon { color: #A9B4C7; }
</style>
