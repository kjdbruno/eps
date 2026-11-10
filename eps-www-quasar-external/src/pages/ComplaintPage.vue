<template>
    <div class="tone-feedback">
        <!-- ===== heading: who this is, the numbers, and the two things you can do ===== -->
        <SectionHero
            icon="bi-chat-quote" :eyebrow="firstName ? `hello, ${firstName}` : 'my account'" title="My feedback"
            subtitle="Everything you have filed, and what has happened to it."
            :stats="stats"
        >
            <button type="button" class="sh-act sh-act--main" @click="FileDialog = true"><q-icon name="bi-plus-lg" />File feedback</button>
            <button type="button" class="sh-act" @click="ClaimDialog = true"><q-icon name="bi-link-45deg" />Claim feedback</button>
        </SectionHero>

        <div v-if="complaints.length" class="q-mt-md q-mb-md">
            <q-input outlined dense rounded v-model="search" placeholder="Search by reference number..." class="pt-search q-mb-sm">
                <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
            </q-input>
            <div class="pt-chips">
                <button v-for="f in FILTERS" :key="f.value" type="button" class="pt-chip" :class="{ 'pt-chip--on': filter === f.value }" @click="filter = f.value">
                    {{ f.label }}<template v-if="f.value"> &middot; {{ countOf(f.value) }}</template>
                </button>
            </div>
        </div>

        <!-- ===== the list ===== -->
        <div v-if="loading && !complaints.length" class="row justify-center q-py-xl"><q-spinner-oval size="lg" color="primary" /></div>

        <div v-else-if="!complaints.length" class="pt-card pt-empty q-mt-md">
            <div class="pt-empty-ico"><q-icon name="bi-file-earmark-text" /></div>
            <div class="pt-empty-t">Nothing filed yet</div>
            <div>When you file feedback it will show up here, with every update.</div>
            <q-btn unelevated rounded no-caps color="primary" label="File feedback" class="q-mt-md" @click="FileDialog = true" />
        </div>

        <div v-else-if="!filteredComplaints.length" class="pt-card pt-empty">
            <div class="pt-empty-ico"><q-icon name="bi-funnel" /></div>
            <div class="pt-empty-t">Nothing in this view</div>
            <div>No feedback matches your search or filter.</div>
        </div>

        <div v-else class="pt-rows">
            <div v-for="c in filteredComplaints" :key="c.id" class="sc" :class="{ 'sc--closed': c.status === 'cancelled' }" @click="openDetail(c)">
                <div class="sc-top">
                    <span class="sc-ico"><q-icon name="bi-chat-quote" /></span>
                    <div class="sc-main">
                        <div class="sc-type">feedback</div>
                        <div class="sc-title text-uppercase">{{ c.referenceNo }}</div>
                    </div>
                    <span class="pt-pill" :class="`pt-st-${c.status}`">{{ c.status }}</span>
                </div>
                <div class="sc-desc" v-if="c.content">{{ c.content }}</div>
                <div class="sc-foot">
                    <span class="sc-chip"><q-icon name="bi-clock" size="13px" />Filed {{ formatDate(c.createdAt) }}</span>
                    <span class="sc-go">Open <q-icon name="bi-arrow-right" /></span>
                </div>
            </div>
        </div>

        <!-- ================= FILE FEEDBACK ================= -->
        <q-dialog v-model="FileDialog" persistent class="dialog">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">signed in &middot; no code needed</div>
                        <div class="text-h5 text-uppercase">file feedback</div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>
                <q-card-section class="col scroll bg-accent">
                    <div class="rc-block">
                        <ComplaintForm ref="fileFormRef" hide-submit @submitted="onFileSubmitted" />
                    </div>
                </q-card-section>
                <q-card-actions>
                    <q-btn flat rounded no-caps label="Cancel" class="btn" v-close-popup />
                    <q-btn unelevated rounded no-caps color="primary" label="Submit feedback" class="btn-2" :loading="fileFormRef?.loading" @click="fileFormRef?.submit()" />
                </q-card-actions>
            </q-card>
        </q-dialog>

        <!-- ================= CLAIM FEEDBACK ================= -->
        <q-dialog v-model="ClaimDialog" persistent class="dialog">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">link it to your account</div>
                        <div class="text-h5 text-uppercase">claim feedback</div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>
                <q-card-section class="col scroll bg-accent">
                    <div class="rc-block">
                        <div class="rc-block-title">before you start</div>
                        <div class="text-body2 text-grey-8">
                            Filed feedback before making this account, or under a different email?
                            Enter its reference number and access code to add it to your account.
                        </div>
                    </div>
                    <div class="rc-block">
                        <div class="rc-block-title">its details</div>
                        <div class="q-mb-md">
                            <div class="text-caption text-uppercase q-mb-xs text-grey">reference no.</div>
                            <q-input outlined v-model="claimReferenceNo" placeholder="e.g. EPS20260825ABCDE" />
                        </div>
                        <div>
                            <div class="text-caption text-uppercase q-mb-xs text-grey">access code (otp)</div>
                            <q-input outlined v-model="claimOtp" placeholder="6-digit code sent to your email" />
                        </div>
                        <div class="text-negative text-caption q-mt-sm" v-if="claimError">{{ claimError }}</div>
                    </div>
                </q-card-section>
                <q-card-actions>
                    <q-btn flat rounded no-caps label="Cancel" class="btn" v-close-popup />
                    <q-btn unelevated rounded no-caps color="primary" label="Claim feedback" class="btn-2" :loading="claiming" @click="claimComplaint()" />
                </q-card-actions>
            </q-card>
        </q-dialog>

        <!-- ================= FEEDBACK DETAIL =================
             Three pages, chosen from the pills in the header: where it stands, the updates you have
             received, and a follow-up of your own. -->
        <q-dialog v-model="DetailDialog" persistent class="dialog">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">feedback detail</div>
                        <div class="text-h5 text-uppercase">{{ selected?.referenceNo }}</div>
                        <div class="rc-hero-badges">
                            <span
                                v-for="n in navs" :key="n.tab"
                                class="rc-hero-pill rc-hero-pill--click" :class="{ 'rc-hero-pill--on': activeTab === n.tab }"
                                :style="{ opacity: activeTab === n.tab ? 1 : .7 }" @click="activeTab = n.tab"
                            >{{ n.label }}<template v-if="n.count"> &middot; {{ n.count }}</template></span>
                            <span class="rc-hero-pill">{{ selected?.status }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col scroll bg-accent">
                    <!-- ---------- overview ---------- -->
                    <template v-if="activeTab === 'overview'">
                        <div class="rc-block">
                            <div class="rc-block-title">where it stands</div>
                            <div class="fi-steps">
                                <div
                                    v-for="st in progressSteps" :key="st.label" class="fi-step"
                                    :class="{ 'fi-step--done': st.state === 'done', 'fi-step--now': st.state === 'now', 'fi-step--bad': st.state === 'bad' }"
                                >
                                    <span class="fi-dot"><q-icon :name="st.state === 'done' ? 'bi-check-lg' : (st.state === 'bad' ? 'bi-x-lg' : st.icon)" size="14px" /></span>
                                    <span class="fi-lbl">{{ st.label }}</span>
                                </div>
                            </div>
                            <div class="text-caption text-grey q-mt-sm" v-if="selected?.remarks">
                                <q-icon name="bi-chat-square-text-fill" size="xs" class="q-mr-xs" />{{ selected.remarks }}
                            </div>
                        </div>

                        <div class="rc-block" v-if="selected?.content">
                            <div class="rc-block-title">what you reported</div>
                            <div class="text-body2" style="white-space: pre-line;">{{ selected.content }}</div>
                            <div class="q-mt-md" v-if="selected?.complaintFiles?.length">
                                <q-carousel swipeable animated v-model="evidenceSlide" thumbnails infinite class="radius-sm">
                                    <q-carousel-slide
                                        v-for="(f, index) in selected.complaintFiles" :key="f.id"
                                        :name="index + 1" :img-src="f.file"
                                    />
                                </q-carousel>
                            </div>
                        </div>

                        <div class="rc-block">
                            <div class="rc-block-title">at a glance</div>
                            <div class="rc-kv">
                                <span>Reference</span><span class="text-uppercase">{{ selected?.referenceNo }}</span>
                                <span>Filed</span><span>{{ selected?.createdAt ? formatDate(selected.createdAt) : '—' }}</span>
                                <span>Status</span><span class="text-uppercase">{{ selected?.status }}</span>
                                <template v-if="selected?.resolutionDeadline">
                                    <span>Due</span>
                                    <span>
                                        {{ formatDate(selected.resolutionDeadline) }}
                                        <span v-if="selected.extensionGrantedAt" class="pt-pill pt-st-warn q-ml-xs">extended</span>
                                    </span>
                                </template>
                                <template v-if="resolutionComplianceLabel">
                                    <span>Resolution</span>
                                    <span>
                                        <span class="pt-pill" :class="resolutionPillClass">{{ resolutionComplianceLabel }}</span>
                                        <q-tooltip>{{ resolutionComplianceTooltip }}</q-tooltip>
                                    </span>
                                </template>
                            </div>
                        </div>

                        <div class="rc-block">
                            <div class="rc-block-title">handled by</div>
                            <div v-if="activeComplaintOffices.length" class="column q-gutter-y-sm">
                                <div v-for="co in activeComplaintOffices" :key="co.id" class="row items-center no-wrap">
                                    <div class="col">
                                        <div class="text-body2 text-weight-bold text-uppercase">{{ co.office?.alias }}</div>
                                        <div class="text-caption text-grey">{{ co.office?.name }}</div>
                                    </div>
                                    <span class="pt-pill" :class="`pt-st-${co.status}`">{{ co.status }}</span>
                                </div>
                            </div>
                            <div class="text-caption text-grey" v-else>Not yet assigned to any office.</div>
                        </div>
                    </template>

                    <!-- ---------- updates ---------- -->
                    <template v-if="activeTab === 'updates'">
                        <div class="rc-block" v-if="officeSatisfaction.length">
                            <div class="rc-block-title">your satisfaction</div>
                            <div class="row q-col-gutter-sm">
                                <div class="col-12 col-sm-6" v-for="os in officeSatisfaction" :key="os.label">
                                    <div class="pt-card q-pa-sm">
                                        <div class="text-caption text-uppercase text-grey">{{ os.label }}</div>
                                        <div class="row items-center q-gutter-xs">
                                            <div class="text-subtitle1 text-weight-bold">{{ os.avg.toFixed(1) }}</div>
                                            <q-rating :model-value="os.avg" readonly size="1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" icon-half="bi-star-half" />
                                            <div class="text-caption text-grey">({{ os.count }})</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="rc-block" v-if="selected?.responses?.length">
                            <div class="rc-block-title">conversation &middot; {{ selected.responses.length }}</div>
                            <q-list separator>
                                <q-item v-for="r in selected.responses" :key="r.id" class="q-px-none">
                                    <q-item-section avatar top>
                                        <q-avatar size="40px" :color="r.user?.avatar ? undefined : 'primary'" text-color="white">
                                            <img v-if="r.user?.avatar" :src="formatAvatar(r.user)" />
                                            <template v-else>{{ responderInitials(r) }}</template>
                                        </q-avatar>
                                    </q-item-section>
                                    <q-item-section>
                                        <div class="row items-center q-gutter-xs">
                                            <div class="text-weight-bold text-capitalize">{{ responderName(r) }}</div>
                                            <span class="pt-pill pt-st-info">{{ responseDepartment(r) }}</span>
                                        </div>
                                        <q-item-label caption>{{ formatDate(r.createdAt) }}</q-item-label>
                                        <q-item-label class="q-mt-xs" style="white-space: pre-line;">{{ r.content }}</q-item-label>

                                        <div class="row q-gutter-sm q-mt-sm" v-if="r.responseFiles?.length">
                                            <template v-for="f in r.responseFiles" :key="f.id">
                                                <q-img
                                                    v-if="!isPdf(f)"
                                                    :src="f.file"
                                                    class="evidence-thumb radius-sm cursor-pointer"
                                                    fit="cover"
                                                    @click="preview = f.file"
                                                />
                                                <q-btn
                                                    v-else
                                                    outline dense no-caps color="primary" icon="bi-file-earmark-pdf" :label="f.filename"
                                                    :href="f.file" target="_blank"
                                                />
                                            </template>
                                        </div>

                                        <div class="q-mt-sm" v-if="r.user?.role !== 'citizen'">
                                            <div class="text-caption text-grey">rate this response</div>
                                            <q-rating
                                                v-model="myRatings[r.id]"
                                                :max="5" size="1.5em" color="amber" icon="bi-star" icon-selected="bi-star-fill"
                                                :disable="ratingSaving === r.id"
                                                @update:model-value="(val) => submitRating(r, val)"
                                            />
                                        </div>
                                    </q-item-section>
                                </q-item>
                            </q-list>
                        </div>
                        <div v-else class="rc-empty" style="padding: 36px 20px;">
                            <q-icon name="bi-chat-dots" size="26px" />
                            <div class="rc-empty-title">No updates yet</div>
                            <div class="text-caption">When an office replies, it will show up here.</div>
                        </div>
                    </template>

                    <!-- ---------- follow-up ---------- -->
                    <template v-if="activeTab === 'followup'">
                        <div class="rc-block">
                            <div class="rc-block-title">add a follow-up</div>
                            <div class="text-caption text-grey" v-if="isTerminal">
                                <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                This feedback is finalized as <b class="text-uppercase">{{ selected?.status }}</b> — no further follow-ups can be added.
                            </div>
                            <template v-else>
                                <q-input
                                    outlined type="textarea" rows="4" v-model="followUpContent"
                                    placeholder="Add more details, or ask about the status of your feedback..."
                                    class="q-mb-sm"
                                />
                                <FileDrop v-model="followUpFiles" :max="5" accept="image/*,application/pdf" title="Drag & drop photos or a PDF" hint="up to 5 files (optional)" />
                            </template>
                        </div>
                    </template>
                </q-card-section>

                <q-card-actions v-if="!isTerminal">
                    <q-btn flat rounded no-caps color="negative" icon="bi-x-circle" label="Cancel feedback" class="btn" @click="CancelDialog = true" />
                    <q-space />
                    <template v-if="activeTab === 'followup'">
                        <q-btn flat rounded no-caps label="Close" class="btn" v-close-popup />
                        <q-btn
                            unelevated rounded no-caps color="primary" label="Send follow-up" class="btn-2"
                            :disable="!followUpContent" :loading="followUpLoading" @click="submitFollowUp"
                        />
                    </template>
                    <q-btn v-else flat rounded no-caps label="Close" class="btn" v-close-popup />
                </q-card-actions>
                <q-inner-loading :showing="detailLoading">
                    <q-spinner-ios color="primary" size="md"/>
                </q-inner-loading>
            </q-card>
        </q-dialog>

        <!-- ================= CANCEL FEEDBACK ================= -->
        <q-dialog v-model="CancelDialog" persistent>
            <q-card style="width: 460px; max-width: 94vw; border-radius: 18px;">
                <q-card-section>
                    <div class="text-h6">Cancel this feedback?</div>
                    <div class="text-body2 text-grey-7 q-mt-xs">
                        <b class="text-uppercase">{{ selected?.referenceNo }}</b> will be closed and the offices handling it will be told. This cannot be undone.
                    </div>
                </q-card-section>
                <q-card-section class="q-pt-none">
                    <q-input v-model="cancelReason" type="textarea" autogrow outlined rounded dense maxlength="500" counter placeholder="Reason (optional)" />
                    <div class="text-negative text-caption q-mt-xs" v-if="cancelError">{{ cancelError }}</div>
                </q-card-section>
                <q-card-actions align="right" class="q-pa-md">
                    <q-btn flat rounded no-caps label="Keep it" v-close-popup :disable="cancelLoading" />
                    <q-btn unelevated rounded no-caps color="negative" label="Yes, cancel it" :loading="cancelLoading" @click="submitCancel" />
                </q-card-actions>
            </q-card>
        </q-dialog>

        <q-dialog v-model="showPreview">
            <q-img :src="preview" style="width: 90vw; max-width: 600px;" />
        </q-dialog>
    </div>
</template>

<script setup>
import FileDrop from 'src/components/FileDrop.vue';
import { ref, computed, onMounted } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import { useQuasar } from 'quasar';
import moment from 'moment';
import ComplaintForm from 'src/components/ComplaintForm.vue';
import SectionHero from 'src/components/SectionHero.vue';
import { useAuthStore } from 'src/stores/auth-store';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const AuthStore = useAuthStore();

const loading = ref(false);
const complaints = ref([]);
const firstName = computed(() => AuthStore.user?.firstname || '');

const search = ref('');
// the groups the chips and the tiles count
const IN_PROGRESS = ['unverified', 'verified', 'pending', 'unassigned', 'received', 'ongoing'];
const FILTERS = [
    { label: 'All', value: '' },
    { label: 'In progress', value: 'progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
];
const filter = ref('');
const inGroup = (c, value) => !value || (value === 'progress' ? IN_PROGRESS.includes(c.status) : c.status === value);
const countOf = (value) => complaints.value.filter(c => inGroup(c, value)).length;
// the numbers in the band
const stats = computed(() => [
    { value: complaints.value.length, label: 'filed' },
    { value: countOf('progress'), label: 'in progress' },
    { value: countOf('completed'), label: 'completed' },
]);
const filteredComplaints = computed(() => {
    const term = search.value.trim().toLowerCase();
    return complaints.value.filter(c => inGroup(c, filter.value) && (!term || (c.referenceNo || '').toLowerCase().includes(term)));
});

const FileDialog = ref(false);
const fileFormRef = ref(null); // drives ComplaintForm's submit()/loading from this dialog's own footer button
const ClaimDialog = ref(false);
const DetailDialog = ref(false);
const CancelDialog = ref(false);
const cancelReason = ref('');
const cancelError = ref('');
const cancelLoading = ref(false);
const detailLoading = ref(false);
const selected = ref(null);
const preview = ref('');
const showPreview = computed({
    get: () => !!preview.value,
    set: (v) => { if (!v) preview.value = ''; }
});

const claimReferenceNo = ref('');
const claimOtp = ref('');
const claiming = ref(false);
const claimError = ref('');

const isTerminal = computed(() => ['completed', 'cancelled'].includes(selected.value?.status));

const formatDate = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const statusColor = (status) => ({
    unverified: 'grey',
    verified: 'blue',
    pending: 'orange',
    unassigned: 'negative',
    received: 'orange',
    ongoing: 'blue',
    completed: 'positive',
    cancelled: 'negative',
}[status] || 'grey');

/* -------------------- detail modal: same status presentation as the internal
   desk's complaint detail modal, just simplified for a citizen audience (no per-office
   acknowledgement compliance, no AI/admin assignment reasons — those are internal ops detail). */

const activeComplaintOffices = computed(() => (selected.value?.complaintOffices || []).filter(co => co.isActive));


const evidenceSlide = ref(1);

// the pages of the detail dialog (shown as pills in its header)
const activeTab = ref('overview');
const navs = computed(() => [
    { tab: 'overview', label: 'overview' },
    { tab: 'updates', label: 'updates', count: selected.value?.responses?.length || 0 },
    { tab: 'followup', label: 'follow-up' },
]);

// "where it stands": the path a feedback takes, each step done / current / still to come. A
// cancelled one stops at the step it reached and shows a red cross after it.
const progressSteps = computed(() => {
    const d = selected.value;
    if (!d) return [];
    const active = (d.complaintOffices || []).filter(co => co.isActive);
    const answered = (d.responses || []).some(r => r.user?.role !== 'citizen');
    const reached = [
        true,                                                                                              // filed
        d.status !== 'unverified',                                                                         // verified
        active.length > 0,                                                                                 // routed to an office
        active.some(co => co.receivedAt || ['received', 'ongoing', 'completed'].includes(co.status)),     // an office received it
        answered || active.some(co => ['ongoing', 'completed'].includes(co.status)),                       // someone responded
        d.status === 'completed',                                                                          // done
    ];
    const defs = [
        { label: 'Filed', icon: 'bi-send' },
        { label: 'Verified', icon: 'bi-patch-check' },
        { label: 'Routed', icon: 'bi-diagram-3' },
        { label: 'Received', icon: 'bi-inbox' },
        { label: 'Responded', icon: 'bi-chat-dots' },
        { label: 'Done', icon: 'bi-flag' },
    ];
    const lastDone = reached.lastIndexOf(true);
    const steps = defs.map((def, i) => ({
        ...def,
        state: i <= lastDone ? 'done' : (i === lastDone + 1 && d.status !== 'cancelled' ? 'now' : 'todo'),
    }));
    if (d.status === 'cancelled') steps.push({ label: 'Cancelled', icon: 'bi-x-lg', state: 'bad' });
    return steps;
});

const formatDaysLeft = (deadline) => {
    if (!deadline) return '';
    const days = moment(deadline).diff(moment(), 'days');
    if (days < 1) return moment(deadline).fromNow();
    return `${days}d left`;
};

const resolutionComplianceLabel = computed(() => ({
    on_time: 'resolved on time',
    late: 'resolved late',
    overdue: 'resolution overdue',
    awaiting: `resolution due — ${formatDaysLeft(selected.value?.resolutionDeadline)}`,
}[selected.value?.resolutionComplianceStatus] || ''));

const resolutionPillClass = computed(() => ({
    on_time: 'pt-st-ok',
    late: 'pt-st-bad',
    overdue: 'pt-st-bad',
    awaiting: 'pt-st-warn',
}[selected.value?.resolutionComplianceStatus] || 'pt-st-off'));

const resolutionComplianceTooltip = computed(() => {
    const d = selected.value;
    const deadline = d?.resolutionDeadline ? moment(d.resolutionDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (d.resolutionComplianceStatus === 'awaiting') return `Target resolution by ${deadline}${d.extensionGrantedAt ? ' (extended by 3 days)' : ''}.`;
    if (d.resolutionComplianceStatus === 'overdue') return `Target was ${deadline} — still not resolved.`;
    if (d.resolutionComplianceStatus === 'on_time') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — target was ${deadline}.`;
    if (d.resolutionComplianceStatus === 'late') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} target.`;
    return '';
});

/* -------------------- data -------------------- */

// A signed-in citizen cancels their own feedback any time before it is completed (POST
// /complaint/:id/cancel). The offices handling it are told; the record is kept as cancelled.
const submitCancel = async () => {
    const id = selected.value?.id;
    if (!id) return;
    cancelLoading.value = true;
    cancelError.value = '';
    try {
        await api.post(`/complaint/${id}/cancel`, { reason: cancelReason.value.trim() });
        $q.notify({ type: 'positive', message: 'Your feedback was cancelled.' });
        CancelDialog.value = false;
        DetailDialog.value = false;
        cancelReason.value = '';
        await loadComplaints();
    } catch (e) {
        cancelError.value = e.response?.data?.message || 'Unable to cancel your feedback.';
        // it may have been completed meanwhile: show how it stands
        if (e.response?.status === 400) loadComplaints();
    } finally {
        cancelLoading.value = false;
    }
};

const loadComplaints = async ({ quiet = false } = {}) => {
    if (!quiet) loading.value = true;
    try {
        const response = await api.get('/citizen/complaints');
        complaints.value = response.data.data || [];
    } catch (e) {
        console.error(e);
        $q.notify({ type: 'negative', message: 'Unable to load your feedback.' });
    } finally {
        loading.value = false;
    }
};

/* -------------------- ratings -------------------- */

const myRatings = ref({}); // responseId -> this citizen's current rating (0-5)
const ratingSaving = ref(null); // responseId currently being saved, or null

const isPdf = (file) => file?.file?.startsWith('data:application/pdf') || /\.pdf$/i.test(file?.filename || '');

const responderName = (r) => {
    const u = r?.user;
    const name = `${u?.firstname || ''} ${u?.lastname || ''}`.trim();
    return name || u?.username || 'Unknown';
};

const responderInitials = (r) => {
    const u = r?.user;
    const initials = `${(u?.firstname || '')[0] || ''}${(u?.lastname || '')[0] || ''}`.toUpperCase();
    return initials || '?';
};

const responseDepartment = (r) => {
    const office = r?.user?.staff?.office;
    if (office) return office.alias || office.name;
    if (['super', 'admin'].includes(r?.user?.role)) return 'Supervisor';
    // A citizen only ever sees their OWN complaint's thread, so any citizen-authored entry here
    // is their own follow-up.
    if (r?.user?.role === 'citizen') return 'You';
    return 'City Hall';
};

const formatAvatar = (user) => `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`;

const loadMyRatings = (responses) => {
    const map = {};
    for (const r of responses || []) {
        const mine = (r.responseRatings || []).find(rr => rr.userId === AuthStore.user?.id);
        map[r.id] = mine?.rate || 0;
    }
    myRatings.value = map;
};

// "Your satisfaction" per office — the average of the stars you left on that office's
// responses in THIS complaint (matches the mobile app's ComplaintBody and the internal desk's
// modal). Recomputes live as you tap stars, since myRatings drives the q-rating v-model.
const officeSatisfaction = computed(() => {
    const groups = {};
    for (const r of (selected.value?.responses || [])) {
        if (r?.user?.role === 'citizen') continue; // own follow-ups aren't rated
        const rate = myRatings.value[r.id];
        if (!rate) continue;
        const label = responseDepartment(r);
        if (!groups[label]) groups[label] = [];
        groups[label].push(rate);
    }
    return Object.entries(groups).map(([label, rates]) => ({
        label,
        count: rates.length,
        avg: rates.reduce((sum, x) => sum + x, 0) / rates.length,
    }));
});

const submitRating = async (response, rate) => {
    if (!rate) return;
    ratingSaving.value = response.id;
    try {
        await api.post('/response/rate', { responseId: response.id, rate });
        $q.notify({ type: 'positive', message: 'Thanks for rating this response!' });
    } catch (e) {
        console.error(e);
        $q.notify({ type: 'negative', message: e.response?.data?.message || 'Unable to save your rating.' });
        // Revert on failure so the stars don't lie about what's saved.
        const mine = (selected.value?.responses || []).find(r => r.id === response.id);
        myRatings.value[response.id] = (mine?.responseRatings || []).find(rr => rr.userId === AuthStore.user?.id)?.rate || 0;
    } finally {
        ratingSaving.value = null;
    }
};

const refreshDetail = async (id) => {
    const response = await api.get(`/complaint/${id}`);
    selected.value = response.data.data;
    loadMyRatings(selected.value.responses);
};

const openDetail = async (complaint) => {
    DetailDialog.value = true;
    detailLoading.value = true;
    selected.value = complaint;
    evidenceSlide.value = 1; // don't carry over a previous complaint's carousel position
    activeTab.value = 'overview';
    followUpContent.value = '';
    followUpFiles.value = null;
    try {
        await refreshDetail(complaint.id);
    } catch (e) {
        console.error(e);
    } finally {
        detailLoading.value = false;
    }
};

/* -------------------- follow-up responses -------------------- */

const followUpContent = ref('');
const followUpFiles = ref([]);
const followUpLoading = ref(false);

const submitFollowUp = async () => {
    const id = selected.value?.id;
    if (!id || !followUpContent.value) return;
    followUpLoading.value = true;
    try {
        const formData = new FormData();
        formData.append('complaintId', id);
        formData.append('content', followUpContent.value);
        (followUpFiles.value || []).forEach(f => formData.append('files', f));
        await api.post('/response/respond', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        $q.notify({ type: 'positive', message: 'Follow-up sent!' });
        followUpContent.value = '';
        followUpFiles.value = null;
        await refreshDetail(id);
    } catch (e) {
        console.error(e);
        $q.notify({ type: 'negative', message: e.response?.data?.message || 'Unable to send your follow-up.' });
    } finally {
        followUpLoading.value = false;
    }
};

const onFileSubmitted = ({ data, error }) => {
    if (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Unable to submit your feedback.' });
        return;
    }
    FileDialog.value = false;
    $q.notify({ type: 'positive', message: `Feedback submitted. Reference No: ${data.complaint.referenceNo}` });
    loadComplaints();
};

const claimComplaint = async () => {
    claimError.value = '';
    if (!claimReferenceNo.value || !claimOtp.value) {
        claimError.value = 'Reference number and access code are both required.';
        return;
    }
    claiming.value = true;
    try {
        const response = await api.post('/complaint/claim', {
            referenceNo: claimReferenceNo.value,
            otp: claimOtp.value
        });
        $q.notify({ type: 'positive', message: response.data.message || 'Feedback linked to your account.' });
        claimReferenceNo.value = '';
        claimOtp.value = '';
        ClaimDialog.value = false;
        loadComplaints();
    } catch (e) {
        claimError.value = e.response?.data?.message || 'Unable to claim that feedback.';
    } finally {
        claiming.value = false;
    }
};

// an office receiving, answering or finishing your feedback shows here at once, in the list and in the open detail
useLiveRefresh(['complaint'], async () => {
    await loadComplaints({ quiet: true });
    if (DetailDialog.value && selected.value?.id) await refreshDetail(selected.value.id);
});

onMounted(() => {
    loadComplaints();
    if (route.query.action === 'file') FileDialog.value = true;
    if (route.query.action === 'claim') ClaimDialog.value = true;
    if (route.query.action) router.replace({ path: route.path });
});
</script>

<style scoped>
.evidence-thumb {
    width: 84px;
    height: 84px;
}
/* the heading band: the title on the left, the two things you can do as big, tappable cards on the right */
.mf-hero { position: relative; overflow: hidden; display: grid; gap: 20px; grid-template-columns: 1fr; align-items: center; padding: 26px 28px; border-radius: 22px; color: #fff; background: linear-gradient(135deg, #14305F 0%, #204888 100%); }
.mf-hero::after { content: ''; position: absolute; right: -60px; top: -80px; width: 260px; height: 260px; border-radius: 50%; background: rgba(255, 255, 255, .07); pointer-events: none; }
.mf-hero::before { content: ''; position: absolute; left: 30%; bottom: -120px; width: 220px; height: 220px; border-radius: 50%; background: rgba(255, 201, 0, .1); pointer-events: none; }
.mf-hero > * { position: relative; z-index: 1; }
@media (min-width: 900px) { .mf-hero { grid-template-columns: 1fr auto; } }
.mf-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #FFC900; }
.mf-title { font-size: clamp(28px, 4vw, 38px); font-weight: 800; line-height: 1.1; margin-top: 4px; }
.mf-sub { font-size: 14.5px; opacity: .88; margin-top: 6px; }
.mf-actions { display: grid; gap: 10px; grid-template-columns: 1fr; }
@media (min-width: 560px) and (max-width: 899px) { .mf-actions { grid-template-columns: 1fr 1fr; } }
.mf-act { appearance: none; display: flex; align-items: center; gap: 14px; min-width: 270px; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, .3); border-radius: 16px; background: rgba(255, 255, 255, .1); color: #fff; font: inherit; text-align: left; cursor: pointer; transition: transform .15s, background .15s, box-shadow .15s; }
.mf-act:hover { background: rgba(255, 255, 255, .18); transform: translateY(-2px); }
.mf-act-ico { flex: none; width: 42px; height: 42px; border-radius: 12px; background: rgba(255, 255, 255, .18); display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }
.mf-act-t { flex: 1; min-width: 0; }
.mf-act-t b { display: block; font-size: 15px; }
.mf-act-t small { display: block; margin-top: 1px; font-size: 12px; opacity: .8; }
.mf-act-go { flex: none; opacity: .8; }
.mf-act--main { background: #FFC900; border-color: #FFC900; color: #1D1D1D; box-shadow: 0 10px 24px rgba(0, 0, 0, .2); }
.mf-act--main:hover { background: #FFD43B; }
.mf-act--main .mf-act-ico { background: rgba(0, 0, 0, .1); }
.mf-act--main small { opacity: .7; }
</style>
