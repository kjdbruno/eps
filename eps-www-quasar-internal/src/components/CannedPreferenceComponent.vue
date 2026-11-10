<template>
    <div class="rc-shell">
        <div class="rc-main">
            <div class="ov-title">the canned messages</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-chat-square-text" size="16px" /> messages</div><div class="ov-kpi-value">{{ counts.total }}</div><div class="ov-kpi-sub">ready-made replies</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-check-circle" size="16px" /> active</div><div class="ov-kpi-value">{{ counts.active }}</div><div class="ov-kpi-sub">offices can pick them</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-slash-circle" size="16px" /> inactive</div><div class="ov-kpi-value">{{ counts.inactive }}</div><div class="ov-kpi-sub">switched off</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-building" size="16px" /> with the office</div><div class="ov-kpi-value">{{ counts.withOffice }}</div><div class="ov-kpi-sub">name the office that sends them</div></div>
            </div>

            <div class="ov-duo q-mb-lg">
                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">status of the messages</div><div class="ov-card-note">all of them</div></div>
                    <div v-for="b in toBars(statusItems)" :key="b.label" class="ov-step">
                        <div class="ov-step-top">
                            <span class="ov-dot" :style="{ background: b.hex }"></span>
                            <span class="ov-step-label text-capitalize">{{ b.label }}</span>
                            <span class="ov-step-count">{{ b.count }}</span>
                            <span class="ov-step-pct">{{ b.pct }}%</span>
                        </div>
                        <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                    </div>
                    <div class="ov-card-foot">Offices see the active ones as pills above the reply box in the Conversation tab. Picking one fills the box, and they can still reword it before sending.</div>
                </div>

                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">changed last</div><div class="ov-card-note">tap one to edit it</div></div>
                    <div v-for="m in latest" :key="m.id" class="pf-next" @click="openEdit(m)">
                        <span class="pf-next-date"><q-icon name="bi-chat-square-text" size="18px" /></span>
                        <span class="pf-next-text"><b>{{ m.title }}</b><small>{{ moment(m.updatedAt).fromNow() }} &middot; {{ m.isActive ? 'active' : 'inactive' }}</small></span>
                    </div>
                    <div v-if="!latest.length" class="ov-empty">no message yet</div>
                    <div class="ov-card-foot">Placeholders such as <b>{firstname}</b>, <b>{reference}</b> and <b>{office}</b> are filled in with the feedback's data when an office picks the message or sends it.</div>
                </div>
            </div>
        </div>

        <PreferenceRail
            title="canned messages" :shown="filteredRows.length" :total="rows.length"
            v-model:search="search" placeholder="Search title or message..."
            :filters="STATUS_FILTERS" v-model:filter="statusFilter"
            :loading="PreferenceStore.isLoadingTable" icon="bi-chat-square-text" @add="openCreate"
        >
            <div
                v-for="m in filteredRows" :key="m.id"
                class="rc-item rc-item--click" :style="{ borderLeftColor: m.isActive ? 'var(--q-positive)' : '#C6C9CF' }"
                @click="openEdit(m)"
            >
                <div class="row items-center justify-between no-wrap">
                    <div class="text-caption text-weight-bold text-uppercase ellipsis">{{ m.title }}</div>
                    <span class="rc-pill" :class="m.isActive ? 'rc-pill--ok' : 'rc-pill--off'">{{ m.isActive ? 'active' : 'inactive' }}</span>
                </div>
                <div class="text-caption text-grey q-mt-xs cm-clamp">{{ m.message }}</div>
            </div>
        </PreferenceRail>

        <PreferenceDialog
            v-model="PreferenceStore.dialog" eyebrow="canned message preference" :title="isEdit ? 'modify canned message' : 'new canned message'"
            :pills="pills" :pages="pages" :page="page" :info="PAGE_INFO[page]" :checks="checks" :problems="problems"
            :is-edit="isEdit" :readonly="isEdit && !editing" :lock-hint="!isEdit && !stepDone(page) && page !== 'review'"
            :submit-label="isEdit ? 'save changes' : 'create message'" :submit-disabled="submitDisabled" :submit-hint="submitHint"
            :loading="PreferenceStore.isLoading"
            @before-show="openDialog(PreferenceStore.canned)" @go="wizard.go" @step="wizard.stepBy" @submit="save()"
        >
            <template #side-foot>
                <button v-if="isEdit && editing" type="button" class="rc-side-item pd-stop" @click="stopEditing">
                    <q-icon name="bi-arrow-left-circle" />
                    <span>Stop modifying</span>
                    <q-tooltip>Go back to the message without saving</q-tooltip>
                </button>
            </template>

            <template #readonly-rail>
                <RecordTrail v-if="current" module="canned" :entity-id="current.id" :created-at="current.createdAt" icon="bi-chat-square-text" :headline="current.title" subline="A quick message for the reply box" :status="trailStatus" :facts="trailFacts" @manage="wizard.go('manage')" />
            </template>

            <!-- ======================= OVERVIEW ======================= -->
            <div v-if="isEdit && page === 'overview' && current">
                <div class="rc-block">
                    <div class="rc-block-title">the message</div>
                    <div class="rc-cap">{{ current.title }}</div>
                    <div class="cn-preview">{{ fillTokens(current.message, sampleValues()) }}</div>
                    <div class="rc-field-foot"><span>As an office sees it, with sample data in the placeholders.</span><span>{{ current.message.length }} characters</span></div>
                </div>
                <div class="rc-block">
                    <div class="rc-block-title">about it</div>
                    <div class="rc-facts">
                        <div v-for="row in overviewFacts" :key="row.label" class="rc-fact">
                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                            <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ======================= MANAGE ======================= -->
            <div v-if="isEdit && page === 'manage' && current">
                <ManagePanel
                    what="message" :is-active="current.isActive"
                    modify-text="Change its title and its text. The Details page opens once you press Modify."
                    @modify="startEditing" @disable="setActive(current, false)" @enable="setActive(current, true)"
                />
            </div>

            <div v-show="page === 'details'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This message is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <template v-else>
                    <div class="rc-block">
                        <div class="rc-block-title">what it is for</div>
                        <div class="rc-cap" :class="{ 'rc-cap--bad': errors.title.type }">{{ errors.title.type ? errors.title.message : 'title (the pill offices pick)' }}</div>
                        <q-input v-model="form.title" outlined placeholder="e.g. Site inspection" :error="errors.title.type" no-error-icon hide-bottom-space maxlength="60" />
                        <div class="rc-field-foot"><span>A few words that say when to use it.</span><span>{{ form.title.trim().length }} / 60</span></div>
                    </div>

                    <div class="rc-block cc-fill">
                        <div class="rc-block-title">the message</div>
                        <div class="rc-cap" :class="{ 'rc-cap--bad': errors.message.type }">{{ errors.message.type ? errors.message.message : 'what the citizen reads' }}</div>
                        <q-input
                            ref="messageInput" v-model="form.message" type="textarea" outlined hide-bottom-space class="cc-textarea" :error="errors.message.type" no-error-icon
                            placeholder="Write the reply as it should reach the citizen..."
                        />
                        <div class="rc-field-foot"><span>Press Enter for a new line: it shows the same way in the conversation.</span><span>{{ form.message.trim().length }} / 1000</span></div>
                        <div class="rc-cap q-mt-md">fill in with the feedback's data &middot; tap to add at the cursor</div>
                        <div class="cc-tokens">
                            <button v-for="t in CANNED_TOKENS" :key="t.token" type="button" class="rc-codepill" @click="insertToken(t.token)">
                                <span>{{ t.token }}</span>
                                <q-tooltip>{{ t.hint }}, e.g. {{ t.sample }}</q-tooltip>
                            </button>
                        </div>
                        <div v-if="form.message.trim()" class="cc-note">
                            <q-icon name="bi-eye" size="16px" />
                            <span><b>Looks like this (with sample data):</b><br>{{ sample }}</span>
                        </div>
                    </div>
                </template>
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
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { api } from 'src/boot/axios';
import moment from 'moment';
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';
import PreferenceDialog from './PreferenceDialog.vue';
import { usePrefWizard } from 'src/composables/usePrefWizard';
import { toBars } from 'src/utils/prefBars';
import { CANNED_TOKENS, fillTokens, sampleValues } from 'src/utils/cannedTokens';
import ManagePanel from 'src/components/ManagePanel.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import PreferenceRail from './PreferenceRail.vue';

const PreferenceStore = usePreferenceStore();

const rows = ref([]);

const search = ref('');
const statusFilter = ref('all');
const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    return rows.value.filter(m => {
        if (statusFilter.value === 'active' && !m.isActive) return false;
        if (statusFilter.value === 'inactive' && m.isActive) return false;
        return !term || (m.title || '').toLowerCase().includes(term) || (m.message || '').toLowerCase().includes(term);
    });
});

const counts = computed(() => ({
    total: rows.value.length,
    active: rows.value.filter(m => m.isActive).length,
    inactive: rows.value.filter(m => !m.isActive).length,
    withOffice: rows.value.filter(m => (m.message || '').includes('{office}')).length,
}));
const statusItems = computed(() => [
    { label: 'active', count: counts.value.active, color: 'positive' },
    { label: 'inactive', count: counts.value.inactive, color: 'grey-6' },
]);
const latest = computed(() => [...rows.value]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5));

// The row the open dialog is editing, read live from the list so Disable/Enable updates it in place.
const current = computed(() => rows.value.find(m => m.id === id.value) || null);
const openEdit = (m) => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = true;
    PreferenceStore.canned = m;
};
const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const id = ref(null);
const form = reactive({ title: '', message: '' });
const errors = reactive({
    title: { type: false, message: '' },
    message: { type: false, message: '' },
});

// ---- the dialog: creating goes page by page (details, then review); editing is the one page
const isEdit = computed(() => PreferenceStore.isEdit);
const titleOk = computed(() => !!form.title.trim() && form.title.trim().length <= 60);
const messageOk = computed(() => form.message.trim().length >= 5 && form.message.trim().length <= 1000);
const stepDone = (key) => (key === 'details' ? titleOk.value && messageOk.value : true);
// An existing message opens on its overview; the Details page to change it only opens once Modify is pressed in Manage, where it
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
    overview: { icon: 'bi-grid', bg: '#E5EEFC', fg: '#204888', title: 'The overview', hint: 'The message as an office sees it.' },
    manage: { icon: 'bi-toggles', bg: '#FCE8E6', fg: '#A52E22', title: 'Manage it', hint: 'Change the message, or switch it on or off.' },
    details: { icon: 'bi-chat-square-text', bg: '#E5EEFC', fg: '#204888', title: 'The message', hint: 'What it is for, and what the citizen reads.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const pages = computed(() => ORDER().map(key => ({
    key, open: wizard.isOpen(key),
    icon: { overview: 'bi-grid', manage: 'bi-toggles', details: 'bi-chat-square-text', review: 'bi-clipboard-check' }[key], label: key,
    state: key === 'details' ? (errors.title.type || errors.message.type ? 'bad' : (stepDone('details') ? 'ok' : '')) : '',
})));
const checks = computed(() => [
    { key: 'title', page: 'details', required: true, ok: titleOk.value, title: 'A title', detail: titleOk.value ? form.title.trim() : 'A few words, 60 characters at most.' },
    { key: 'message', page: 'details', required: true, ok: messageOk.value, title: 'The message', detail: messageOk.value ? `${form.message.trim().length} characters.` : 'At least 5 characters, 1000 at most.' },
]);
const problems = computed(() => (errors.title.type || errors.message.type ? [
    ...(!titleOk.value ? ['Give it a title.'] : []),
    ...(!messageOk.value ? ['Write the message (5 to 1000 characters).'] : []),
] : []));
const reviewFacts = computed(() => [
    { label: 'Title', value: form.title, icon: 'bi-tag', tone: 'amber', page: 'details' },
    { label: 'Message', value: form.message, icon: 'bi-chat-square-text', tone: 'blue', page: 'details', wrap: true },
]);
const pills = computed(() => (isEdit.value && current.value
    ? [{ label: current.value.isActive ? 'active' : 'inactive', on: true }, { label: `updated ${moment(current.value.updatedAt).fromNow()}` }]
    : [{ label: 'new', on: true }]));
const submitDisabled = computed(() => (isEdit.value ? !editing.value || (!!current.value && !current.value.isActive) : page.value !== 'review'));
const submitHint = computed(() => (isEdit.value ? 'Enable it first.' : 'Go through the steps first: it is created from the review.'));
// once something was marked wrong, the marks follow what is typed: they clear as it gets fixed
watch(form, () => { if (errors.title.type || errors.message.type) validate(); }, { deep: true });

// the message with sample data in the placeholders (the real ones are filled in from the feedback when it is picked or sent)
const sample = computed(() => fillTokens(form.message.trim(), sampleValues()));

// a placeholder goes where the cursor is (or replaces what is selected)
const messageInput = ref(null);
const insertToken = (token) => {
    const el = messageInput.value?.getNativeElement?.();
    const text = form.message;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    form.message = text.slice(0, start) + token + text.slice(end);
    nextTick(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
};

const validate = () => {
    errors.title.type = !titleOk.value;
    errors.message.type = !messageOk.value;
    errors.title.message = !form.title.trim() ? 'Title is required.' : (!titleOk.value ? 'Title must be 60 characters or less.' : '');
    errors.message.message = !form.message.trim() ? 'Message is required.' : (!messageOk.value ? 'Message must be 5 to 1000 characters.' : '');
    return titleOk.value && messageOk.value;
};

const fetchData = async (opts = {}) => {
    if (!opts?.quiet) PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/canned');
        rows.value = response.data;
        PreferenceStore.isLoadingTable = false;
    } catch (error) {
        console.error('Error fetching data:', error);
        PreferenceStore.isLoadingTable = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while fetching the canned messages.'}<div>
            `
        });
    }
};

// someone else changing this list shows here without pressing refresh
useLiveRefresh(['canned'], () => fetchData({ quiet: true }));

onMounted(() => {
    fetchData();
});

// the overview of an existing message: its facts
const overviewFacts = computed(() => {
    const m = current.value;
    if (!m) return [];
    const used = CANNED_TOKENS.filter(t => m.message.toLowerCase().includes(t.token)).map(t => t.token);
    return [
        { label: 'Title (the pill)', value: m.title, icon: 'bi-tag', tone: 'amber' },
        { label: 'Placeholders used', value: used.length ? used.join('  ') : 'None: it is sent as written', icon: 'bi-braces', tone: 'purple' },
        { label: 'Status', value: m.isActive ? 'Active: offices can pick it' : 'Inactive: not offered', icon: 'bi-toggle-on', tone: 'teal' },
        { label: 'Last changed', value: moment(m.updatedAt).format('MMM DD, YYYY hh:mm A') + ' (' + moment(m.updatedAt).fromNow() + ')', icon: 'bi-clock-history', tone: 'blue' },
    ];
});

// the details in the panel on the right while the message is only being looked at
const trailStatus = computed(() => (current.value?.isActive ? { label: 'active', tone: 'ok' } : { label: 'inactive', tone: 'off' }));
const trailFacts = computed(() => {
    const m = current.value;
    if (!m) return [];
    const used = CANNED_TOKENS.filter(t => m.message.toLowerCase().includes(t.token)).length;
    return [
        { label: 'Length', value: `${m.message.length} characters`, icon: 'bi-text-paragraph' },
        { label: 'Placeholders', value: used ? `${used} used` : 'None', icon: 'bi-braces', dim: !used },
        { label: 'Offered', value: m.isActive ? 'Offices can pick it' : 'Not offered', icon: 'bi-toggle-on' },
        { label: 'Changed', value: moment(m.updatedAt).fromNow(), icon: 'bi-clock-history' },
    ];
});

const openDialog = (message) => {
    editing.value = false;
    wizard.reset();
    if (PreferenceStore.isEdit && message) {
        id.value = message.id;
        form.title = message.title || '';
        form.message = message.message || '';
    } else {
        id.value = null;
        form.title = '';
        form.message = '';
    }
    errors.title.type = false;
    errors.message.type = false;
};

const toastError = (error, fallback) => Toast.fire({
    icon: "error",
    html: `
        <div class="text-h6 text-bold text-uppercase">error!</div>
        <div class="text-caption;">${error.response?.data?.message || fallback}<div>
    `
});
const toastDone = (message) => Toast.fire({
    icon: "success",
    html: `
        <div class="text-h6 text-bold text-uppercase">granted!</div>
        <div class="text-caption;">${message}<div>
    `
});

const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/canned/${id.value}/update`, form)
            : await api.post('/preference/canned', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        PreferenceStore.isLoading = false;
        if (id.value) {
            updateRows(id.value, response.data.canned);
        } else {
            rows.value.unshift(response.data.canned);
        }
        toastDone(response.data.message);
    } catch (error) {
        console.error('Error saving data:', error);
        PreferenceStore.isLoading = false;
        // a refused field (a title that already exists...) is marked where it is typed
        const refused = error.response?.data?.errors;
        if (Array.isArray(refused) && refused.length) {
            refused.forEach((e) => {
                if (errors[e.path]) { errors[e.path].type = true; errors[e.path].message = e.msg; }
            });
            wizard.go('details');
            return;
        }
        toastError(error, 'An error occurred while saving the canned message.');
    }
};

const setActive = async (message, active) => {
    id.value = message.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/canned/${message.id}/${active ? 'enable' : 'disable'}`);
        updateRows(message.id, response.data.canned);
        PreferenceStore.isLoading = false;
        toastDone(response.data.message);
    } catch (error) {
        console.error('Error changing the canned message:', error);
        PreferenceStore.isLoading = false;
        toastError(error, `An error occurred while ${active ? 'enabling' : 'disabling'} the canned message.`);
    }
};

const updateRows = (rowId, data) => {
    const index = rows.value.findIndex(m => m.id === rowId);
    if (index !== -1) Object.assign(rows.value[index], data);
};
</script>

<style scoped>
.cn-preview { padding: 12px 14px; border-radius: 10px; background: #F6F9FC; font-size: 14px; line-height: 1.55; color: #16233A; white-space: pre-line; overflow-wrap: anywhere; }
.cm-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
