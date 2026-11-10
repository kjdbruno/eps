<template>
    <div class="rc-shell">
        <div class="rc-main">
            <div class="ov-title">the offices</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-building" size="16px" /> offices</div><div class="ov-kpi-value">{{ counts.total }}</div><div class="ov-kpi-sub">in the system</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-check-circle" size="16px" /> active</div><div class="ov-kpi-value">{{ counts.active }}</div><div class="ov-kpi-sub">taking feedback</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-slash-circle" size="16px" /> inactive</div><div class="ov-kpi-value">{{ counts.inactive }}</div><div class="ov-kpi-sub">switched off</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-bullseye" size="16px" /> with a mandate</div><div class="ov-kpi-value">{{ counts.mandate }}</div><div class="ov-kpi-sub">matched by the AI</div></div>
            </div>

            <div class="ov-duo q-mb-md">
                    <div class="ov-card">
                        <div class="ov-card-head"><div class="ov-card-title">status of the offices</div><div class="ov-card-note">all of them</div></div>
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
                        <div class="ov-card-head"><div class="ov-card-title">mandate coverage</div><div class="ov-card-note">what the AI routes by</div></div>
                        <div v-for="b in toBars(mandateItems)" :key="b.label" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-dot" :style="{ background: b.hex }"></span>
                                <span class="ov-step-label text-capitalize">{{ b.label }}</span>
                                <span class="ov-step-count">{{ b.count }}</span>
                                <span class="ov-step-pct">{{ b.pct }}%</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                        </div>
                    </div>
            </div>

            <div class="ov-card q-mb-lg">
                <div class="ov-card-head"><div class="ov-card-title">without a mandate</div><div class="ov-card-note">skipped by the automatic routing</div></div>
                <div v-if="noMandate.length" class="pf-chips">
                    <button v-for="o in noMandate" :key="o.id" type="button" class="pf-chip" @click="openEdit(o)">
                        <span class="rc-code rc-code--solid">{{ o.alias || o.name }}</span><span class="pf-chip-t">{{ o.name }}</span>
                    </button>
                </div>
                <div v-else class="ov-empty">every office has a mandate</div>
                <div class="ov-card-foot">Feedback, discussions and surveys are matched to the office whose mandate they concern. An office with no mandate is never picked by the AI, so give each office the text of what it is responsible for.</div>
            </div>
        </div>

        <PreferenceRail
            title="offices" :shown="filteredRows.length" :total="rows.length"
            v-model:search="search" placeholder="Search name, alias, or email..."
            :filters="STATUS_FILTERS" v-model:filter="statusFilter"
            :loading="PreferenceStore.isLoadingTable" icon="bi-building" @add="openCreate"
        >
            <div
                v-for="o in filteredRows" :key="o.id"
                class="rc-item rc-item--click" :style="{ borderLeftColor: o.isActive ? 'var(--q-positive)' : '#C6C9CF' }"
                @click="openEdit(o)"
            >
                <div class="row items-center justify-between no-wrap">
                    <div class="text-caption text-weight-bold text-uppercase ellipsis">{{ o.alias }}</div>
                    <div class="row items-center no-wrap q-gutter-xs">
                        <span class="rc-pill" :class="o.mandate ? 'rc-pill--info' : 'rc-pill--warn'">{{ o.mandate ? 'mandate' : 'no mandate' }}</span>
                        <span class="rc-pill" :class="o.isActive ? 'rc-pill--ok' : 'rc-pill--off'">{{ o.isActive ? 'active' : 'inactive' }}</span>
                    </div>
                </div>
                <div class="text-caption text-grey text-capitalize q-mt-xs" v-if="o.name">{{ o.name }}</div>
                <div class="text-caption text-grey text-lowercase q-mt-xs" v-if="o.email">{{ o.email }}</div>
            </div>
        </PreferenceRail>

        <PreferenceDialog
            v-model="PreferenceStore.dialog" eyebrow="office preference" :title="isEdit ? 'modify office' : 'new office'"
            :pills="pills" :pages="pages" :page="page" :info="PAGE_INFO[page]" :checks="checks" :problems="problems"
            :is-edit="isEdit" :readonly="isEdit && !editing" :lock-hint="!isEdit && !stepDone(page) && page !== 'review'"
            :submit-label="isEdit ? 'save changes' : 'create office'" :submit-disabled="submitDisabled" :submit-hint="submitHint"
            :loading="PreferenceStore.isLoading"
            @before-show="openDialog(PreferenceStore.office)" @go="wizard.go" @step="wizard.stepBy" @submit="save()"
        >
            <template #side-foot>
                <button v-if="isEdit && editing" type="button" class="rc-side-item pd-stop" @click="stopEditing">
                    <q-icon name="bi-arrow-left-circle" />
                    <span>Stop modifying</span>
                    <q-tooltip>Go back to the office without saving</q-tooltip>
                </button>
            </template>

            <template #readonly-rail>
                <RecordTrail v-if="current" module="office" :entity-id="current.id" :created-at="current.createdAt" icon="bi-building" :headline="current.alias || current.name" :subline="current.alias ? current.name : ''" :status="trailStatus" :facts="trailFacts" @manage="wizard.go('manage')" />
            </template>

            <!-- ======================= OVERVIEW ======================= -->
            <div v-if="isEdit && page === 'overview'">
                <q-inner-loading :showing="loadingProfile && !profile"><q-spinner-ios color="primary" size="md" /></q-inner-loading>
                <template v-if="profile">
                    <div class="rc-block">
                        <div class="rc-block-title">the modules</div>
                        <div class="rc-tiles">
                            <button v-for="t in tiles" :key="t.page" type="button" class="rc-tile op-tile" @click="wizard.go(t.page)">
                                <span class="rc-ico" :class="`rc-ico--${t.tone}`"><q-icon :name="t.icon" size="18px" /></span>
                                <span class="rc-tile-text"><span class="rc-tile-label">{{ t.label }}</span><span class="rc-tile-value">{{ t.value }}</span><span class="rc-tile-sub">{{ t.sub }}</span></span>
                            </button>
                        </div>
                    </div>
                    <div class="rc-block">
                        <div class="rc-block-title">the office</div>
                        <div class="rc-facts">
                            <div v-for="row in factRows" :key="row.label" class="rc-fact" :class="{ 'rc-fact--top': row.wrap }">
                                <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value" :class="{ 'rc-fact-value--wrap': row.wrap }">{{ row.value }}</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="rc-block">
                        <div class="rc-block-title">latest feedback</div>
                        <template v-if="profile.feedback.length">
                            <div v-for="f in profile.feedback.slice(0, 5)" :key="f.id" class="pf-next" @click="wizard.go('feedback')">
                                <span class="pf-next-date"><q-icon name="bi-chat-dots" size="18px" /></span>
                                <span class="pf-next-text"><b>{{ f.referenceNo }}</b><small>{{ f.status }} &middot; {{ moment(f.createdAt).fromNow() }}</small></span>
                            </div>
                        </template>
                        <EmptyState v-else compact icon="bi-chat-dots" title="No feedback yet" hint="Feedback routed to this office shows here." />
                    </div>
                </template>
            </div>

            <!-- ======================= STAFF ======================= -->
            <div v-if="isEdit && page === 'staff' && profile">
                <div v-if="profile.staff.length" class="op-list">
                    <div v-for="u in profile.staff" :key="u.id" class="op-card op-card--row">
                        <PersonAvatar :user="u" :size="38" :online="u.isOnline" />
                        <div class="col" style="min-width: 0;">
                            <div class="op-name">{{ u.firstname }} {{ u.lastname }}</div>
                            <div class="op-sub">{{ ROLE_LABELS[u.role] || u.role }} &middot; {{ u.username }}</div>
                        </div>
                        <span class="rc-pill" :class="u.isActive ? 'rc-pill--ok' : 'rc-pill--off'">{{ u.isActive ? 'active' : 'inactive' }}</span>
                    </div>
                </div>
                <EmptyState v-else icon="bi-people" title="No staff" hint="No account belongs to this office yet. Add one under Preference > User." />
            </div>

            <!-- ======================= FEEDBACK ======================= -->
            <div v-if="isEdit && page === 'feedback' && profile">
                <div v-if="profile.feedback.length" class="op-list">
                    <div v-for="f in profile.feedback" :key="f.id" class="op-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="op-ref">{{ f.referenceNo }}</b>
                            <span class="rc-pill" :class="`rc-pill--${STATUS_TONE[f.officeStatus] || 'off'}`">{{ f.officeStatus }}</span>
                            <ImpressionBadge v-if="f.sentiment" :value="f.sentiment" />
                            <q-space />
                            <span class="op-when">{{ moment(f.createdAt).format('MMM DD, YYYY') }}</span>
                        </div>
                        <div class="op-text">{{ f.content }}</div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-chat-dots" title="No feedback" hint="No feedback has been routed to this office." />
            </div>

            <!-- ======================= CSM REPORTS ======================= -->
            <div v-if="isEdit && page === 'csm' && profile">
                <div v-if="profile.csm.length" class="op-list">
                    <div v-for="k in profile.csm" :key="k.id" class="op-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="op-ref">{{ moment(k.date).format('MMM DD, YYYY') }}</b>
                            <span class="rc-pill rc-pill--info">{{ k.entryFrom }}</span>
                            <ImpressionBadge v-if="k.sentiment" :value="k.sentiment" />
                            <q-space />
                            <span class="op-when">{{ k.score }}% satisfied</span>
                        </div>
                        <div v-if="k.serviceAvailed" class="op-text">{{ k.serviceAvailed }}</div>
                        <div v-if="k.suggestion" class="op-text op-text--quote">&ldquo;{{ k.suggestion }}&rdquo;</div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-clipboard-data" title="No CSM reports" hint="No CSM report has been recorded for this office." />
            </div>

            <!-- ======================= DISCUSSIONS & SURVEYS ======================= -->
            <div v-if="isEdit && page === 'modules' && profile">
                <div class="rc-block" v-if="profile.discussions.length">
                    <div class="rc-block-title">discussions sent to this office</div>
                    <div class="op-list">
                        <div v-for="d in profile.discussions" :key="d.id" class="op-card">
                            <div class="row items-center no-wrap q-gutter-x-sm">
                                <b class="op-ref ellipsis">{{ d.title }}</b>
                                <span class="rc-pill" :class="d.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ d.status }}</span>
                                <q-space />
                                <span class="op-when">{{ moment(d.createdAt).format('MMM DD, YYYY') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="rc-block" v-if="profile.surveys.length">
                    <div class="rc-block-title">surveys sent to this office</div>
                    <div class="op-list">
                        <div v-for="p in profile.surveys" :key="p.id" class="op-card">
                            <div class="row items-center no-wrap q-gutter-x-sm">
                                <b class="op-ref ellipsis">{{ p.question }}</b>
                                <span class="rc-pill" :class="p.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ p.status }}</span>
                                <q-space />
                                <span class="op-when">{{ moment(p.createdAt).format('MMM DD, YYYY') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <EmptyState v-if="!profile.discussions.length && !profile.surveys.length" icon="bi-people" title="No discussions or surveys" hint="None has been sent to this office." />
            </div>

            <!-- ======================= MANAGE ======================= -->
            <div v-if="isEdit && page === 'manage' && current">
                <ManagePanel
                    what="office" :is-active="current.isActive"
                    modify-text="Change its name, alias, email and mandate. The Details and Mandate pages open once you press Modify."
                    @modify="startEditing" @disable="disableOffice(current)" @enable="enableOffice(current)"
                />
            </div>

            <div v-show="page === 'details'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This office is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <div v-else class="rc-block">
                    <div class="rc-block-title">office information</div>
                    <div class="pf-grid pf-grid--3">
                        <div class="pf-span-2">
                            <div class="rc-cap" :class="{ 'rc-cap--bad': errors.name.type }">{{ errors.name.type ? errors.name.message : 'office name' }}</div>
                            <q-input v-model="form.name" outlined placeholder="Office name" :error="errors.name.type" no-error-icon hide-bottom-space />
                        </div>
                        <div>
                            <div class="rc-cap" :class="{ 'rc-cap--bad': errors.alias.type }">{{ errors.alias.type ? errors.alias.message : 'alias (the short code)' }}</div>
                            <q-input v-model="form.alias" outlined placeholder="e.g. CICTO" :error="errors.alias.type" no-error-icon hide-bottom-space />
                        </div>
                        <div class="pf-span-3">
                            <div class="rc-cap" :class="{ 'rc-cap--bad': errors.email.type }">{{ errors.email.type ? errors.email.message : 'office email' }}</div>
                            <q-input v-model="form.email" type="email" outlined placeholder="office@example.com" :error="errors.email.type" no-error-icon hide-bottom-space />
                        </div>
                    </div>
                </div>
            </div>

            <div v-show="page === 'mandate'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This office is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <div v-else class="rc-block cc-fill">
                    <div class="rc-block-title">mandate<span class="rc-count">optional</span></div>
                    <div class="rc-cap">what this office is responsible for</div>
                    <q-input v-model="form.mandate" type="textarea" outlined hide-bottom-space class="cc-textarea" placeholder="Describe the services, duties and concerns this office handles..." />
                    <div class="rc-field-foot"><span>Filed items are matched against this text to send them here. Leave it blank and the office is skipped by the automatic routing.</span><span>{{ (form.mandate || '').trim().length }}</span></div>
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
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';
import PreferenceDialog from './PreferenceDialog.vue';
import { usePrefWizard } from 'src/composables/usePrefWizard';
import { toBars } from 'src/utils/prefBars';
import PreferenceRail from './PreferenceRail.vue';
import ManagePanel from 'src/components/ManagePanel.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ImpressionBadge from 'src/components/ImpressionBadge.vue';
import PersonAvatar from 'src/components/PersonAvatar.vue';
import moment from 'moment';

const PreferenceStore = usePreferenceStore();

const rows = ref([]);

// Self-contained search and status filter — no pagination, the whole (already small) office list
// renders at once, same convention as the Complaint/Discussion/Poll rail lists elsewhere in this app.
const search = ref('');
const statusFilter = ref('all');
const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    return rows.value.filter(o => {
        if (statusFilter.value === 'active' && !o.isActive) return false;
        if (statusFilter.value === 'inactive' && o.isActive) return false;
        if (!term) return true;
        return (o.name || '').toLowerCase().includes(term) ||
            (o.alias || '').toLowerCase().includes(term) ||
            (o.email || '').toLowerCase().includes(term);
    });
});

const counts = computed(() => ({
    total: rows.value.length,
    active: rows.value.filter(o => o.isActive).length,
    inactive: rows.value.filter(o => !o.isActive).length,
    mandate: rows.value.filter(o => o.mandate).length,
}));
const statusItems = computed(() => [
    { label: 'active', count: counts.value.active, color: 'positive' },
    { label: 'inactive', count: counts.value.inactive, color: 'grey-6' },
]);
const mandateItems = computed(() => [
    { label: 'mandate set', count: counts.value.mandate, color: 'primary' },
    { label: 'no mandate', count: counts.value.total - counts.value.mandate, color: 'warning' },
]);

// The row the open dialog is editing, read live from the list so Disable/Enable updates it in place.
const current = computed(() => rows.value.find(o => o.id === id.value) || null);
const openEdit = (o) => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = true;
    PreferenceStore.office = o;
};

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const id = ref(null);
const form = reactive({
    name: '',
    alias: '',
    email: '',
    mandate: '',
});

const errors = reactive({
    name: { type: false, message: '' },
    alias: { type: false, message: '' },
    email: { type: false, message: '' },
});

// ---- the dialog: creating goes page by page (details, mandate, review); editing has the first two
const isEdit = computed(() => PreferenceStore.isEdit);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameOk = computed(() => !!form.name.trim());
const aliasOk = computed(() => !!form.alias.trim());
const emailOk = computed(() => EMAIL.test(form.email || ''));
const stepDone = (key) => (key === 'details' ? nameOk.value && aliasOk.value && emailOk.value : true);
// An existing office opens on its overview and what it holds; the pages to change it (Details, Mandate) only open once Modify
// is pressed in Manage, where it is also switched on or off.
const editing = ref(false);
const VIEW_PAGES = ['overview', 'staff', 'feedback', 'csm', 'modules', 'manage'];
// While it is being modified only the pages to modify it are there (no Overview, Manage...): Stop modifying goes back.
const ORDER = () => (isEdit.value ? (editing.value ? ['details', 'mandate'] : VIEW_PAGES) : ['details', 'mandate', 'review']);
const startEditing = () => { editing.value = true; wizard.go('details'); };
const stopEditing = () => { editing.value = false; wizard.go('manage'); };
const wizard = usePrefWizard({ order: ORDER, stepDone, isEdit, onBlocked: () => validate() });
const page = wizard.page;
const PAGE_INFO = {
    overview: { icon: 'bi-grid', bg: '#E5EEFC', fg: '#204888', title: 'The overview', hint: 'The office and what it holds at a glance.' },
    staff: { icon: 'bi-people', bg: '#E4F6EA', fg: '#1C8A3B', title: 'Its staff', hint: 'The accounts that belong to this office.' },
    feedback: { icon: 'bi-chat-dots', bg: '#F1E8FC', fg: '#6B3FB0', title: 'Its feedback', hint: 'The feedback routed to this office.' },
    csm: { icon: 'bi-clipboard-data', bg: '#FCE8E6', fg: '#A52E22', title: 'Its CSM reports', hint: 'What clients said about this office.' },
    modules: { icon: 'bi-ui-checks', bg: '#FFF4DB', fg: '#8A5B00', title: 'Discussions and surveys', hint: 'The ones sent to this office.' },
    manage: { icon: 'bi-toggles', bg: '#FCE8E6', fg: '#A52E22', title: 'Manage it', hint: 'Change the office, or switch it on or off.' },
    details: { icon: 'bi-building', bg: '#E5EEFC', fg: '#204888', title: 'The office', hint: 'Its name, its short code and where to reach it.' },
    mandate: { icon: 'bi-bullseye', bg: '#FFF1D6', fg: '#9A6B00', title: 'Its mandate', hint: 'What it is responsible for: this is what the AI routes by.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const anyError = computed(() => errors.name.type || errors.alias.type || errors.email.type);
const PAGE_ICON = { overview: 'bi-grid', staff: 'bi-people', feedback: 'bi-chat-dots', csm: 'bi-clipboard-data', modules: 'bi-ui-checks', manage: 'bi-toggles', details: 'bi-building', mandate: 'bi-bullseye', review: 'bi-clipboard-check' };
const PAGE_LABEL = { csm: 'CSM reports', modules: 'discussions & surveys' };
const PAGE_COUNT = computed(() => ({
    staff: profile.value?.summary.staff.total || 0,
    feedback: profile.value?.summary.feedback.total || 0,
    csm: profile.value?.summary.csm.total || 0,
    modules: (profile.value?.summary.discussions || 0) + (profile.value?.summary.surveys || 0),
}));
const pages = computed(() => ORDER().map(key => ({
    key, open: wizard.isOpen(key),
    icon: PAGE_ICON[key], label: `${PAGE_LABEL[key] || key}${PAGE_COUNT.value[key] ? ` (${PAGE_COUNT.value[key]})` : ''}`,
    state: key === 'details' ? (anyError.value ? 'bad' : (stepDone('details') ? 'ok' : '')) : (key === 'mandate' && form.mandate.trim() ? 'ok' : ''),
})));
const checks = computed(() => [
    { key: 'name', page: 'details', required: true, ok: nameOk.value, title: 'The name', detail: nameOk.value ? form.name.trim() : 'What the office is called.' },
    { key: 'alias', page: 'details', required: true, ok: aliasOk.value, title: 'The alias', detail: aliasOk.value ? form.alias.trim() : 'The short code, e.g. CICTO.' },
    { key: 'email', page: 'details', required: true, ok: emailOk.value, title: 'The email', detail: emailOk.value ? form.email : (form.email ? 'That does not look like an email.' : 'Where to reach the office.') },
    { key: 'mandate', page: 'mandate', required: false, ok: !!form.mandate.trim(), title: 'A mandate', detail: form.mandate.trim() ? `${form.mandate.trim().length} characters.` : 'Optional, but without it the AI never picks this office.' },
]);
const problems = computed(() => (anyError.value ? [
    ...(!nameOk.value ? ['Give the office a name.'] : []),
    ...(!aliasOk.value ? ['Give it an alias.'] : []),
    ...(!emailOk.value ? ['Give a valid email.'] : []),
] : []));
const reviewFacts = computed(() => [
    { label: 'Office name', value: form.name, icon: 'bi-building', tone: 'blue', page: 'details' },
    { label: 'Alias', value: form.alias, icon: 'bi-tag', tone: 'amber', page: 'details' },
    { label: 'Email', value: form.email, icon: 'bi-envelope', tone: 'red', page: 'details' },
    { label: 'Mandate', value: form.mandate, icon: 'bi-bullseye', tone: 'purple', page: 'mandate', wrap: true },
]);
const pills = computed(() => (isEdit.value && current.value
    ? [{ label: current.value.isActive ? 'active' : 'inactive', on: true }, { label: current.value.alias || '' }, { label: current.value.mandate ? 'mandate set' : 'no mandate' }].filter(p => p.label)
    : [{ label: 'new', on: true }]));
const submitDisabled = computed(() => (isEdit.value ? !editing.value || (!!current.value && !current.value.isActive) : page.value !== 'review'));
const submitHint = computed(() => (isEdit.value ? 'Enable it first.' : 'Go through the steps first: it is created from the review.'));
watch(form, () => { if (anyError.value) validate(); }, { deep: true });

// the offices the AI can never pick, for the overview
const noMandate = computed(() => rows.value.filter(o => !o.mandate));

// Validate the form inputs
const validate = () => {
    errors.name.type = !form.name;
    errors.alias.type = !form.alias;
    errors.email.type = !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

    errors.name.message = errors.name.type ? 'Name is required.' : '';
    errors.alias.message = errors.alias.type ? 'Alias is required.' : '';
    errors.email.message = !form.email ? 'Email is required.' : (errors.email.type ? 'Email is invalid.' : '');

    return  !errors.name.type &&
            !errors.alias.type &&
            !errors.email.type;
};

// Fetch data when the component is mounted
const fetchData = async (opts = {}) => {
    if (!opts?.quiet) PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/office');
        rows.value = response.data;
        PreferenceStore.isLoadingTable = false;
    } catch (error) {
        console.error('Error fetching data:', error);
        PreferenceStore.isLoadingTable = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while fetching office preferences.'}<div>
            `
        });
    }
};

// Fetch data when the component is mounted
// someone else changing this list shows here without pressing refresh
useLiveRefresh(['office'], () => fetchData({ quiet: true }));

onMounted(() => {
    fetchData();
});

// Open the dialog for creating or editing an office preference
// ---- what the office holds (the overview, staff, feedback, CSM reports, discussions and surveys pages)
const profile = ref(null);
const loadingProfile = ref(false);
const loadProfile = async (officeId) => {
    loadingProfile.value = true;
    try {
        const { data } = await api.get(`/preference/office/${officeId}/profile`);
        if (id.value === officeId) profile.value = data;
    } catch (error) {
        console.error('Error fetching the office:', error);
    } finally {
        loadingProfile.value = false;
    }
};
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const STATUS_TONE = { completed: 'ok', cancelled: 'off', received: 'info', pending: 'warn' };
const tiles = computed(() => {
    const s = profile.value?.summary;
    if (!s) return [];
    return [
        { page: 'staff', label: 'staff', value: s.staff.total, sub: `${s.staff.active} active · ${s.staff.online} online`, icon: 'bi-people', tone: 'teal' },
        { page: 'feedback', label: 'feedback', value: s.feedback.total, sub: `${s.feedback.ongoing} ongoing · ${s.feedback.completed} done`, icon: 'bi-chat-dots', tone: 'purple' },
        { page: 'csm', label: 'CSM reports', value: s.csm.total, sub: s.csm.avgScore != null ? `${s.csm.avgScore}% satisfied · ${s.csm.negative} negative` : 'none yet', icon: 'bi-clipboard-data', tone: 'red' },
        { page: 'modules', label: 'discussions & surveys', value: s.discussions + s.surveys, sub: `${s.discussions} discussions · ${s.surveys} surveys`, icon: 'bi-ui-checks', tone: 'amber' },
    ];
});
const factRows = computed(() => {
    const o = profile.value?.office;
    if (!o) return [];
    return [
        { label: 'Name', value: o.name || '—', icon: 'bi-building', tone: 'blue' },
        { label: 'Alias', value: o.alias || '—', icon: 'bi-tag', tone: 'amber' },
        { label: 'Email', value: o.email || '—', icon: 'bi-envelope', tone: 'red' },
        { label: 'Mandate', value: o.mandate || 'No mandate: the AI never routes feedback here', icon: 'bi-bullseye', tone: 'purple', wrap: true },
    ];
});

// the details in the panel on the right while the office is only being looked at
const trailStatus = computed(() => (current.value?.isActive ? { label: 'active', tone: 'ok' } : { label: 'inactive', tone: 'off' }));
const trailFacts = computed(() => {
    const o = current.value;
    if (!o) return [];
    const s = profile.value?.summary;
    return [
        { label: 'Email', value: o.email || 'Not on record', icon: 'bi-envelope', dim: !o.email },
        { label: 'Mandate', value: o.mandate ? 'Set' : 'None: never routed to', icon: 'bi-bullseye', dim: !o.mandate },
        { label: 'Staff', value: s ? `${s.staff.total} (${s.staff.active} active)` : '…', icon: 'bi-people' },
        { label: 'Feedback', value: s ? `${s.feedback.total} (${s.feedback.ongoing} ongoing)` : '…', icon: 'bi-chat-dots' },
        { label: 'CSM reports', value: s ? `${s.csm.total}` : '…', icon: 'bi-clipboard-data' },
    ];
});

const openDialog = (office) => {
    editing.value = false;
    wizard.reset();
    profile.value = null;

    if (PreferenceStore.isEdit && office) {
        id.value = office.id;
        form.name = office.name || '';
        form.alias = office.alias || '';
        form.email = office.email || '';
        form.mandate = office.mandate || '';
        loadProfile(office.id);
    } else {
        id.value = null;
        form.name = '';
        form.alias = '';
        form.email = '';
        form.mandate = '';
    }
    errors.name.type = false;
    errors.alias.type = false;
    errors.email.type = false;
};

// Save the form data
const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/office/${id.value}/update`, form)
            : await api.post('/preference/office', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        PreferenceStore.isLoading = false;
        if (id.value) {
            updateRows(id.value, response.data.office);
        } else {
            rows.value.unshift(response.data.office);
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
                <div class="text-caption;">${error.response.data.message || 'An error occurred while saving the office.'}<div>
            `
        });
    }
};

// Disable an office preference
const disableOffice = async (office) => {
    id.value = office.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/office/${office.id}/disable`);
        updateRows(office.id, response.data.office);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling office:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while disabling the office.'}<div>
            `
        });
    }
};

// Enable an office preference
const enableOffice = async (office) => {
    id.value = office.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/office/${office.id}/enable`);
        updateRows(office.id, response.data.office);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling office:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while enabling the office.'}<div>
            `
        });
    }
};

// Update rows when save or delete actions are performed
const updateRows = (id, data) => {
    const index = rows.value.findIndex(office => office.id === id);
    if (index !== -1) {
        Object.assign(rows.value[index], data)
    }
};
</script>

<style scoped>
.op-tile { text-align: left; cursor: pointer; font: inherit; }
.op-tile:hover { border-color: #B8C6DD; background: #F2F7FF; }
.op-list { display: flex; flex-direction: column; gap: 10px; }
.op-card { border: 1px solid #E6ECF5; border-radius: 12px; padding: 12px 14px; background: #fff; }
.op-card--row { display: flex; align-items: center; gap: 12px; }
.op-name { font-size: 13.5px; font-weight: 700; color: #16233A; text-transform: capitalize; }
.op-sub { font-size: 12px; color: #6B7A99; }
.op-ref { font-size: 13px; min-width: 0; }
.op-when { font-size: 11.5px; color: #8493AC; white-space: nowrap; }
.op-text { margin-top: 8px; font-size: 13px; line-height: 1.5; color: #16233A; overflow-wrap: anywhere; }
.op-text--quote { color: #4C5C79; font-style: italic; }
</style>
