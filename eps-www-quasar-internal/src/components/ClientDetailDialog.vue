<template>
    <PreferenceDialog
        :model-value="modelValue" eyebrow="client account" :title="client ? fullName : ''"
        :pills="pills" :pages="pages" :page="page" :info="info" :checks="checks" :problems="[]"
        :is-edit="true" readonly :submit-label="client && client.sentCount ? 'send details again' : 'send account details'"
        :submit-disabled="!client || !client.isActive" submit-hint="This account is switched off."
        :loading="sending" @update:model-value="v => emit('update:modelValue', v)"
        @go="key => page = key" @step="stepBy" @submit="emit('send')"
    >
        <template #readonly-rail>
            <RecordTrail
                v-if="client" module="client" link-text="Send their account details in" :entity-id="client.id" :created-at="profile?.account.createdAt || ''"
                icon="bi-person" :headline="fullName" :subline="client.email" :status="trailStatus" :facts="trailFacts" @manage="page = 'manage'"
            />
        </template>

        <q-inner-loading :showing="loadingProfile && !profile"><q-spinner-ios color="primary" size="md" /></q-inner-loading>

        <template v-if="profile">
            <!-- OVERVIEW: the account and the modules at a glance -->
            <template v-if="page === 'overview'">
                <div class="rc-block">
                    <div class="rc-block-title">the modules</div>
                    <div class="rc-tiles">
                        <button v-for="t in tiles" :key="t.page" type="button" class="rc-tile cl-tile" @click="page = t.page">
                            <span class="rc-ico" :class="`rc-ico--${t.tone}`"><q-icon :name="t.icon" size="18px" /></span>
                            <span class="rc-tile-text"><span class="rc-tile-label">{{ t.label }}</span><span class="rc-tile-value">{{ t.value }}</span><span class="rc-tile-sub">{{ t.sub }}</span></span>
                        </button>
                    </div>
                </div>

                <div class="rc-block">
                    <div class="rc-block-title">the account</div>
                    <div class="rc-facts">
                        <div v-for="row in factRows.slice(0, 4)" :key="row.label" class="rc-fact">
                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                            <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                        </div>
                    </div>
                </div>

                <div class="rc-block">
                    <div class="rc-block-title">latest activity</div>
                    <template v-if="activity.length">
                        <div v-for="(a, i) in activity" :key="i" class="pf-next" @click="a.page && (page = a.page)">
                            <span class="pf-next-date"><q-icon :name="a.icon" size="18px" /></span>
                            <span class="pf-next-text"><b>{{ a.title }}</b><small>{{ a.sub }} &middot; {{ moment(a.at).fromNow() }}</small></span>
                        </div>
                    </template>
                    <EmptyState v-else compact icon="bi-clock-history" title="No activity yet" hint="What this client files, says, answers or rates shows here." />
                </div>
            </template>

            <!-- FEEDBACK -->
            <template v-else-if="page === 'feedback'">
                <div v-if="profile.feedback.length" class="cl-list">
                    <div v-for="f in profile.feedback" :key="f.id" class="cl-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="cl-ref">{{ f.referenceNo }}</b>
                            <span class="rc-pill" :class="`rc-pill--${STATUS_TONE[f.status] || 'off'}`">{{ f.status }}</span>
                            <q-space />
                            <span v-if="f.ratingCount" class="rc-pill rc-pill--info"><q-icon name="bi-star-fill" size="11px" /> {{ f.ratingAvg }} / 5<q-tooltip>They rated {{ f.ratingCount }} response{{ f.ratingCount === 1 ? '' : 's' }} on this feedback.</q-tooltip></span>
                            <span v-else class="rc-pill rc-pill--off">not rated</span>
                        </div>
                        <div class="cl-text">{{ f.content }}</div>
                        <div class="cl-meta">
                            <span><q-icon name="bi-calendar-event" size="12px" /> {{ moment(f.createdAt).format('MMM DD, YYYY') }}</span>
                            <span v-if="f.offices.length"><q-icon name="bi-building" size="12px" /> {{ f.offices.map(o => o.alias).join(', ') }}</span>
                            <span><q-icon name="bi-chat-dots" size="12px" /> {{ f.fromOffices }} from offices<template v-if="f.followUps"> &middot; {{ f.followUps }} follow-up{{ f.followUps === 1 ? '' : 's' }} from them</template></span>
                            <span v-if="f.completedAt"><q-icon name="bi-check2-circle" size="12px" /> done {{ moment(f.completedAt).format('MMM DD, YYYY') }}</span>
                            <span v-if="f.via !== 'account'"><q-icon name="bi-person-lines-fill" size="12px" /> {{ VIA[f.via] || f.via }}</span>
                        </div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-chat-dots" title="No feedback" hint="They have not filed any feedback." />
            </template>

            <!-- DISCUSSIONS -->
            <template v-else-if="page === 'discussions'">
                <div v-if="profile.discussions.length" class="cl-list">
                    <div v-for="c in profile.discussions" :key="c.id" class="cl-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="cl-ref ellipsis">{{ c.title }}</b>
                            <span class="rc-pill" :class="c.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ c.status }}</span>
                            <q-space />
                            <span class="cl-when">{{ moment(c.createdAt).format('MMM DD, YYYY') }}</span>
                        </div>
                        <div class="cl-text">{{ c.content }}</div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-people" title="No discussions" hint="They have not commented on any discussion." />
            </template>

            <!-- SURVEYS -->
            <template v-else-if="page === 'surveys'">
                <div v-if="profile.surveys.length" class="cl-list">
                    <div v-for="p in profile.surveys" :key="p.pollId" class="cl-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="cl-ref ellipsis">{{ p.question }}</b>
                            <span class="rc-pill" :class="p.status === 'open' ? 'rc-pill--ok' : 'rc-pill--off'">{{ p.status }}</span>
                            <q-space />
                            <span class="cl-when">{{ moment(p.votedAt).format('MMM DD, YYYY') }}</span>
                        </div>
                        <div class="cl-meta"><span><q-icon name="bi-check2-square" size="12px" /> answered, {{ p.votes }} choice{{ p.votes === 1 ? '' : 's' }} recorded</span></div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-ui-checks" title="No surveys" hint="They have not answered any survey." />
            </template>

            <!-- CSM REPORTS -->
            <template v-else-if="page === 'csm'">
                <div v-if="profile.csm.length" class="cl-list">
                    <div v-for="k in profile.csm" :key="k.id" class="cl-card">
                        <div class="row items-center no-wrap q-gutter-x-sm">
                            <b class="cl-ref">{{ k.office }}</b>
                            <span class="rc-pill rc-pill--info">{{ k.entryFrom }}</span>
                            <q-space />
                            <span class="rc-pill rc-pill--info">{{ k.satisfaction }}% satisfied</span>
                        </div>
                        <div v-if="k.serviceAvailed" class="cl-text">{{ k.serviceAvailed }}</div>
                        <div v-if="k.suggestion" class="cl-text cl-text--quote">&ldquo;{{ k.suggestion }}&rdquo;</div>
                        <div class="cl-meta"><span><q-icon name="bi-calendar-event" size="12px" /> {{ moment(k.date).format('MMM DD, YYYY') }}</span></div>
                    </div>
                </div>
                <EmptyState v-else icon="bi-clipboard-data" title="No CSM reports" hint="No CSM report was filled in with this client's email address." />
            </template>

            <!-- MANAGE -->
            <template v-else>
                <ManageActions :title="`What would you like to do with ${fullName}?`" :actions="manageActions" @pick="onManage" />

                <div class="rc-block q-mt-lg">
                    <div class="rc-block-title">the account</div>
                    <div class="rc-facts">
                        <div v-for="row in factRows" :key="row.label" class="rc-fact">
                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                            <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                        </div>
                    </div>
                    <div v-if="client && client.lastError" class="cc-note"><q-icon name="bi-exclamation-triangle" size="16px" /><span>The last try failed: {{ client.lastError }}</span></div>
                    <div class="cc-note"><q-icon name="bi-info-circle" size="16px" /><span>Sending makes a new temporary password, so a password sent before stops working. The client chooses their own at the first login.</span></div>
                </div>

                <div class="rc-block">
                    <div class="rc-block-title">details sent</div>
                    <template v-if="profile.invites.length">
                        <div v-for="i in profile.invites" :key="i.id" class="pf-next cl-inv">
                            <span class="pf-next-date"><q-icon :name="i.status === 'sent' ? 'bi-send-check' : 'bi-send-x'" size="18px" /></span>
                            <span class="pf-next-text"><b>{{ i.status === 'sent' ? 'Emailed' : 'Could not be sent' }}</b><small>{{ fmt(i.createdAt) }}<template v-if="i.error"> &middot; {{ i.error }}</template></small></span>
                        </div>
                    </template>
                    <EmptyState v-else compact icon="bi-envelope" title="Nothing sent yet" hint="Their account details have not been emailed." />
                </div>
            </template>
        </template>
    </PreferenceDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';
import PreferenceDialog from './PreferenceDialog.vue';
import EmptyState from './EmptyState.vue';
import ManageActions from './ManageActions.vue';
import RecordTrail from './RecordTrail.vue';

// One client on the Client accounts page: the account and everything they did in the system, page by page: an overview,
// their feedback, discussions, surveys and CSM reports, and the account itself (sending their details).
//   client   the row of the list (its status and how the sending went)
//   sending  the details are being emailed
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    client: { type: Object, default: null },
    sending: { type: Boolean, default: false },
    statusLabel: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'send']);

const profile = ref(null);
const loadingProfile = ref(false);
const page = ref('overview');

const load = async (quiet = false) => {
    if (!props.client) return;
    if (!quiet) loadingProfile.value = true;
    try {
        const { data } = await api.get(`/preference/clients/${props.client.id}`);
        profile.value = data;
    } catch (error) {
        console.error('Error fetching the client:', error);
    } finally {
        loadingProfile.value = false;
    }
};
// opening a client starts on the overview, with nothing of the one before
watch(() => [props.modelValue, props.client?.id], ([open, id], [wasOpen, wasId]) => {
    if (!open) return;
    if (!wasOpen || id !== wasId) { profile.value = null; page.value = 'overview'; load(); }
});
// the list refreshing (a send finished, a client signed in) refreshes this too
watch(() => props.client, () => { if (props.modelValue) load(true); });

const fullName = computed(() => `${props.client?.firstname || ''} ${props.client?.lastname || ''}`.trim() || props.client?.email || '');
const summary = computed(() => profile.value?.summary || null);
const fmt = (v) => (v ? moment(v).format('MMM DD, YYYY hh:mm A') : 'Never');

const VIA = { staff: 'filed by staff', otp: 'as a guest' };
const STATUS_TONE = { completed: 'ok', cancelled: 'off', ongoing: 'info', pending: 'warn', unassigned: 'warn', verified: 'info', unverified: 'off' };

// ---- pages
const count = (n) => (n ? ` (${n})` : '');
const pages = computed(() => {
    const s = summary.value;
    return [
        { key: 'overview', open: true, icon: 'bi-grid', label: 'overview', state: '' },
        { key: 'feedback', open: true, icon: 'bi-chat-dots', label: `feedback${count(s?.feedback.total)}`, state: '' },
        { key: 'discussions', open: true, icon: 'bi-people', label: `discussions${count(s?.discussions)}`, state: '' },
        { key: 'surveys', open: true, icon: 'bi-ui-checks', label: `surveys${count(s?.surveys)}`, state: '' },
        { key: 'csm', open: true, icon: 'bi-clipboard-data', label: `CSM reports${count(s?.csm.total)}`, state: '' },
        { key: 'manage', open: true, icon: 'bi-toggles', label: 'manage', state: '' },
    ];
});
const INFOS = {
    overview: { icon: 'bi-grid', bg: '#E5EEFC', fg: '#204888', title: 'The overview', hint: 'The account and every module at a glance.' },
    feedback: { icon: 'bi-chat-dots', bg: '#F1E8FC', fg: '#6B3FB0', title: 'Their feedback', hint: 'Everything they filed, and how they rated the answers.' },
    discussions: { icon: 'bi-people', bg: '#E4F6EA', fg: '#1C8A3B', title: 'Their discussions', hint: 'The discussions they commented on.' },
    surveys: { icon: 'bi-ui-checks', bg: '#FFF4DB', fg: '#8A5B00', title: 'Their surveys', hint: 'The surveys they answered.' },
    csm: { icon: 'bi-clipboard-data', bg: '#FCE8E6', fg: '#A52E22', title: 'Their CSM reports', hint: 'The reports filled in with their email address.' },
    manage: { icon: 'bi-toggles', bg: '#FCE8E6', fg: '#A52E22', title: 'Manage it', hint: 'Where this client stands, and sending their details.' },
};
const info = computed(() => INFOS[page.value] || INFOS.overview);
const stepBy = (dir) => {
    const keys = pages.value.map(p => p.key);
    const next = keys[keys.indexOf(page.value) + dir];
    if (next) page.value = next;
};

// ---- the header, the rail and the overview
const pills = computed(() => {
    if (!props.client) return [];
    return [{ label: props.statusLabel, on: true }, { label: `${props.client.feedbackCount} feedback` }];
});
const tiles = computed(() => {
    const s = summary.value;
    if (!s) return [];
    return [
        { page: 'feedback', label: 'feedback', value: s.feedback.total, sub: `${s.feedback.open} open · ${s.feedback.completed} done${s.feedback.ratingAvg != null ? ` · ${s.feedback.ratingAvg}/5` : ''}`, icon: 'bi-chat-dots', tone: 'purple' },
        { page: 'discussions', label: 'discussions', value: s.discussions, sub: s.discussions ? `in ${s.discussionsJoined} discussion${s.discussionsJoined === 1 ? '' : 's'}` : 'none yet', icon: 'bi-people', tone: 'teal' },
        { page: 'surveys', label: 'surveys', value: s.surveys, sub: s.surveys ? 'answered' : 'none yet', icon: 'bi-ui-checks', tone: 'amber' },
        { page: 'csm', label: 'CSM reports', value: s.csm.total, sub: s.csm.satisfactionAvg != null ? `${s.csm.satisfactionAvg}% satisfied` : 'none yet', icon: 'bi-clipboard-data', tone: 'red' },
    ];
});
const activity = computed(() => {
    const p = profile.value;
    if (!p) return [];
    const items = [
        ...p.feedback.map(f => ({ at: f.createdAt, icon: 'bi-chat-dots', title: `Filed ${f.referenceNo}`, sub: f.status, page: 'feedback' })),
        ...p.discussions.map(c => ({ at: c.createdAt, icon: 'bi-people', title: `Commented on "${c.title}"`, sub: 'discussion', page: 'discussions' })),
        ...p.surveys.map(s => ({ at: s.votedAt, icon: 'bi-ui-checks', title: `Answered "${s.question}"`, sub: 'survey', page: 'surveys' })),
        ...p.csm.map(k => ({ at: k.date, icon: 'bi-clipboard-data', title: `CSM report for ${k.office}`, sub: `${k.satisfaction}% satisfied`, page: 'csm' })),
        ...p.invites.filter(i => i.status === 'sent').map(i => ({ at: i.createdAt, icon: 'bi-send-check', title: 'Account details emailed', sub: 'account', page: 'manage' })),
    ];
    if (p.account.lastLoginAt) items.push({ at: p.account.lastLoginAt, icon: 'bi-box-arrow-in-right', title: 'Signed in', sub: 'account', page: 'manage' });
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
});

// the details in the panel on the right
const STATUS_TONE_CLIENT = { new: 'off', sent: 'info', signed_in: 'ok', failed: 'bad' };
const trailStatus = computed(() => (props.client ? { label: props.statusLabel, tone: STATUS_TONE_CLIENT[props.client.status] || 'off' } : null));
const trailFacts = computed(() => {
    const c = props.client;
    if (!c) return [];
    return [
        { label: 'Contact', value: c.phoneNo || 'Not on record', icon: 'bi-telephone', dim: !c.phoneNo },
        { label: 'Feedback', value: String(c.feedbackCount), icon: 'bi-chat-dots' },
        { label: 'Details sent', value: c.sentCount ? `${c.sentCount} time${c.sentCount === 1 ? '' : 's'}, ${moment(c.lastSentAt).fromNow()}` : 'Not yet', icon: 'bi-send', dim: !c.sentCount },
        { label: 'Signed in', value: c.lastLoginAt ? moment(c.lastLoginAt).fromNow() : 'Never', icon: 'bi-box-arrow-in-right', dim: !c.lastLoginAt },
        { label: 'Password', value: c.mustChangePassword ? 'Still the temporary one' : 'Their own', icon: 'bi-key' },
    ];
});

// ---- manage: sending the account details is the one thing to do with a client
const manageActions = computed(() => {
    const c = props.client;
    const again = !!c?.sentCount;
    return [{
        key: 'send', label: again ? 'Send the details again' : 'Send the account details', icon: 'bi-send', bg: '#E4F6EA', color: '#1C8A3B',
        hint: again
            ? 'A new temporary password is emailed. The one sent before stops working.'
            : 'A temporary password is emailed with their address. They choose their own at the first sign-in.',
        disabled: !c || !c.isActive, disabledHint: 'This account is switched off.',
    }];
});
const onManage = (key) => { if (key === 'send') emit('send'); };

// ---- the account
const factRows = computed(() => {
    const c = props.client;
    const a = profile.value?.account;
    if (!c || !a) return [];
    return [
        { label: 'Name', value: fullName.value, icon: 'bi-person', tone: 'blue' },
        { label: 'Email (their username)', value: a.email, icon: 'bi-envelope', tone: 'red' },
        { label: 'Phone', value: a.phoneNo || 'Not on record', icon: 'bi-telephone', tone: 'teal' },
        { label: 'In the system since', value: moment(a.createdAt).format('MMM DD, YYYY'), icon: 'bi-calendar-check', tone: 'purple' },
        { label: 'Last details sent', value: fmt(c.lastSentAt), icon: 'bi-send', tone: 'amber' },
        { label: 'Last signed in', value: fmt(a.lastLoginAt), icon: 'bi-box-arrow-in-right', tone: 'blue' },
        { label: 'Password', value: a.mustChangePassword ? 'Still the temporary one' : 'Chosen by them', icon: 'bi-key', tone: a.mustChangePassword ? 'amber' : 'teal' },
        { label: 'Mobile app', value: a.devices.length ? a.devices.map(d => d.platform).join(', ') : 'Not used', icon: 'bi-phone', tone: 'blue' },
        { label: 'Notifications', value: `${a.notifications} in all, ${a.unreadNotifications} unread`, icon: 'bi-bell', tone: 'red' },
    ];
});
const checks = computed(() => {
    const c = props.client;
    if (!c) return [];
    return [
        { key: 'sent', page: 'manage', required: false, ok: c.sentCount > 0, title: 'Details sent', detail: c.sentCount ? `${c.sentCount} time${c.sentCount === 1 ? '' : 's'}, last ${fmt(c.lastSentAt)}.` : 'Not sent yet.' },
        { key: 'in', page: 'manage', required: false, ok: c.status === 'signed_in', title: 'Signed in', detail: c.status === 'signed_in' ? `Last ${fmt(c.lastLoginAt)}.` : 'Not since the details were sent.' },
        { key: 'own', page: 'manage', required: false, ok: c.sentCount > 0 && !c.mustChangePassword, title: 'Chose their own password', detail: c.sentCount && !c.mustChangePassword ? 'Done.' : 'Not yet.' },
    ];
});
</script>

<style scoped>
.cl-tile { text-align: left; cursor: pointer; font: inherit; }
.cl-tile:hover { border-color: #B8C6DD; background: #F2F7FF; }
.cl-list { display: flex; flex-direction: column; gap: 10px; }
.cl-card { border: 1px solid #E6ECF5; border-radius: 12px; padding: 12px 14px; background: #fff; }
.cl-ref { font-size: 13px; min-width: 0; }
.cl-when { font-size: 11.5px; color: #8493AC; white-space: nowrap; }
.cl-text { margin-top: 8px; font-size: 13px; line-height: 1.5; color: #16233A; white-space: pre-line; overflow-wrap: anywhere; }
.cl-text--quote { color: #4C5C79; font-style: italic; }
.cl-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; font-size: 11.5px; color: #8493AC; }
.cl-meta .q-icon { margin-right: 3px; }
.cl-inv { cursor: default; }
</style>
