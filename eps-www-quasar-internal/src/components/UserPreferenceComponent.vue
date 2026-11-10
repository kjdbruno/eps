<template>
    <div class="rc-shell">
        <div class="rc-main">
            <div class="ov-title">the accounts</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> users</div><div class="ov-kpi-value">{{ counts.total }}</div><div class="ov-kpi-sub">staff accounts</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-check-circle" size="16px" /> active</div><div class="ov-kpi-value">{{ counts.active }}</div><div class="ov-kpi-sub">can sign in</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-slash-circle" size="16px" /> inactive</div><div class="ov-kpi-value">{{ counts.inactive }}</div><div class="ov-kpi-sub">switched off</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-building" size="16px" /> without an office</div><div class="ov-kpi-value">{{ counts.noOffice }}</div><div class="ov-kpi-sub">no office of their own</div></div>
            </div>

            <div class="ov-duo q-mb-md">
                    <div class="ov-card">
                        <div class="ov-card-head"><div class="ov-card-title">users by role</div><div class="ov-card-note">all of them</div></div>
                        <div v-for="b in toBars(roleItems)" :key="b.label" class="ov-step">
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
                        <div class="ov-card-head"><div class="ov-card-title">status of the users</div><div class="ov-card-note">all of them</div></div>
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
            </div>

            <div class="ov-card q-mb-lg">
                <div class="ov-card-head"><div class="ov-card-title">workstation accounts without an office</div><div class="ov-card-note">they cannot work on anything</div></div>
                <div v-if="stranded.length" class="pf-chips">
                    <button v-for="u in stranded" :key="u.id" type="button" class="pf-chip" @click="openEdit(u)">
                        <span class="rc-code rc-code--bad">no office</span><span class="pf-chip-t">{{ u.firstname }} {{ u.lastname }}</span>
                    </button>
                </div>
                <div v-else class="ov-empty">every workstation account has an office</div>
                <div class="ov-card-foot">A workstation account sees only what is assigned to its own office, so without an office it has nothing to work on.</div>
            </div>
        </div>

        <PreferenceRail
            title="users" :shown="filteredRows.length" :total="rows.length"
            v-model:search="search" placeholder="Search name, username, or office..."
            :filters="STATUS_FILTERS" v-model:filter="statusFilter"
            :loading="PreferenceStore.isLoadingTable" icon="bi-people" @add="openCreate"
        >
            <div
                v-for="u in filteredRows" :key="u.id"
                class="rc-item rc-item--click" :style="{ borderLeftColor: u.isActive ? 'var(--q-positive)' : '#C6C9CF' }"
                @click="openEdit(u)"
            >
                <div class="row items-center no-wrap">
                    <q-avatar size="34px" color="primary" text-color="white" class="q-mr-sm">
                        <img v-if="u.avatar" :src="photoUrl(u.avatar)">
                        <q-icon v-else name="bi-person-fill" size="18px" />
                    </q-avatar>
                    <div class="col" style="min-width: 0;">
                        <div class="row items-center justify-between no-wrap">
                            <div class="text-caption text-weight-bold text-uppercase ellipsis">{{ u.firstname }} {{ u.lastname }}</div>
                            <span class="rc-pill q-ml-sm" :class="u.isActive ? 'rc-pill--ok' : 'rc-pill--off'">{{ u.isActive ? 'active' : 'inactive' }}</span>
                        </div>
                        <div class="row items-center no-wrap q-mt-xs">
                            <div class="text-caption text-grey ellipsis">{{ u.username }} &middot; {{ u.office || 'no office' }}</div>
                            <q-space />
                            <span class="rc-pill rc-pill--info">{{ u.role }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </PreferenceRail>

        <PreferenceDialog
            v-model="PreferenceStore.dialog" eyebrow="user preference" :title="isEdit ? 'modify user' : 'new user'"
            :pills="pills" :pages="pages" :page="page" :info="PAGE_INFO[page]" :checks="checks" :problems="problems"
            :is-edit="isEdit" :readonly="isEdit && !editing" :lock-hint="!isEdit && !stepDone(page) && page !== 'review'"
            :submit-label="isEdit ? 'save changes' : 'create user'" :submit-disabled="submitDisabled" :submit-hint="submitHint"
            :loading="PreferenceStore.isLoading"
            @before-show="openDialog(PreferenceStore.user)" @go="wizard.go" @step="wizard.stepBy" @submit="save()"
        >
            <!-- ======================= OVERVIEW: the account and every module at a glance ======================= -->
            <template #side-foot>
                <button v-if="isEdit && editing" type="button" class="rc-side-item pd-stop" @click="stopEditing">
                    <q-icon name="bi-arrow-left-circle" />
                    <span>Stop modifying</span>
                    <q-tooltip>Go back to the account without saving</q-tooltip>
                </button>
            </template>

            <template #readonly-rail>
                <RecordTrail v-if="current" module="user" :entity-id="current.id" :created-at="current.createdAt" :person="{ ...current, isOnline: profile?.account.isOnline }" :headline="`${current.firstname} ${current.lastname}`" :subline="trailSubline" :status="trailStatus" :facts="trailFacts" @manage="wizard.go('manage')" />
            </template>

            <div v-if="isEdit && page === 'overview'">
                <q-inner-loading :showing="loadingProfile && !profile"><q-spinner-ios color="primary" size="md" /></q-inner-loading>
                <template v-if="profile">
                    <div class="rc-block">
                        <div class="rc-block-title">the modules</div>
                        <div class="rc-tiles">
                            <button v-for="t in tiles" :key="t.page" type="button" class="rc-tile up-tile" @click="wizard.go(t.page)">
                                <span class="rc-ico" :class="`rc-ico--${t.tone}`"><q-icon :name="t.icon" size="18px" /></span>
                                <span class="rc-tile-text"><span class="rc-tile-label">{{ t.label }}</span><span class="rc-tile-value">{{ t.value }}</span><span class="rc-tile-sub">{{ t.sub }}</span></span>
                            </button>
                        </div>
                    </div>

                    <div class="rc-block">
                        <div class="rc-block-title">the account</div>
                        <div class="rc-facts">
                            <div v-for="row in factRows" :key="row.label" class="rc-fact">
                                <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                            </div>
                        </div>
                    </div>

                    <div class="rc-block">
                        <div class="rc-block-title">latest activity</div>
                        <template v-if="profile.activity.length">
                            <div v-for="a in profile.activity" :key="a.id" class="pf-next up-act">
                                <span class="pf-next-date"><q-icon name="bi-clock-history" size="18px" /></span>
                                <span class="pf-next-text"><b>{{ a.description }}</b><small>{{ a.module }} &middot; {{ a.action }} &middot; {{ moment(a.createdAt).fromNow() }}</small></span>
                            </div>
                        </template>
                        <EmptyState v-else compact icon="bi-clock-history" title="No activity yet" hint="What this account creates, changes or closes shows here." />
                    </div>
                </template>
            </div>

            <!-- ======================= FEEDBACK they answered ======================= -->
            <div v-if="isEdit && page === 'feedback'">
                <div v-if="profile && profile.feedback.length" class="up-list">
                    <div v-for="f in profile.feedback" :key="f.id" class="up-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="up-ref">{{ f.referenceNo }}</b>
                            <span class="rc-pill" :class="`rc-pill--${STATUS_TONE[f.status] || 'off'}`">{{ f.status }}</span>
                            <q-space />
                            <span class="up-when">{{ moment(f.lastReplyAt).format('MMM DD, YYYY') }}</span>
                        </div>
                        <div class="up-text">{{ f.content }}</div>
                        <div class="up-meta"><span><q-icon name="bi-chat-dots" size="12px" /> {{ f.replies }} repl{{ f.replies === 1 ? 'y' : 'ies' }} from this account</span></div>
                    </div>
                </div>
                <EmptyState v-else-if="profile" icon="bi-chat-dots" title="No feedback answered" hint="This account has not replied to any feedback." />
            </div>

            <!-- ======================= DISCUSSIONS ======================= -->
            <div v-if="isEdit && page === 'discussions'">
                <template v-if="profile">
                    <div class="rc-block" v-if="profile.discussions.made.length">
                        <div class="rc-block-title">opened by this account</div>
                        <div class="up-list">
                            <div v-for="d in profile.discussions.made" :key="d.id" class="up-card">
                                <div class="row items-center no-wrap q-gutter-x-sm">
                                    <b class="up-ref ellipsis">{{ d.title }}</b>
                                    <span class="rc-pill" :class="d.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ d.status }}</span>
                                    <q-space />
                                    <span class="up-when">{{ moment(d.createdAt).format('MMM DD, YYYY') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="rc-block" v-if="profile.discussions.comments.length">
                        <div class="rc-block-title">comments by this account</div>
                        <div class="up-list">
                            <div v-for="c in profile.discussions.comments" :key="c.id" class="up-card">
                                <div class="row items-center no-wrap q-gutter-x-sm">
                                    <b class="up-ref ellipsis">{{ c.title }}</b>
                                    <q-space />
                                    <span class="up-when">{{ moment(c.createdAt).format('MMM DD, YYYY') }}</span>
                                </div>
                                <div class="up-text">{{ c.content }}</div>
                            </div>
                        </div>
                    </div>
                    <EmptyState v-if="!profile.discussions.made.length && !profile.discussions.comments.length" icon="bi-people" title="No discussions" hint="This account has not opened or commented on any discussion." />
                </template>
            </div>

            <!-- ======================= SURVEYS ======================= -->
            <div v-if="isEdit && page === 'surveys'">
                <template v-if="profile">
                    <div class="rc-block" v-if="profile.surveys.made.length">
                        <div class="rc-block-title">opened by this account</div>
                        <div class="up-list">
                            <div v-for="p in profile.surveys.made" :key="p.id" class="up-card">
                                <div class="row items-center no-wrap q-gutter-x-sm">
                                    <b class="up-ref ellipsis">{{ p.question }}</b>
                                    <span class="rc-pill" :class="p.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ p.status }}</span>
                                    <q-space />
                                    <span class="up-when">{{ moment(p.createdAt).format('MMM DD, YYYY') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="rc-block" v-if="profile.surveys.answered.length">
                        <div class="rc-block-title">answered by this account</div>
                        <div class="up-list">
                            <div v-for="p in profile.surveys.answered" :key="p.pollId" class="up-card">
                                <div class="row items-center no-wrap q-gutter-x-sm">
                                    <b class="up-ref ellipsis">{{ p.question }}</b>
                                    <q-space />
                                    <span class="up-when">{{ moment(p.votedAt).format('MMM DD, YYYY') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <EmptyState v-if="!profile.surveys.made.length && !profile.surveys.answered.length" icon="bi-ui-checks" title="No surveys" hint="This account has not opened or answered any survey." />
                </template>
            </div>

            <!-- ======================= MANAGE: switch it on or off, and sign it out ======================= -->
            <div v-if="isEdit && page === 'manage' && current">
                <ManagePanel
                    what="account" :is-active="current.isActive"
                    modify-text="Change the name, username, password, photo, contact number, role and office. The Account and Access pages open once you press Modify."
                    :extra="manageExtra" @modify="startEditing" @disable="disableUser(current)" @enable="enableUser(current)" @action="onManageAction"
                >
                    <div class="rc-block">
                        <div class="rc-block-title">sign-in</div>
                        <div class="rc-facts">
                            <div class="rc-fact">
                                <span class="rc-ico rc-ico--teal"><q-icon name="bi-broadcast" size="16px" /></span>
                                <span class="rc-fact-text"><span class="rc-fact-label">Right now</span><span class="rc-fact-value">{{ profile?.account.isOnline ? 'Signed in and online' : 'Not signed in' }}</span></span>
                            </div>
                            <div class="rc-fact">
                                <span class="rc-ico rc-ico--blue"><q-icon name="bi-box-arrow-in-right" size="16px" /></span>
                                <span class="rc-fact-text"><span class="rc-fact-label">Last signed in</span><span class="rc-fact-value">{{ fmt(current.lastLoginAt) }}</span></span>
                            </div>
                            <div class="rc-fact">
                                <span class="rc-ico rc-ico--amber"><q-icon name="bi-key" size="16px" /></span>
                                <span class="rc-fact-text"><span class="rc-fact-label">Password</span><span class="rc-fact-value">{{ current.mustChangePassword ? 'Still the first one: they choose their own at the first sign-in' : 'Chosen by them' }}</span></span>
                            </div>
                        </div>
                    </div>
                </ManagePanel>
            </div>

            <div v-show="page === 'account'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This account is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <template v-else>
                    <div class="rc-block">
                        <div class="rc-block-title">photo<span class="rc-count">optional</span></div>
                        <div class="row items-center q-gutter-md">
                            <q-avatar size="64px" color="grey-3">
                                <img v-if="form.avatar && !avatarPreviewFailed" :src="photoUrl(form.avatar)" @error="avatarPreviewFailed = true">
                                <q-icon v-else name="bi-person-fill" size="32px" color="grey" />
                            </q-avatar>
                            <div style="flex: 1; min-width: 0;">
                                <FileDrop v-model="avatarFiles" :multiple="false" :show-list="false" title="Drag & drop a photo here" hint="a clear head-and-shoulders picture" :loading="avatarUploading" @picked="onAvatarPicked" />
                            </div>
                        </div>
                    </div>

                    <div class="rc-block">
                        <div class="rc-block-title">account information</div>
                        <div class="pf-grid pf-grid--2">
                            <div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.firstname.type }">{{ errors.firstname.type ? errors.firstname.message : 'first name' }}</div>
                                <q-input v-model="form.firstname" outlined placeholder="First name" :error="errors.firstname.type" no-error-icon hide-bottom-space />
                            </div>
                            <div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.lastname.type }">{{ errors.lastname.type ? errors.lastname.message : 'last name' }}</div>
                                <q-input v-model="form.lastname" outlined placeholder="Last name" :error="errors.lastname.type" no-error-icon hide-bottom-space />
                            </div>
                            <div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.username.type }">{{ errors.username.type ? errors.username.message : 'username' }}</div>
                                <q-input v-model="form.username" outlined placeholder="Username" :error="errors.username.type" no-error-icon hide-bottom-space />
                            </div>
                            <div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.phoneNo.type }">{{ errors.phoneNo.type ? errors.phoneNo.message : 'contact number (PH mobile)' }}</div>
                                <q-input v-model="form.phoneNo" outlined placeholder="09171234567" inputmode="tel" maxlength="16" :error="errors.phoneNo.type" no-error-icon hide-bottom-space>
                                    <template #prepend><q-icon name="bi-telephone" size="16px" /></template>
                                </q-input>
                            </div>
                            <div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.password.type }">{{ errors.password.type ? errors.password.message : (isEdit ? 'password (leave blank to keep it)' : 'password') }}</div>
                                <q-input v-model="form.password" type="password" outlined placeholder="Password" :error="errors.password.type" no-error-icon hide-bottom-space />
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            <div v-show="page === 'access'">
                <div v-if="isEdit && current && !current.isActive" class="rc-empty">
                    <q-icon name="bi-slash-circle" size="36px" />
                    <div class="rc-empty-t">This account is switched off</div>
                    <div class="rc-empty-d">Enable it from the panel on the right to change it again.</div>
                </div>
                <template v-else>
                    <div class="rc-block">
                        <div class="rc-cap" :class="{ 'rc-cap--bad': errors.role.type }">{{ errors.role.type ? errors.role.message : 'role' }}</div>
                        <div class="row items-center q-gutter-xs">
                            <q-btn
                                v-for="r in roleOptions" :key="r.value" no-caps unelevated rounded size="sm" :label="r.label"
                                class="up-chip" :class="form.role === r.value ? 'up-chip--active' : ''" @click="form.role = r.value"
                            />
                        </div>
                        <div class="text-caption text-grey q-mt-sm">{{ ROLE_NOTES[form.role] }}</div>
                    </div>

                    <div class="rc-block">
                        <div class="rc-cap" :class="{ 'rc-cap--bad': errors.officeId.type }">{{ errors.officeId.type ? errors.officeId.message : 'office' }}</div>
                        <div class="row items-center q-gutter-xs">
                            <q-btn
                                v-for="o in officeOptions" :key="o.value" no-caps unelevated rounded size="sm" :label="o.label"
                                class="up-chip" :class="form.officeId === o.value ? 'up-chip--active' : ''"
                                @click="form.officeId = form.officeId === o.value ? null : o.value"
                            />
                        </div>
                        <div class="text-caption text-grey q-mt-sm">{{ form.role === 'workstation' ? 'A workstation account needs an office: it only sees what is assigned to it.' : 'Only needed if this account also belongs to a specific office (for example a department admin).' }}</div>
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { api } from 'src/boot/axios';
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';
import PreferenceDialog from './PreferenceDialog.vue';
import { usePrefWizard } from 'src/composables/usePrefWizard';
import { toBars } from 'src/utils/prefBars';
import PreferenceRail from './PreferenceRail.vue';
import FileDrop from 'src/components/FileDrop.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ManagePanel from 'src/components/ManagePanel.vue';
import { esc } from 'src/utils/escape';
import RecordTrail from 'src/components/RecordTrail.vue';
import moment from 'moment';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2/dist/sweetalert2.js';

const PreferenceStore = usePreferenceStore();
const router = useRouter();

const rows = ref([]);

// Self-contained search and status filter — no pagination, the whole (already small) staff list
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
    return rows.value.filter(u => {
        if (statusFilter.value === 'active' && !u.isActive) return false;
        if (statusFilter.value === 'inactive' && u.isActive) return false;
        if (!term) return true;
        const name = `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase();
        return name.includes(term) ||
            (u.username || '').toLowerCase().includes(term) ||
            (u.office || '').toLowerCase().includes(term) ||
            (u.role || '').toLowerCase().includes(term);
    });
});

const counts = computed(() => ({
    total: rows.value.length,
    active: rows.value.filter(u => u.isActive).length,
    inactive: rows.value.filter(u => !u.isActive).length,
    noOffice: rows.value.filter(u => !u.office).length,
}));
const statusItems = computed(() => [
    { label: 'active', count: counts.value.active, color: 'positive' },
    { label: 'inactive', count: counts.value.inactive, color: 'grey-6' },
]);
const ROLE_COLORS = { super: 'primary', admin: 'info', workstation: 'positive', monitoring: 'grey-6' };
const roleItems = computed(() => ['super', 'admin', 'workstation', 'monitoring']
    .map(r => ({ label: r === 'super' ? 'super admin' : r, count: rows.value.filter(u => u.role === r).length, color: ROLE_COLORS[r] }))
    .filter(i => i.count));

// The row the open dialog is editing, read live from the list so Disable/Enable updates it in place.
const current = computed(() => rows.value.find(u => u.id === id.value) || null);
const openEdit = (u) => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = true;
    PreferenceStore.user = u;
};

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const roleOptions = [
    { label: 'Workstation', value: 'workstation' },
    { label: 'Admin', value: 'admin' },
    { label: 'Super Admin', value: 'super' },
    // Read-only oversight — can view everything a supervisor can (except this Office/User
    // preference page, which stays super-only) but never create/edit/close/reopen/respond/vote/
    // reassign anywhere. See middlewares/AuthMiddleware.js.
    { label: 'Monitoring', value: 'monitoring' },
];
const officeOptions = ref([]);

const id = ref(null);
const form = reactive({
    firstname: '',
    lastname: '',
    username: '',
    password: '',
    phoneNo: '',
    role: 'workstation',
    officeId: null,
    avatar: '',
});

// Same "path string, served from /uploads" convention MainLayout.vue's formatPhoto() already
// uses for any user's avatar — kept as one helper here since both the list and the dialog preview
// need it.
const photoUrl = (avatarPath) => `${process.env.VUE_APP_BACKEND_URL}${avatarPath}`;

const avatarFiles = ref([]);
const avatarUploading = ref(false);
const avatarPreviewFailed = ref(false);

// Upload-then-reference: pick a file, upload it immediately, get back a path, and just hold onto
// that path in the form — the actual create/update submit stays a plain JSON request.
const onAvatarPicked = async (file) => {
    if (!file) return;
    avatarPreviewFailed.value = false;
    avatarUploading.value = true;
    try {
        const body = new FormData();
        body.append('avatar', file);
        const response = await api.post('/preference/user/avatar', body);
        form.avatar = response.data.path;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        avatarFiles.value = [];
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'Unable to upload the photo.'}<div>
            `
        });
    } finally {
        avatarUploading.value = false;
    }
};

const errors = reactive({
    firstname: { type: false, message: '' },
    lastname: { type: false, message: '' },
    username: { type: false, message: '' },
    password: { type: false, message: '' },
    phoneNo: { type: false, message: '' },
    role: { type: false, message: '' },
    officeId: { type: false, message: '' },
});

// ---- the dialog: creating goes page by page (account, access, review); editing has the first two
const isEdit = computed(() => PreferenceStore.isEdit);
const namesOk = computed(() => !!form.firstname.trim() && !!form.lastname.trim());
const usernameOk = computed(() => !!form.username.trim());
const passwordOk = computed(() => isEdit.value || !!form.password);
// a Philippine mobile number: 09XXXXXXXXX, +639XXXXXXXXX or 639XXXXXXXXX (needed to create an account; an older one may have none)
const PH_MOBILE = /^(?:09|\+?639)\d{9}$/;
const phoneTyped = computed(() => form.phoneNo.replace(/[\s-]/g, ''));
const phoneOk = computed(() => (phoneTyped.value ? PH_MOBILE.test(phoneTyped.value) : isEdit.value));
const roleOk = computed(() => !!form.role);
// only a workstation account strictly needs an office (see UserValidator.js)
const officeOk = computed(() => form.role !== 'workstation' || !!form.officeId);
const stepDone = (key) => (key === 'account' ? namesOk.value && usernameOk.value && passwordOk.value && phoneOk.value : (key === 'access' ? roleOk.value && officeOk.value : true));
// an existing account opens on its overview, with what it did in each module, and Manage to switch it on or off
// The pages to change the account (Account, Access) are not there while it is only being looked at: Manage has Modify, and
// pressing it opens them. Everything else (switching it on or off, signing it out) is Manage too.
const editing = ref(false);
const VIEW_PAGES = ['overview', 'feedback', 'discussions', 'surveys', 'manage'];
// While it is being modified only the pages to modify it are there (no Overview, Manage...): Stop modifying goes back.
const ORDER = () => (isEdit.value ? (editing.value ? ['account', 'access'] : VIEW_PAGES) : ['account', 'access', 'review']);
const startEditing = () => { editing.value = true; wizard.go('account'); };
const stopEditing = () => { editing.value = false; wizard.go('manage'); };
const wizard = usePrefWizard({ order: ORDER, stepDone, isEdit, onBlocked: () => validate() });
const page = wizard.page;
const ROLE_NOTES = {
    workstation: 'Works on what is assigned to its own office: receives, replies, hands over, marks its part done.',
    admin: 'A supervisor: routes, completes, cancels and reopens feedback, and runs discussions and surveys.',
    super: 'Everything an admin does, plus the Office and User preferences.',
    monitoring: 'Reads everything an admin can, but never changes anything.',
};
const PAGE_INFO = {
    overview: { icon: 'bi-grid', bg: '#E5EEFC', fg: '#204888', title: 'The overview', hint: 'The account and every module at a glance.' },
    feedback: { icon: 'bi-chat-dots', bg: '#F1E8FC', fg: '#6B3FB0', title: 'Their feedback', hint: 'The feedback this account answered.' },
    discussions: { icon: 'bi-people', bg: '#E4F6EA', fg: '#1C8A3B', title: 'Their discussions', hint: 'The discussions it opened and commented on.' },
    surveys: { icon: 'bi-ui-checks', bg: '#FFF4DB', fg: '#8A5B00', title: 'Their surveys', hint: 'The surveys it opened and answered.' },
    manage: { icon: 'bi-toggles', bg: '#FCE8E6', fg: '#A52E22', title: 'Manage it', hint: 'Switch the account on or off, and sign it out.' },
    account: { icon: 'bi-person', bg: '#E5EEFC', fg: '#204888', title: 'The account', hint: 'Who it is, and how they sign in.' },
    access: { icon: 'bi-shield-check', bg: '#E4F6EA', fg: '#1C8A3B', title: 'Their access', hint: 'What they can do, and which office they belong to.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const accountError = computed(() => errors.firstname.type || errors.lastname.type || errors.username.type || errors.password.type || errors.phoneNo.type);
const accessError = computed(() => errors.role.type || errors.officeId.type);
const PAGE_ICON = { overview: 'bi-grid', feedback: 'bi-chat-dots', discussions: 'bi-people', surveys: 'bi-ui-checks', account: 'bi-person', access: 'bi-shield-check', manage: 'bi-toggles', review: 'bi-clipboard-check' };
const PAGE_COUNT = computed(() => ({
    feedback: profile.value?.summary.feedback.replied || 0,
    discussions: (profile.value?.summary.discussions.made || 0) + (profile.value?.summary.discussions.comments || 0),
    surveys: (profile.value?.summary.surveys.made || 0) + (profile.value?.summary.surveys.answered || 0),
}));
const pages = computed(() => ORDER().map(key => ({
    key, open: wizard.isOpen(key),
    icon: PAGE_ICON[key], label: PAGE_COUNT.value[key] ? `${key} (${PAGE_COUNT.value[key]})` : key,
    state: key === 'account' ? (accountError.value ? 'bad' : (stepDone('account') ? 'ok' : '')) : (key === 'access' ? (accessError.value ? 'bad' : (stepDone('access') && form.role ? 'ok' : '')) : ''),
})));
const checks = computed(() => [
    { key: 'names', page: 'account', required: true, ok: namesOk.value, title: 'First and last name', detail: namesOk.value ? `${form.firstname.trim()} ${form.lastname.trim()}` : 'Both are needed.' },
    { key: 'username', page: 'account', required: true, ok: usernameOk.value, title: 'A username', detail: usernameOk.value ? form.username.trim() : 'What they sign in with.' },
    { key: 'phone', page: 'account', required: !isEdit.value, ok: phoneOk.value && !!phoneTyped.value, title: 'A contact number', detail: phoneTyped.value ? (phoneOk.value ? form.phoneNo.trim() : 'A Philippine mobile number, like 09171234567.') : (isEdit.value ? 'Optional for an older account.' : 'A Philippine mobile number, like 09171234567.') },
    { key: 'password', page: 'account', required: !isEdit.value, ok: isEdit.value ? true : !!form.password, title: 'A password', detail: isEdit.value ? (form.password ? 'It will be changed.' : 'Left blank: the current one stays.') : (form.password ? 'Set.' : 'Required for a new account.') },
    { key: 'role', page: 'access', required: true, ok: roleOk.value, title: 'A role', detail: roleOptions.find(r => r.value === form.role)?.label || 'Choose one.' },
    { key: 'office', page: 'access', required: form.role === 'workstation', ok: !!form.officeId, title: 'An office', detail: form.officeId ? (officeOptions.value.find(o => o.value === form.officeId)?.label || '') : (form.role === 'workstation' ? 'Required for a workstation account.' : 'Optional.') },
    { key: 'photo', page: 'account', required: false, ok: !!form.avatar, title: 'A photo', detail: form.avatar ? 'Uploaded.' : 'Optional.' },
]);
const problems = computed(() => (accountError.value || accessError.value ? [
    ...(!namesOk.value ? ['Give the first and last name.'] : []),
    ...(!usernameOk.value ? ['Give a username.'] : []),
    ...(!phoneOk.value ? ['Give a Philippine mobile number, like 09171234567.'] : []),
    ...(!passwordOk.value ? ['Give a password.'] : []),
    ...(!officeOk.value ? ['A workstation account needs an office.'] : []),
] : []));
const reviewFacts = computed(() => [
    { label: 'Name', value: `${form.firstname} ${form.lastname}`.trim(), icon: 'bi-person', tone: 'blue', page: 'account' },
    { label: 'Username', value: form.username, icon: 'bi-at', tone: 'teal', page: 'account' },
    { label: 'Contact number', value: form.phoneNo, icon: 'bi-telephone', tone: 'blue', page: 'account' },
    { label: 'Password', value: form.password ? '••••••••' : '', icon: 'bi-key', tone: 'amber', page: 'account' },
    { label: 'Role', value: roleOptions.find(r => r.value === form.role)?.label || '', icon: 'bi-shield-check', tone: 'purple', page: 'access' },
    { label: 'Office', value: officeOptions.value.find(o => o.value === form.officeId)?.label || '', icon: 'bi-building', tone: 'red', page: 'access' },
    { label: 'Photo', value: form.avatar ? 'uploaded' : '', icon: 'bi-camera', tone: 'teal', page: 'account' },
]);
const pills = computed(() => (isEdit.value && current.value
    ? [{ label: current.value.isActive ? 'active' : 'inactive', on: true }, { label: current.value.role }, { label: current.value.office || 'no office' }].filter(p => p.label)
    : [{ label: 'new', on: true }]));
const submitDisabled = computed(() => (isEdit.value ? !editing.value || (!!current.value && !current.value.isActive) : page.value !== 'review'));
const submitHint = computed(() => (isEdit.value ? 'Enable it first.' : 'Go through the steps first: it is created from the review.'));
watch(form, () => { if (accountError.value || accessError.value) validate(); }, { deep: true });

// workstation accounts with no office: they have nothing to work on
const stranded = computed(() => rows.value.filter(u => u.role === 'workstation' && !u.office));

// Validate the form inputs
const validate = () => {
    errors.firstname.type = !form.firstname;
    errors.lastname.type = !form.lastname;
    errors.username.type = !form.username;
    errors.password.type = !PreferenceStore.isEdit && !form.password;
    errors.phoneNo.type = !phoneOk.value;
    errors.role.type = !form.role;
    // Only workstation strictly requires an office — see UserValidator.js for why (a
    // workstation account with no office is locked out everywhere else in this app).
    errors.officeId.type = form.role === 'workstation' && !form.officeId;

    errors.firstname.message = errors.firstname.type ? 'First name is required.' : '';
    errors.lastname.message = errors.lastname.type ? 'Last name is required.' : '';
    errors.username.message = errors.username.type ? 'Username is required.' : '';
    errors.password.message = errors.password.type ? 'Password is required.' : '';
    errors.phoneNo.message = errors.phoneNo.type ? (phoneTyped.value ? 'Give a Philippine mobile number, like 09171234567.' : 'Contact number is required.') : '';
    errors.role.message = errors.role.type ? 'Role is required.' : '';
    errors.officeId.message = errors.officeId.type ? 'Office is required for a workstation account.' : '';

    return !errors.firstname.type &&
           !errors.lastname.type &&
           !errors.username.type &&
           !errors.password.type &&
           !errors.phoneNo.type &&
           !errors.role.type &&
           !errors.officeId.type;
};

// Fetch the list of users
const fetchUsers = async (opts = {}) => {
    if (!opts?.quiet) PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/user');
        rows.value = response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while fetching user preferences.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoadingTable = false;
    }
};

// Office select needs the full office list, not just the ones already assigned to someone
const fetchOffices = async () => {
    try {
        const response = await api.get('/preference/office');
        officeOptions.value = (response.data || []).map(o => ({ label: o.alias || o.name, value: o.id }));
    } catch (error) {
        console.error('Error fetching offices for the user form:', error);
    }
};

// someone else changing this list shows here without pressing refresh
useLiveRefresh(['user'], () => fetchUsers({ quiet: true }));

onMounted(() => {
    fetchUsers();
    fetchOffices();
});

// ---- what the account did in each module (the overview, feedback, discussions and surveys pages)
const profile = ref(null);
const loadingProfile = ref(false);
const loadProfile = async (userId) => {
    loadingProfile.value = true;
    try {
        const { data } = await api.get(`/preference/user/${userId}/profile`);
        if (id.value === userId) profile.value = data;
    } catch (error) {
        console.error('Error fetching the account:', error);
    } finally {
        loadingProfile.value = false;
    }
};
const fmt = (v) => (v ? `${moment(v).format('MMM DD, YYYY hh:mm A')} (${moment(v).fromNow()})` : 'Never');
const STATUS_TONE = { completed: 'ok', cancelled: 'off', ongoing: 'info', pending: 'warn', unassigned: 'warn', verified: 'info', unverified: 'off' };
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const tiles = computed(() => {
    const s = profile.value?.summary;
    if (!s) return [];
    return [
        { page: 'feedback', label: 'feedback', value: s.feedback.replied, sub: `${s.feedback.replies} repl${s.feedback.replies === 1 ? 'y' : 'ies'} · ${s.feedback.completed} done${s.feedback.ratingAvg != null ? ` · ${s.feedback.ratingAvg}/5` : ''}`, icon: 'bi-chat-dots', tone: 'purple' },
        { page: 'discussions', label: 'discussions', value: s.discussions.made + s.discussions.comments, sub: `${s.discussions.made} opened · ${s.discussions.comments} comments`, icon: 'bi-people', tone: 'teal' },
        { page: 'surveys', label: 'surveys', value: s.surveys.made + s.surveys.answered, sub: `${s.surveys.made} opened · ${s.surveys.answered} answered`, icon: 'bi-ui-checks', tone: 'amber' },
        { page: 'manage', label: 'messages', value: s.messages.sent + s.messages.received, sub: `${s.messages.sent} sent · ${s.messages.received} received`, icon: 'bi-chat-square-text', tone: 'blue' },
    ];
});
const factRows = computed(() => {
    const a = profile.value?.account;
    if (!a) return [];
    return [
        { label: 'Name', value: `${a.firstname} ${a.lastname}`.trim(), icon: 'bi-person', tone: 'blue' },
        { label: 'Username', value: a.username, icon: 'bi-at', tone: 'teal' },
        { label: 'Contact number', value: a.phoneNo || 'Not on record', icon: 'bi-telephone', tone: 'blue' },
        { label: 'Role', value: ROLE_LABELS[a.role] || a.role, icon: 'bi-shield-check', tone: 'purple' },
        { label: 'Office', value: a.office || 'No office', icon: 'bi-building', tone: 'red' },
        { label: 'Last signed in', value: fmt(a.lastLoginAt), icon: 'bi-box-arrow-in-right', tone: 'amber' },
        { label: 'In the system since', value: moment(a.createdAt).format('MMM DD, YYYY'), icon: 'bi-calendar-check', tone: 'teal' },
    ];
});
// the other things to do with an account, as cards next to Modify and Disable
const manageExtra = computed(() => [
    { key: 'messages', label: 'Message them', hint: 'Open the conversation with this account on the Messages page.', icon: 'bi-chat-dots', bg: '#E4F6EA', color: '#1C8A3B' },
    {
        key: 'logout', label: 'Force logout', hint: 'Sign them out everywhere at once. They can sign in again.', icon: 'bi-box-arrow-right', bg: '#FFF4DB', color: '#8A5B00',
        disabled: !profile.value?.account.isOnline, disabledHint: 'They are not signed in right now.',
    },
]);
const onManageAction = (key) => { if (key === 'messages') openMessages(); else if (key === 'logout') forceLogout(); };
// the details in the panel on the right while the account is only being looked at
const trailSubline = computed(() => [ROLE_LABELS[current.value?.role] || current.value?.role, current.value?.office].filter(Boolean).join(' · '));
const trailStatus = computed(() => (current.value?.isActive ? { label: 'active', tone: 'ok' } : { label: 'inactive', tone: 'off' }));
const trailFacts = computed(() => {
    const u = current.value;
    if (!u) return [];
    return [
        { label: 'Username', value: u.username, icon: 'bi-at' },
        { label: 'Contact', value: u.phoneNo || 'Not on record', icon: 'bi-telephone', dim: !u.phoneNo },
        { label: 'Signed in', value: u.lastLoginAt ? moment(u.lastLoginAt).fromNow() : 'Never', icon: 'bi-box-arrow-in-right', dim: !u.lastLoginAt },
        { label: 'Password', value: u.mustChangePassword ? 'Still the first one' : 'Their own', icon: 'bi-key' },
        { label: 'Messages', value: profile.value ? `${profile.value.summary.messages.sent + profile.value.summary.messages.received}` : '…', icon: 'bi-chat-dots' },
    ];
});
const openMessages = () => {
    PreferenceStore.dialog = false;
    router.push({ name: 'message', query: { user: id.value } });
};
const forcing = ref(false);
const forceLogout = async () => {
    const u = current.value;
    if (!u) return;
    const result = await Swal.fire({
        title: 'Confirm',
        html: `Force-logout <b class="text-capitalize">${esc(u.firstname)} ${esc(u.lastname)}</b>? They'll be signed out everywhere immediately.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'confirm', cancelButtonText: 'cancel', reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    forcing.value = true;
    try {
        const { data } = await api.post(`/team/${u.id}/force-logout`);
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">done!</div><div class="text-caption">${data.message}</div>` });
        loadProfile(u.id);
    } catch (error) {
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to force-logout this account.'}</div>` });
    } finally {
        forcing.value = false;
    }
};

// Open the dialog for creating or editing a user
const openDialog = (user) => {
    editing.value = false;
    wizard.reset();
    if (PreferenceStore.isEdit && user) {
        id.value = user.id;
        form.firstname = user.firstname || '';
        form.lastname = user.lastname || '';
        form.username = user.username || '';
        form.password = ''; // never pre-fill — leaving it blank means "keep current"
        form.phoneNo = user.phoneNo || '';
        form.role = user.role || 'workstation';
        form.officeId = user.officeId || null;
        form.avatar = user.avatar || '';
    } else {
        id.value = null;
        form.firstname = '';
        form.lastname = '';
        form.username = '';
        form.password = '';
        form.phoneNo = '';
        form.role = 'workstation';
        form.officeId = null;
        form.avatar = '';
    }
    profile.value = null;
    if (PreferenceStore.isEdit && user) loadProfile(user.id);
    avatarFiles.value = [];
    avatarPreviewFailed.value = false;
    errors.firstname.type = false;
    errors.lastname.type = false;
    errors.username.type = false;
    errors.password.type = false;
    errors.phoneNo.type = false;
    errors.role.type = false;
    errors.officeId.type = false;
};

// Save the form data
const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/user/${id.value}/update`, form)
            : await api.post('/preference/user', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        if (id.value) {
            updateRows(id.value, response.data.user);
        } else {
            rows.value.unshift(response.data.user);
        }
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error saving data:', error);
        const message = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'An error occurred while saving the user.';
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${message}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Disable a user
const disableUser = async (user) => {
    id.value = user.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/user/${user.id}/disable`);
        updateRows(user.id, response.data.user);
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling user:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'An error occurred while disabling the user.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Enable a user
const enableUser = async (user) => {
    id.value = user.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/user/${user.id}/enable`);
        updateRows(user.id, response.data.user);
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling user:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'An error occurred while enabling the user.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Update a row in place after save/disable/enable
const updateRows = (rowId, data) => {
    const index = rows.value.findIndex(u => u.id === rowId);
    if (index !== -1) {
        Object.assign(rows.value[index], data);
    }
};
</script>

<style scoped>
.up-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.up-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.up-tag { font-size: 10px; letter-spacing: .04em; }
.up-tile { text-align: left; cursor: pointer; font: inherit; }
.up-tile:hover { border-color: #B8C6DD; background: #F2F7FF; }
.up-list { display: flex; flex-direction: column; gap: 10px; }
.up-card { border: 1px solid #E6ECF5; border-radius: 12px; padding: 12px 14px; background: #fff; }
.up-ref { font-size: 13px; min-width: 0; }
.up-when { font-size: 11.5px; color: #8493AC; white-space: nowrap; }
.up-text { margin-top: 8px; font-size: 13px; line-height: 1.5; color: #16233A; overflow-wrap: anywhere; }
.up-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; font-size: 11.5px; color: #8493AC; }
.up-act { cursor: default; }
</style>
