<template>
    <div class="rc-shell">
        <div class="rc-main">
            <div class="ov-title">the holidays</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-calendar-event" size="16px" /> holidays</div><div class="ov-kpi-value">{{ counts.total }}</div><div class="ov-kpi-sub">on the calendar</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-check-circle" size="16px" /> active</div><div class="ov-kpi-value">{{ counts.active }}</div><div class="ov-kpi-sub">left out of the deadlines</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-calendar-check" size="16px" /> upcoming</div><div class="ov-kpi-value">{{ counts.upcoming }}</div><div class="ov-kpi-sub">from today on</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-slash-circle" size="16px" /> inactive</div><div class="ov-kpi-value">{{ counts.inactive }}</div><div class="ov-kpi-sub">switched off</div></div>
            </div>

            <div class="ov-duo q-mb-lg">
                    <div class="ov-card">
                        <div class="ov-card-head"><div class="ov-card-title">status of the holidays</div><div class="ov-card-note">all of them</div></div>
                        <div v-for="b in toBars(statusItems)" :key="b.label" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-dot" :style="{ background: b.hex }"></span>
                                <span class="ov-step-label text-capitalize">{{ b.label }}</span>
                                <span class="ov-step-count">{{ b.count }}</span>
                                <span class="ov-step-pct">{{ b.pct }}%</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                        </div>
                    </div>

                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">holidays by kind</div><div class="ov-card-note">all of them</div></div>
                    <div v-for="b in toBars(categoryItems)" :key="b.label" class="ov-step">
                        <div class="ov-step-top">
                            <span class="ov-dot" :style="{ background: b.hex }"></span>
                            <span class="ov-step-label">{{ b.label }}</span>
                            <span class="ov-step-count">{{ b.count }}</span>
                            <span class="ov-step-pct">{{ b.pct }}%</span>
                        </div>
                        <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                    </div>
                </div>

                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">holidays by year</div><div class="ov-card-note">tap a year to see only it</div></div>
                    <div v-for="b in toBars(yearItems)" :key="b.label" class="ov-step cursor-pointer" @click="yearFilter = String(b.label)">
                        <div class="ov-step-top">
                            <span class="ov-dot" :style="{ background: b.hex }"></span>
                            <span class="ov-step-label">{{ b.label }}</span>
                            <span class="ov-step-count">{{ b.count }}</span>
                            <span class="ov-step-pct">{{ b.pct }}%</span>
                        </div>
                        <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                    </div>
                    <div v-if="!yearItems.length" class="ov-empty">no holiday on the calendar yet</div>
                </div>

                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">coming up next</div><div class="ov-card-note">tap one to edit it</div></div>
                    <div v-for="h in nextHolidays" :key="h.id" class="pf-next" @click="openEdit(h)">
                        <span class="pf-next-date"><b>{{ moment(h.date).format('DD') }}</b><small>{{ moment(h.date).format('MMM') }}</small></span>
                        <span class="pf-next-text"><b>{{ h.name }}</b><small>{{ moment(h.date).format('dddd') }} &middot; {{ moment(h.date).fromNow() }}</small></span>
                    </div>
                    <div v-if="!nextHolidays.length" class="ov-empty">no active holiday ahead</div>
                    <div class="ov-card-foot">An active holiday is not counted in any deadline: the 1 day to acknowledge and the 3 days to resolve skip it.</div>
                </div>
            </div>
        </div>

        <PreferenceRail
            title="holidays" :shown="filteredRows.length" :total="rows.length"
            v-model:search="search" placeholder="Search holiday name..."
            :filters="STATUS_FILTERS" v-model:filter="statusFilter"
            :filters2="YEAR_FILTERS" v-model:filter2="yearFilter"
            :loading="PreferenceStore.isLoadingTable" icon="bi-calendar-event" @add="openCreate"
        >
            <template v-for="g in groupedRows" :key="g.year">
                <div class="hp-year">{{ g.year }}<span>{{ g.rows.length }} holiday{{ g.rows.length === 1 ? '' : 's' }}</span></div>
                <div
                    v-for="h in g.rows" :key="h.id"
                    class="rc-item rc-item--click" :style="{ borderLeftColor: h.isActive ? 'var(--q-positive)' : '#C6C9CF' }"
                    @click="openEdit(h)"
                >
                    <div class="row items-center justify-between no-wrap">
                        <div class="text-caption text-weight-bold text-uppercase ellipsis">{{ h.name }}</div>
                        <div class="row items-center no-wrap q-gutter-xs">
                            <span class="rc-pill rc-pill--info" v-if="h.isActive && isUpcoming(h)">upcoming</span>
                            <span class="rc-pill" :class="h.isActive ? 'rc-pill--ok' : 'rc-pill--off'">{{ h.isActive ? 'active' : 'inactive' }}</span>
                        </div>
                    </div>
                    <div class="row items-center no-wrap q-mt-xs">
                        <div class="text-caption text-grey ellipsis">{{ formatDate(h.date) }} &middot; {{ moment(h.date).format('dddd') }}</div>
                        <q-space />
                        <span class="rc-pill" :class="`rc-pill--${CATEGORY_TONE[h.category] || 'info'}`">{{ CATEGORY_LABEL[h.category] || h.category }}</span>
                    </div>
                </div>
            </template>
        </PreferenceRail>

        <PreferenceDialog
            v-model="PreferenceStore.dialog" eyebrow="holiday preference" :title="isEdit ? 'modify holiday' : 'new holiday'"
            :pills="pills" :pages="pages" :page="page" :info="PAGE_INFO[page]" :checks="checks" :problems="problems"
            :is-edit="isEdit" :readonly="isEdit && !editing" :lock-hint="!isEdit && !stepDone(page) && page !== 'review'"
            :submit-label="isEdit ? 'save changes' : 'create holiday'" :submit-disabled="submitDisabled" :submit-hint="submitHint"
            :loading="PreferenceStore.isLoading"
            @before-show="openDialog(PreferenceStore.holiday)" @go="wizard.go" @step="wizard.stepBy" @submit="save()"
        >
            <template #side-foot>
                <button v-if="isEdit && editing" type="button" class="rc-side-item pd-stop" @click="stopEditing">
                    <q-icon name="bi-arrow-left-circle" />
                    <span>Stop modifying</span>
                    <q-tooltip>Go back to the holiday without saving</q-tooltip>
                </button>
            </template>

            <template #readonly-rail>
                <RecordTrail v-if="current" module="holiday" :entity-id="current.id" :created-at="current.createdAt" icon="bi-calendar-event" :headline="current.name" :subline="moment(current.date).format('dddd, MMMM DD, YYYY')" :status="trailStatus" :facts="trailFacts" @manage="wizard.go('manage')" />
            </template>

            <!-- ======================= OVERVIEW ======================= -->
            <div v-if="isEdit && page === 'overview' && current">
                <div class="rc-block">
                    <div class="rc-block-title">the holiday</div>
                    <div class="rc-facts">
                        <div v-for="row in overviewFacts" :key="row.label" class="rc-fact">
                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                            <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                        </div>
                    </div>
                    <div class="cc-note"><q-icon name="bi-info-circle" size="16px" /><span>{{ CATEGORIES.find(c => c.value === (current.category || 'regular'))?.note }}</span></div>
                </div>
                <div class="rc-block">
                    <div class="rc-block-title">around it in {{ moment(current.date).year() }}</div>
                    <template v-if="neighbours.length">
                        <div v-for="h in neighbours" :key="h.id" class="pf-next" @click="openEdit(h)">
                            <span class="pf-next-date"><b>{{ moment(h.date).format('DD') }}</b><small>{{ moment(h.date).format('MMM') }}</small></span>
                            <span class="pf-next-text"><b>{{ h.name }}</b><small>{{ CATEGORY_LABEL[h.category] || 'Regular holiday' }} &middot; {{ moment(h.date).format('dddd') }}</small></span>
                        </div>
                    </template>
                    <EmptyState v-else compact icon="bi-calendar-event" title="Nothing near it" hint="No other holiday falls within a month of this one." />
                </div>
            </div>

            <!-- ======================= MANAGE ======================= -->
            <div v-if="isEdit && page === 'manage' && current">
                <ManagePanel
                    what="holiday" :is-active="current.isActive"
                    modify-text="Change its date, name and kind of day. The Details page opens once you press Modify."
                    @modify="startEditing" @disable="disableHoliday(current)" @enable="enableHoliday(current)"
                />
            </div>

            <div v-show="page === 'details'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This holiday is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <div v-else class="rc-block">
                    <div class="rc-block-title">holiday information</div>
                    <div class="pf-grid pf-grid--2">
                        <div>
                            <div class="rc-cap" :class="{ 'rc-cap--bad': errors.date.type }">{{ errors.date.type ? errors.date.message : 'date' }}</div>
                            <DateInput v-model="form.date" :error="!!errors.date.type" />
                        </div>
                        <div>
                            <div class="rc-cap" :class="{ 'rc-cap--bad': errors.name.type }">{{ errors.name.type ? errors.name.message : 'holiday name' }}</div>
                            <q-input v-model="form.name" outlined placeholder="Holiday name" :error="errors.name.type" no-error-icon hide-bottom-space />
                        </div>
                    </div>
                    <div class="rc-cap q-mt-md" :class="{ 'rc-cap--bad': errors.category.type }">{{ errors.category.type ? errors.category.message : 'what kind of day it is' }}</div>
                    <div class="row items-center q-gutter-xs">
                        <q-btn
                            v-for="c in CATEGORIES" :key="c.value" no-caps unelevated rounded size="sm" :label="c.label"
                            class="hp-chip" :class="form.category === c.value ? 'hp-chip--active' : ''" @click="form.category = c.value"
                        />
                    </div>
                    <div class="text-caption text-grey q-mt-sm">{{ categoryNote }}</div>
                    <div class="cc-note"><q-icon name="bi-info-circle" size="16px" /><span>A holiday is skipped when a deadline is counted, so feedback filed before one is not late because of it.</span></div>
                </div>
            </div>
                <div v-if="page === 'review'" class="rc-block">
                    <div class="rc-block-title">about to be created</div>
                    <div class="rc-facts">
                        <div v-for="row in reviewFacts" :key="row.label" class="rc-fact" :class="{ 'rc-fact--top': row.wrap }">
                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                            <span class="rc-fact-text">
                                <span class="rc-fact-label">{{ row.label }}</span>
                                <span class="rc-fact-value" :class="{ 'rc-fact-value--wrap': row.wrap }">{{ row.value || 'Not given' }}</span>
                            </span>
                            <q-space />
                            <q-btn flat no-caps rounded size="sm" color="primary" label="Change" @click="wizard.go(row.page)" />
                        </div>
                    </div>
                </div>
        </PreferenceDialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { api } from 'src/boot/axios';
import moment from 'moment';
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';
import PreferenceDialog from './PreferenceDialog.vue';
import { usePrefWizard } from 'src/composables/usePrefWizard';
import { toBars } from 'src/utils/prefBars';
import PreferenceRail from './PreferenceRail.vue';
import ManagePanel from 'src/components/ManagePanel.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import EmptyState from 'src/components/EmptyState.vue';
import DateInput from 'src/components/DateInput.vue';

const PreferenceStore = usePreferenceStore();

const rows = ref([]);

// Self-contained search and status filter — no pagination, the whole (already small) holiday list
// renders at once, same convention as the Complaint/Discussion/Poll rail lists elsewhere in this app.
const search = ref('');
const statusFilter = ref('all');
const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];
// what kind of day a holiday is, and the year of its date (Preference > Holiday groups and filters by both)
const CATEGORIES = [
    { value: 'regular', label: 'Regular holiday', note: 'A regular holiday: it is skipped when a deadline is counted.' },
    { value: 'special', label: 'Special non-working day', note: 'A special non-working day: it is skipped when a deadline is counted.' },
    { value: 'working', label: 'Special working day', note: 'A special working day is an ordinary working day: deadlines still count it.' },
    { value: 'local', label: 'Local day', note: 'A day of the city (anniversary, fiesta): it is skipped when a deadline is counted.' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));
const CATEGORY_TONE = { regular: 'bad', special: 'warn', working: 'off', local: 'info' };
const CATEGORY_HEX = { regular: '#C10015', special: '#FFC900', working: '#B8C2D4', local: '#68AFF1' };
const yearOf = (h) => moment(h.date).year();
const yearFilter = ref('all');
const years = computed(() => [...new Set(rows.value.map(yearOf))].sort((a, b) => b - a));
const YEAR_FILTERS = computed(() => [{ value: 'all', label: 'All' }, ...years.value.map(y => ({ value: String(y), label: String(y) }))]);
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    return rows.value.filter(h => {
        if (statusFilter.value === 'active' && !h.isActive) return false;
        if (statusFilter.value === 'inactive' && h.isActive) return false;
        if (yearFilter.value !== 'all' && String(yearOf(h)) !== yearFilter.value) return false;
        return !term || (h.name || '').toLowerCase().includes(term) || (CATEGORY_LABEL[h.category] || '').toLowerCase().includes(term);
    });
});
// the list under a heading for each year, the newest year first and the days of a year in order
const groupedRows = computed(() => {
    const byYear = new Map();
    for (const h of filteredRows.value) {
        const y = yearOf(h);
        if (!byYear.has(y)) byYear.set(y, []);
        byYear.get(y).push(h);
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, rows: list.sort((a, b) => new Date(a.date) - new Date(b.date)) }));
});
const categoryItems = computed(() => CATEGORIES
    .map(c => ({ label: c.label, count: rows.value.filter(h => (h.category || 'regular') === c.value).length, hex: CATEGORY_HEX[c.value] }))
    .filter(i => i.count));
const yearItems = computed(() => years.value.map(y => ({ label: String(y), count: rows.value.filter(h => yearOf(h) === y).length, color: 'primary' })));

// a holiday from today on (an inactive one is switched off, so it never counts)
const isUpcoming = (h) => moment(h.date).isSameOrAfter(moment(), 'day');
const counts = computed(() => ({
    total: rows.value.length,
    active: rows.value.filter(h => h.isActive).length,
    inactive: rows.value.filter(h => !h.isActive).length,
    upcoming: rows.value.filter(h => h.isActive && isUpcoming(h)).length,
}));
const statusItems = computed(() => [
    { label: 'active', count: counts.value.active, color: 'positive' },
    { label: 'inactive', count: counts.value.inactive, color: 'grey-6' },
]);
const timingItems = computed(() => [
    { label: 'upcoming', count: counts.value.upcoming, color: 'primary' },
    { label: 'past', count: counts.value.active - counts.value.upcoming, color: 'grey-6' },
]);

// The row the open dialog is editing, read live from the list so Disable/Enable updates it in place.
const current = computed(() => rows.value.find(h => h.id === id.value) || null);
const openEdit = (h) => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = true;
    PreferenceStore.holiday = h;
};

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const id = ref(null);
const form = reactive({
    date: '',
    name: '',
    category: 'regular',
});
const categoryNote = computed(() => CATEGORIES.find(c => c.value === form.category)?.note || '');

const errors = reactive({
    date: { type: false, message: '' },
    name: { type: false, message: '' },
    category: { type: false, message: '' },
});

// ---- the dialog: creating goes page by page (details, then review); editing is the one page
const isEdit = computed(() => PreferenceStore.isEdit);
const dateOk = computed(() => !!form.date && moment(form.date, 'YYYY-MM-DD', true).isValid());
const nameOk = computed(() => !!form.name.trim());
const categoryOk = computed(() => CATEGORIES.some(c => c.value === form.category));
const stepDone = (key) => (key === 'details' ? dateOk.value && nameOk.value && categoryOk.value : true);
// An existing holiday opens on its overview; the Details page to change it only opens once Modify is pressed in Manage, where it
// is also switched on or off.
const editing = ref(false);
// While it is being modified only the page to modify it is there (no Overview, Manage): Stop modifying goes back.
const ORDER = () => (isEdit.value ? (editing.value ? ['details'] : ['overview', 'manage']) : ['details', 'review']);
const startEditing = () => { editing.value = true; wizard.go('details'); };
const stopEditing = () => { editing.value = false; wizard.go('manage'); };
const wizard = usePrefWizard({
    order: () => ORDER(),
    stepDone, isEdit, onBlocked: () => validate(),
});
const page = wizard.page;
const PAGE_INFO = {
    overview: { icon: 'bi-grid', bg: '#E5EEFC', fg: '#204888', title: 'The overview', hint: 'The day, its kind, and the ones around it.' },
    manage: { icon: 'bi-toggles', bg: '#FCE8E6', fg: '#A52E22', title: 'Manage it', hint: 'Change the holiday, or switch it on or off.' },
    details: { icon: 'bi-calendar-event', bg: '#E5EEFC', fg: '#204888', title: 'The holiday', hint: 'Which day it is, and what it is called.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const pages = computed(() => ORDER().map(key => ({
    key, open: wizard.isOpen(key),
    icon: { overview: 'bi-grid', manage: 'bi-toggles', details: 'bi-calendar-event', review: 'bi-clipboard-check' }[key], label: key,
    state: key === 'details' ? (errors.date.type || errors.name.type ? 'bad' : (stepDone('details') ? 'ok' : '')) : '',
})));
const checks = computed(() => [
    { key: 'date', page: 'details', required: true, ok: dateOk.value, title: 'The date', detail: dateOk.value ? moment(form.date).format('MMMM DD, YYYY') : 'A valid date, YYYY-MM-DD.' },
    { key: 'name', page: 'details', required: true, ok: nameOk.value, title: 'The name', detail: nameOk.value ? form.name.trim() : 'What the holiday is called.' },
    { key: 'category', page: 'details', required: true, ok: categoryOk.value, title: 'The kind of day', detail: CATEGORY_LABEL[form.category] || 'Regular, special, special working or local.' },
]);
const problems = computed(() => [
    ...(!dateOk.value && (errors.date.type || errors.name.type) ? ['Give a valid date.'] : []),
    ...(!nameOk.value && (errors.date.type || errors.name.type) ? ['Give the holiday a name.'] : []),
]);
const reviewFacts = computed(() => [
    { label: 'Date', value: form.date ? moment(form.date).format('MMMM DD, YYYY') : '', icon: 'bi-calendar-event', tone: 'blue', page: 'details' },
    { label: 'Holiday name', value: form.name, icon: 'bi-tag', tone: 'amber', page: 'details' },
    { label: 'Kind of day', value: CATEGORY_LABEL[form.category], icon: 'bi-flag', tone: 'purple', page: 'details' },
]);
const pills = computed(() => (isEdit.value && current.value
    ? [{ label: current.value.isActive ? 'active' : 'inactive', on: true }, { label: moment(current.value.date).format('MMM DD, YYYY') }, { label: CATEGORY_LABEL[current.value.category] || 'Regular holiday' }]
    : [{ label: 'new', on: true }]));
const submitDisabled = computed(() => (isEdit.value ? !editing.value || (!!current.value && !current.value.isActive) : page.value !== 'review'));
const submitHint = computed(() => (isEdit.value ? 'Enable it first.' : 'Go through the steps first: it is created from the review.'));
// once something was marked wrong, the marks follow what is typed: they clear as it gets fixed
watch(form, () => { if (errors.date.type || errors.name.type || errors.category.type) validate(); }, { deep: true });

// the next active holidays, for the overview
const nextHolidays = computed(() => rows.value
    .filter(h => h.isActive && isUpcoming(h))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5));

const formatDate = (date) => moment(date).format('MMM DD, YYYY');

// Validate the form inputs
const validate = () => {
    errors.date.type = !form.date || !moment(form.date, 'YYYY-MM-DD', true).isValid();
    errors.name.type = !form.name;
    errors.category.type = !categoryOk.value;
    errors.category.message = errors.category.type ? 'Choose what kind of day it is.' : '';

    errors.date.message = !form.date ? 'Date is required.' : (errors.date.type ? 'Date must be YYYY-MM-DD.' : '');
    errors.name.message = errors.name.type ? 'Name is required.' : '';

    return !errors.date.type && !errors.name.type && !errors.category.type;
};

const fetchData = async (opts = {}) => {
    if (!opts?.quiet) PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/holiday');
        rows.value = response.data;
        PreferenceStore.isLoadingTable = false;
    } catch (error) {
        console.error('Error fetching data:', error);
        PreferenceStore.isLoadingTable = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while fetching holidays.'}<div>
            `
        });
    }
};

// someone else changing this list shows here without pressing refresh
useLiveRefresh(['holiday'], () => fetchData({ quiet: true }));

onMounted(() => {
    fetchData();
});

// the overview of an existing holiday: its facts, and the holidays within a month of it
const overviewFacts = computed(() => {
    const h = current.value;
    if (!h) return [];
    const days = moment(h.date).startOf('day').diff(moment().startOf('day'), 'days');
    return [
        { label: 'Date', value: moment(h.date).format('MMMM DD, YYYY'), icon: 'bi-calendar-event', tone: 'blue' },
        { label: 'Day of the week', value: moment(h.date).format('dddd'), icon: 'bi-calendar-week', tone: 'teal' },
        { label: 'Kind of day', value: CATEGORY_LABEL[h.category] || 'Regular holiday', icon: 'bi-flag', tone: 'purple' },
        { label: 'When', value: days === 0 ? 'Today' : (days > 0 ? `In ${days} day${days === 1 ? '' : 's'}` : `${-days} day${days === -1 ? '' : 's'} ago`), icon: 'bi-clock', tone: 'amber' },
        { label: 'Deadlines', value: !h.isActive ? 'Switched off: counted as a working day' : (h.category === 'working' ? 'A working day: deadlines still count it' : 'Skipped when a deadline is counted'), icon: 'bi-hourglass-split', tone: 'red' },
    ];
});
const neighbours = computed(() => {
    const h = current.value;
    if (!h) return [];
    return rows.value
        .filter(x => x.id !== h.id && Math.abs(moment(x.date).diff(moment(h.date), 'days')) <= 31)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
});

// the details in the panel on the right while the holiday is only being looked at
const trailStatus = computed(() => (current.value?.isActive ? { label: 'active', tone: 'ok' } : { label: 'inactive', tone: 'off' }));
const trailFacts = computed(() => {
    const h = current.value;
    if (!h) return [];
    const days = moment(h.date).startOf('day').diff(moment().startOf('day'), 'days');
    return [
        { label: 'Kind', value: CATEGORY_LABEL[h.category] || 'Regular holiday', icon: 'bi-flag' },
        { label: 'Year', value: String(moment(h.date).year()), icon: 'bi-calendar3' },
        { label: 'When', value: days === 0 ? 'Today' : (days > 0 ? `In ${days} day${days === 1 ? '' : 's'}` : `${-days} day${days === -1 ? '' : 's'} ago`), icon: 'bi-clock' },
        { label: 'Deadlines', value: !h.isActive || h.category === 'working' ? 'Counted' : 'Skipped', icon: 'bi-hourglass-split' },
    ];
});

const openDialog = (holiday) => {
    editing.value = false;
    wizard.reset();
    if (PreferenceStore.isEdit && holiday) {
        id.value = holiday.id;
        form.date = holiday.date || '';
        form.name = holiday.name || '';
        form.category = holiday.category || 'regular';
    } else {
        id.value = null;
        form.date = '';
        form.name = '';
        form.category = 'regular';
    }
    errors.date.type = false;
    errors.name.type = false;
    errors.category.type = false;
};

const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/holiday/${id.value}/update`, form)
            : await api.post('/preference/holiday', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        PreferenceStore.isLoading = false;
        if (id.value) {
            updateRows(id.value, response.data.holiday);
        } else {
            rows.value.unshift(response.data.holiday);
        }
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error saving data:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while saving the holiday.'}<div>
            `
        });
    }
};

const disableHoliday = async (holiday) => {
    id.value = holiday.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/holiday/${holiday.id}/disable`);
        updateRows(holiday.id, response.data.holiday);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling holiday:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while disabling the holiday.'}<div>
            `
        });
    }
};

const enableHoliday = async (holiday) => {
    id.value = holiday.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/holiday/${holiday.id}/enable`);
        updateRows(holiday.id, response.data.holiday);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling holiday:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while enabling the holiday.'}<div>
            `
        });
    }
};

const updateRows = (id, data) => {
    const index = rows.value.findIndex(holiday => holiday.id === id);
    if (index !== -1) {
        Object.assign(rows.value[index], data)
    }
};
</script>

<style scoped>
.hp-year { position: sticky; top: 0; z-index: 1; display: flex; align-items: baseline; justify-content: space-between; padding: 8px 16px; background: #F1F5FB; border-bottom: 1px solid #E3EAF4; font-size: 13px; font-weight: 800; color: #204888; letter-spacing: .04em; }
.hp-year span { font-size: 11px; font-weight: 600; color: #8493AC; letter-spacing: 0; }
.hp-chip { background: #FFFFFF; color: #4C5C79; border: 1px solid #DCE4F0; min-height: 26px; padding: 0 12px; font-size: 12px; }
.hp-chip--active { background: var(--q-primary); color: #FFFFFF; border-color: var(--q-primary); }
</style>
