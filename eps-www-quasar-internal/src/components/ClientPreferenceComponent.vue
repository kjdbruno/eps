<template>
    <div class="rc-shell">
        <div class="rc-main">
            <div class="ov-title">the client accounts</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> clients</div><div class="ov-kpi-value">{{ summary.total }}</div><div class="ov-kpi-sub">seeded from the old system</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-envelope" size="16px" /> not notified</div><div class="ov-kpi-value">{{ summary.new }}</div><div class="ov-kpi-sub">still waiting for their details</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-send-check" size="16px" /> notified</div><div class="ov-kpi-value">{{ summary.sent }}</div><div class="ov-kpi-sub">have their details, not signed in</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-box-arrow-in-right" size="16px" /> signed in</div><div class="ov-kpi-value">{{ summary.signedIn }}</div><div class="ov-kpi-sub">{{ pct(summary.signedIn) }}% of all</div></div>
            </div>

            <div class="ov-duo q-mb-md">
                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">where they stand</div><div class="ov-card-note">all of them</div></div>
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
                    <div class="ov-card-head"><div class="ov-card-title">sending</div><div class="ov-card-note">{{ run.running ? 'in progress' : 'today' }}</div></div>
                    <template v-if="run.running">
                        <div class="ov-step">
                            <div class="ov-step-top"><span class="ov-step-label">Sending the account details</span><span class="ov-step-count">{{ run.done }} / {{ run.total }}</span></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (run.total ? Math.round(run.done / run.total * 100) : 0) + '%', background: '#204888' }"></div></div>
                        </div>
                        <div class="text-caption text-grey q-mt-sm">{{ run.sent }} sent<span v-if="run.failed"> · {{ run.failed }} could not be sent</span>. You can leave this page; it keeps going.</div>
                    </template>
                    <template v-else>
                        <div class="ov-step">
                            <div class="ov-step-top"><span class="ov-step-label">Sent in the last 24 hours</span><span class="ov-step-count">{{ summary.sentToday }} / {{ summary.dailyCap }}</span></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: Math.min(100, summary.dailyCap ? Math.round(summary.sentToday / summary.dailyCap * 100) : 0) + '%', background: '#E0A100' }"></div></div>
                        </div>
                        <div v-if="run.stoppedBecause" class="cc-note"><q-icon name="bi-exclamation-triangle" size="16px" /><span>{{ run.stoppedBecause }}</span></div>
                        <q-btn unelevated no-caps rounded color="primary" icon="bi-send" label="Send account details" class="q-mt-md" :disable="!summary.new && !summary.failed" @click="openSend" />
                    </template>
                    <div class="ov-card-foot">Each client gets a new temporary password (lowercase letters and digits) in an email. At the first login they choose their own.</div>
                </div>
            </div>

            <div class="ov-card q-mb-lg">
                <div class="ov-card-head"><div class="ov-card-title">could not be reached</div><div class="ov-card-note">the email did not go out</div></div>
                <div v-if="failedClients.length" class="pf-chips">
                    <button v-for="c in failedClients" :key="c.id" type="button" class="pf-chip" @click="openDetail(c)">
                        <span class="rc-code rc-code--bad">failed</span><span class="pf-chip-t">{{ fullName(c) }} &middot; {{ c.email }}</span>
                    </button>
                </div>
                <div v-else class="ov-empty">every email that was tried went out</div>
                <div class="ov-card-foot">A failed one is offered again by the next batch. These emails are years old, so some addresses may no longer exist: follow those up another way.</div>
            </div>
        </div>

        <PreferenceRail
            title="clients" :shown="filteredRows.length" :total="rows.length"
            v-model:search="search" placeholder="Search name or email..."
            :filters="STATUS_FILTERS" v-model:filter="statusFilter"
            :loading="loading" icon="bi-people" add-label="Send" @add="openSend"
        >
            <div
                v-for="c in filteredRows" :key="c.id"
                class="rc-item rc-item--click" :style="{ borderLeftColor: TONE_COLOR[c.status] }"
                @click="openDetail(c)"
            >
                <div class="row items-center justify-between no-wrap">
                    <div class="text-caption text-weight-bold ellipsis">{{ fullName(c) }}</div>
                    <span class="rc-pill" :class="`rc-pill--${PILL[c.status]}`">{{ STATUS_LABEL[c.status] }}</span>
                </div>
                <div class="text-caption text-grey q-mt-xs ellipsis">{{ c.email }}</div>
                <div class="text-caption text-grey">{{ c.feedbackCount }} feedback<span v-if="c.lastSentAt"> &middot; sent {{ moment(c.lastSentAt).fromNow() }}</span></div>
            </div>
        </PreferenceRail>

        <!-- one client: the account, everything they did in each module, and sending their details (again) -->
        <ClientDetailDialog v-model="detailOpen" :client="detail" :sending="sending" :status-label="detail ? STATUS_LABEL[detail.status] : ''" @send="sendOne" />

        <!-- the next batch -->
        <PreferenceDialog
            v-model="sendOpen" eyebrow="client accounts" title="send the account details"
            :pills="[{ label: `${summary.new + summary.failed} waiting`, on: true }, { label: `${leftToday} left today` }]"
            :pages="ONE_PAGE" page="details" :info="SEND_INFO" :checks="sendChecks" :problems="sendProblems"
            :is-edit="true" :submit-label="`send to ${willSend} client${willSend === 1 ? '' : 's'}`"
            :submit-disabled="!!sendProblems.length || !willSend" submit-hint="Fix what is listed first."
            :loading="sending" @go="() => {}" @step="() => {}" @submit="sendBatch"
        >
            <div class="rc-block">
                <div class="rc-block-title">who gets it</div>
                <div class="rc-cap">the next clients that have not been sent their details</div>
                <div class="row items-center q-gutter-sm">
                    <q-input v-model.number="batchSize" type="number" outlined dense style="width: 130px;" min="1" :max="maxBatch" hide-bottom-space />
                    <q-btn v-for="n in QUICK" :key="n" no-caps unelevated rounded size="sm" :label="n === 'all' ? 'all of them' : n" class="rc-chipbtn" :class="{ 'rc-chipbtn--active': quickIs(n) }" @click="pickQuick(n)" />
                </div>
                <div class="rc-field-foot"><span>Oldest accounts first. The ones whose last email failed are included.</span><span>up to {{ maxBatch }}</span></div>
                <div class="cc-note"><q-icon name="bi-info-circle" size="16px" /><span>Each one is emailed their address and a new temporary password, and is asked to choose their own at the first login. They are marked verified: receiving the email is the proof. They go out one at a time, and you can leave the page.</span></div>
            </div>

            <div class="rc-block">
                <div class="rc-block-title">see how it looks first</div>
                <div class="rc-cap" :class="{ 'rc-cap--bad': testError }">{{ testError || 'send a test email to an address of yours' }}</div>
                <div class="row no-wrap q-gutter-sm">
                    <q-input v-model="testEmail" type="email" outlined dense placeholder="you@example.com" class="col" :error="!!testError" no-error-icon hide-bottom-space @keyup.enter="sendTest" />
                    <q-btn unelevated no-caps rounded color="primary" icon="bi-envelope-check" label="Send test" :loading="testing" @click="sendTest" />
                </div>
                <div class="rc-field-foot"><span>The test has a made-up password and touches no account.</span></div>
            </div>
        </PreferenceDialog>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { api } from 'src/boot/axios';
import moment from 'moment';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { Toast } from 'src/boot/sweetalert';
import PreferenceDialog from './PreferenceDialog.vue';
import PreferenceRail from './PreferenceRail.vue';
import ClientDetailDialog from './ClientDetailDialog.vue';
import { toBars } from 'src/utils/prefBars';
import { esc } from 'src/utils/escape';

const rows = ref([]);
const summary = ref({ total: 0, new: 0, sent: 0, signedIn: 0, failed: 0, sentToday: 0, dailyCap: 0 });
const run = ref({ running: false, total: 0, done: 0, sent: 0, failed: 0, stoppedBecause: null });
const loading = ref(false);
const sending = ref(false);

const fullName = (c) => `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.email;
const pct = (n) => (summary.value.total ? Math.round((n / summary.value.total) * 100) : 0);

// ---- the list
const STATUS_LABEL = { new: 'not notified', sent: 'notified', signed_in: 'signed in', failed: 'not reached' };
const PILL = { new: 'off', sent: 'info', signed_in: 'ok', failed: 'bad' };
const TONE_COLOR = { new: '#C6C9CF', sent: '#68AFF1', signed_in: 'var(--q-positive)', failed: 'var(--q-negative)' };
const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'Not notified' },
    { value: 'sent', label: 'Notified' },
    { value: 'signed_in', label: 'Signed in' },
    { value: 'failed', label: 'Not reached' },
];
const search = ref('');
const statusFilter = ref('all');
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    return rows.value.filter(c => (statusFilter.value === 'all' || c.status === statusFilter.value)
        && (!term || fullName(c).toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term)));
});
const statusItems = computed(() => [
    { label: 'not notified', count: summary.value.new, color: 'grey-6' },
    { label: 'notified', count: summary.value.sent, color: 'info' },
    { label: 'signed in', count: summary.value.signedIn, color: 'positive' },
    { label: 'not reached', count: summary.value.failed, color: 'negative' },
]);
const failedClients = computed(() => rows.value.filter(c => c.status === 'failed').slice(0, 12));

// ---- loading, and following a batch while it goes out
const fetchData = async (opts = {}) => {
    if (!opts.quiet) loading.value = true;
    try {
        const { data } = await api.get('/preference/clients');
        rows.value = data.clients;
        summary.value = data.summary;
        run.value = data.run;
    } catch (error) {
        console.error('Error fetching the clients:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'An error occurred while fetching the clients.'}</div>` });
    } finally {
        loading.value = false;
    }
};

let poll = null;
const stopPolling = () => { clearInterval(poll); poll = null; };
const startPolling = () => {
    if (poll) return;
    poll = setInterval(async () => {
        try {
            const { data } = await api.get('/preference/clients/status');
            const wasRunning = run.value.running;
            run.value = data;
            if (wasRunning && !data.running) { stopPolling(); fetchData({ quiet: true }); }
        } catch (e) { /* the next tick tries again */ }
    }, 2000);
};
watch(() => run.value.running, (running) => { if (running) startPolling(); });

useLiveRefresh(['client'], () => fetchData({ quiet: true }));
onMounted(async () => { await fetchData(); if (run.value.running) startPolling(); });
onBeforeUnmount(stopPolling);

// ---- one client
const ONE_PAGE = [{ key: 'details', open: true, icon: 'bi-person', label: 'details', state: '' }];
const detailOpen = ref(false);
const detailId = ref(null);
const detail = computed(() => rows.value.find(c => c.id === detailId.value) || null);
const openDetail = (c) => { detailId.value = c.id; detailOpen.value = true; };

const sendOne = async () => {
    const c = detail.value;
    if (!c) return;
    const again = c.sentCount > 0;
    const result = await Swal.fire({
        title: again ? 'Send the details again?' : 'Send the account details?',
        html: `<b>${esc(fullName(c))}</b> gets a ${again ? 'new ' : ''}temporary password at <b>${esc(c.email)}</b>.${again ? ' The password sent before stops working.' : ''}`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'send', cancelButtonText: 'cancel', reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    sending.value = true;
    try {
        const { data } = await api.post(`/preference/clients/${c.id}/resend`);
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">sent!</div><div class="text-caption">${data.message}</div>` });
        await fetchData({ quiet: true });
    } catch (error) {
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">not sent</div><div class="text-caption">${error.response?.data?.message || 'The email could not be sent.'}</div>` });
        await fetchData({ quiet: true });
    } finally {
        sending.value = false;
    }
};

// ---- the next batch
const SEND_INFO = { icon: 'bi-send', bg: '#E4F6EA', fg: '#1C8A3B', title: 'Send the next batch', hint: 'Choose how many, check how it looks, then send.' };
const QUICK = [10, 50, 100, 'all'];
const sendOpen = ref(false);
const batchSize = ref(100);
const waiting = computed(() => summary.value.new + summary.value.failed);
const leftToday = computed(() => Math.max(summary.value.dailyCap - summary.value.sentToday, 0));
const maxBatch = computed(() => Math.max(Math.min(waiting.value, leftToday.value, 500), 0));
const willSend = computed(() => Math.max(Math.min(Number(batchSize.value) || 0, maxBatch.value), 0));
const quickIs = (n) => (n === 'all' ? batchSize.value === maxBatch.value : batchSize.value === n);
const pickQuick = (n) => { batchSize.value = n === 'all' ? maxBatch.value : Math.min(n, maxBatch.value); };
const sendChecks = computed(() => [
    { key: 'waiting', page: 'details', required: true, ok: waiting.value > 0, title: 'Clients waiting', detail: waiting.value ? `${waiting.value} not sent their details yet.` : 'Everyone has been sent theirs.' },
    { key: 'limit', page: 'details', required: true, ok: leftToday.value > 0, title: 'Daily limit', detail: `${leftToday.value} of ${summary.value.dailyCap} left in the last 24 hours.` },
    { key: 'count', page: 'details', required: true, ok: willSend.value > 0, title: 'How many', detail: willSend.value ? `${willSend.value} will be sent.` : 'Choose how many to send.' },
    { key: 'test', page: 'details', required: false, ok: testSent.value, title: 'A test email', detail: testSent.value ? 'Sent: check how it looks.' : 'Optional: send one to yourself first.' },
]);
const sendProblems = computed(() => [
    ...(!waiting.value ? ['There is nobody left to send to.'] : []),
    ...(waiting.value && !leftToday.value ? ['The daily limit is used up. Try again later.'] : []),
]);
const openSend = () => {
    batchSize.value = Math.min(100, maxBatch.value) || 1;
    testError.value = '';
    sendOpen.value = true;
};

const sendBatch = async () => {
    const n = willSend.value;
    const result = await Swal.fire({
        title: `Send to ${n} client${n === 1 ? '' : 's'}?`,
        html: 'Each one is emailed a new temporary password and asked to choose their own at the first login. This cannot be undone.',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'send', cancelButtonText: 'cancel', reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    sending.value = true;
    try {
        const { data } = await api.post('/preference/clients/notify', { limit: n });
        sendOpen.value = false;
        run.value = { ...run.value, running: true, total: data.queued, done: 0, sent: 0, failed: 0, stoppedBecause: null };
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">started!</div><div class="text-caption">${data.message}</div>` });
        startPolling();
    } catch (error) {
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">not sent</div><div class="text-caption">${error.response?.data?.message || 'Could not start sending.'}</div>` });
    } finally {
        sending.value = false;
    }
};

// ---- a test email
const testEmail = ref('');
const testError = ref('');
const testing = ref(false);
const testSent = ref(false);
const sendTest = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.value.trim())) { testError.value = 'Give a valid email address.'; return; }
    testError.value = '';
    testing.value = true;
    try {
        const { data } = await api.post('/preference/clients/test', { email: testEmail.value.trim() });
        testSent.value = true;
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">sent!</div><div class="text-caption">${data.message}</div>` });
    } catch (error) {
        testError.value = error.response?.data?.message || 'The test email could not be sent.';
    } finally {
        testing.value = false;
    }
};
</script>
