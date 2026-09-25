<template>
    <div>
        <div class="row items-center q-mb-md">
            <div>
                <div class="text-overline text-primary text-weight-bold">My Feedback</div>
                <div class="row items-baseline q-gutter-xs">
                    <div class="text-h5 text-capitalize">feedback</div>
                    <div class="text-caption text-grey">{{ filteredComplaints.length }} of {{ complaints.length }}</div>
                </div>
            </div>
            <q-space />
            <div class="q-gutter-sm">
                <q-btn size="sm" unelevated outline rounded color="primary" no-caps label="claim feedback" @click="ClaimDialog = true" />
                <q-btn size="sm" unelevated rounded color="primary" no-caps label="file feedback" @click="FileDialog = true" />
            </div>
        </div>
        <q-input outlined dense v-model="search" placeholder="Search reference no..." class="q-mb-md">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>

        <q-card flat class="no-shadow custom-border radius-sm q-py-md">
            <q-list separator v-if="filteredComplaints.length">
                <q-item
                    v-for="c in filteredComplaints" :key="c.id"
                    clickable class="q-pa-md"
                    @click="openDetail(c)"
                >
                    <q-item-section avatar>
                        <q-avatar :color="statusColor(c.status)" text-color="white" icon="bi-file-earmark-text" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label class="text-uppercase text-weight-bold">{{ c.referenceNo }}</q-item-label>
                        <q-item-label caption>{{ formatDate(c.createdAt) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side top>
                        <q-badge outline :color="statusColor(c.status)" class="text-uppercase">{{ c.status }}</q-badge>
                    </q-item-section>
                </q-item>
            </q-list>
            <div v-else-if="loading" class="q-pa-xl text-center text-grey">
                <q-spinner-ios size="1.5em" />
                <div class="text-caption text-uppercase q-mt-sm">loading feedback...</div>
            </div>
            <div v-else class="q-pa-xl text-center text-grey">
                <q-icon name="bi-file-earmark-text" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no feedback</div>
            </div>
        </q-card>

        <!-- File a complaint -->
        <q-dialog v-model="FileDialog" full-height persistent>
            <q-card class="column full-height eps-modal-card" style="border-radius: 20px;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">file feedback</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col eps-create-shell">
                        <div class="eps-create-body">
                            <ComplaintForm ref="fileFormRef" mode="account" hide-submit @submitted="onFileSubmitted" />
                        </div>
                        <div class="eps-create-footer row justify-start">
                            <q-btn unelevated color="primary" no-caps label="submit feedback" :loading="fileFormRef?.loading" @click="fileFormRef?.submit()" />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- Claim a previous complaint -->
        <q-dialog v-model="ClaimDialog" full-height persistent>
            <q-card class="column full-height eps-modal-card" style="border-radius: 20px;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">claim feedback</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col eps-create-shell">
                        <div class="eps-create-body">
                            <div class="text-caption text-grey q-mb-md">
                                Filed feedback before making this account, or under a different email?
                                Enter its reference number and access code to add it to your account.
                                <br><br>
                                Feedback you filed <b>anonymously</b> can't be linked &mdash; use the
                                <router-link to="/track" class="text-primary">Track</router-link> page to follow it instead.
                            </div>
                            <div class="q-mb-md">
                                <div class="text-caption text-uppercase q-mb-xs text-grey">reference no.</div>
                                <q-input outlined v-model="claimReferenceNo" />
                            </div>
                            <div class="q-mb-md">
                                <div class="text-caption text-uppercase q-mb-xs text-grey">access code (otp)</div>
                                <q-input outlined v-model="claimOtp" />
                            </div>
                            <div class="text-negative text-caption q-mb-md" v-if="claimError">{{ claimError }}</div>
                        </div>
                        <div class="eps-create-footer row justify-start">
                            <q-btn unelevated color="primary" no-caps label="claim feedback" :loading="claiming" @click="claimComplaint()" />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- View complaint — patterned after the internal desk's complaint detail modal (same
             bg-accent info-card sections, badge conventions, and history/evidence treatment),
             collapsed to a single column throughout so it reads naturally on a phone-width
             screen without any side-by-side split. -->
        <q-dialog v-model="DetailDialog" full-height persistent>
            <q-card class="column full-height eps-modal-card" style="border-radius: 20px;">
                <q-card-section class="row items-center q-pa-lg">
                    <div>
                        <div class="text-caption text-uppercase text-grey">feedback detail</div>
                        <div class="text-h5 text-uppercase">{{ selected?.referenceNo }}</div>
                    </div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section class="scroll" style="flex: 1">
                    <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm">
                        <div class="row q-col-gutter-md">
                            <div class="col-12 col-sm-6">
                                <div class="text-caption text-uppercase text-grey">status</div>
                                <div class="text-body1 text-uppercase">{{ selected?.status }}</div>
                                <div class="text-caption text-grey q-mt-xs" v-if="selected?.remarks">
                                    <q-icon name="bi-chat-square-text-fill" size="xs" class="q-mr-xs" />{{ selected.remarks }}
                                </div>
                            </div>
                            <div class="col-12 col-sm-6">
                                <div class="text-caption text-uppercase text-grey q-mb-xs">complexity / resolution</div>
                                <div class="row items-center q-gutter-xs">
                                    <q-badge :color="selected?.complexity ? 'grey-7' : 'grey-4'" class="text-uppercase">
                                        {{ selected?.complexity ? complexityLabel(selected.complexity) : 'not yet classified' }}
                                    </q-badge>
                                    <q-badge v-if="resolutionComplianceLabel" :color="resolutionComplianceColor" class="text-uppercase">
                                        {{ resolutionComplianceLabel }}
                                        <q-tooltip>{{ resolutionComplianceTooltip }}</q-tooltip>
                                    </q-badge>
                                </div>
                            </div>
                        </div>
                        <div class="q-mt-md" v-if="activeComplaintOffices.length">
                            <div class="text-caption text-uppercase text-grey q-mb-xs">assigned office(s)</div>
                            <q-list bordered separator class="radius-sm overflow-hidden">
                                <q-item v-for="co in activeComplaintOffices" :key="co.id">
                                    <q-item-section>
                                        <q-item-label class="text-uppercase">{{ co.office?.name }} ({{ co.office?.alias }})</q-item-label>
                                    </q-item-section>
                                    <q-item-section side>
                                        <q-badge :color="statusColor(co.status)" class="text-uppercase">{{ co.status }}</q-badge>
                                    </q-item-section>
                                </q-item>
                            </q-list>
                        </div>
                        <div class="text-caption text-grey q-mt-md" v-else>Not yet assigned to any office.</div>
                    </q-card-section>

                    <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm" v-if="selected?.content">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">feedback content</div>
                        <div class="text-body2">{{ selected.content }}</div>
                        <div class="q-mt-md" v-if="selected?.complaintFiles?.length">
                            <q-carousel swipeable animated v-model="evidenceSlide" thumbnails infinite class="radius-sm">
                                <q-carousel-slide
                                    v-for="(f, index) in selected.complaintFiles" :key="f.id"
                                    :name="index + 1" :img-src="f.file"
                                />
                            </q-carousel>
                        </div>
                    </q-card-section>

                    <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">add a follow-up</div>
                        <div class="text-caption text-grey" v-if="isTerminal">
                            <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                            This feedback is finalized as <b class="text-uppercase">{{ selected?.status }}</b> — no further follow-ups can be added.
                        </div>
                        <template v-else>
                            <q-input
                                outlined type="textarea" rows="3" v-model="followUpContent"
                                placeholder="Add more details, or ask about the status of your feedback..."
                                class="q-mb-sm"
                            />
                            <q-file
                                outlined v-model="followUpFiles" label="Attach evidence (optional)" multiple counter
                                accept="image/*,application/pdf" class="q-mb-sm"
                            >
                                <template v-slot:prepend><q-icon name="bi-paperclip" /></template>
                            </q-file>
                            <q-btn
                                unelevated color="primary" no-caps label="send follow-up" class="full-width"
                                :disable="!followUpContent" :loading="followUpLoading" @click="submitFollowUp"
                            />
                        </template>
                    </q-card-section>

                    <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm" v-if="officeSatisfaction.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">your satisfaction</div>
                        <div class="row q-col-gutter-sm">
                            <div class="col-12 col-sm-6" v-for="os in officeSatisfaction" :key="os.label">
                                <q-card flat bordered class="radius-sm q-pa-sm">
                                    <div class="text-caption text-uppercase text-grey">{{ os.label }}</div>
                                    <div class="row items-center q-gutter-xs">
                                        <div class="text-subtitle1 text-weight-bold">{{ os.avg.toFixed(1) }}</div>
                                        <q-rating :model-value="os.avg" readonly size="1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" icon-half="bi-star-half" />
                                        <div class="text-caption text-grey">({{ os.count }})</div>
                                    </div>
                                </q-card>
                            </div>
                        </div>
                    </q-card-section>

                    <q-card-section class="q-pa-md radius-sm bg-accent" v-if="selected?.responses?.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">updates</div>
                        <q-list bordered separator class="radius-sm overflow-hidden">
                            <q-item v-for="r in selected.responses" :key="r.id">
                                <q-item-section avatar top>
                                    <q-avatar size="40px" :color="r.user?.avatar ? undefined : 'primary'" text-color="white">
                                        <img v-if="r.user?.avatar" :src="formatAvatar(r.user)" />
                                        <template v-else>{{ responderInitials(r) }}</template>
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <div class="row items-center q-gutter-xs">
                                        <div class="text-weight-bold text-capitalize">{{ responderName(r) }}</div>
                                        <q-badge color="primary" class="text-uppercase">{{ responseDepartment(r) }}</q-badge>
                                    </div>
                                    <q-item-label caption>{{ formatDate(r.createdAt) }}</q-item-label>
                                    <q-item-label class="q-mt-xs">{{ r.content }}</q-item-label>

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

                                    <div class="q-mt-sm">
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
                    </q-card-section>
                </q-card-section>
                <q-inner-loading :showing="detailLoading">
                    <q-spinner-ios color="primary" size="md"/>
                </q-inner-loading>
            </q-card>
        </q-dialog>

        <q-dialog v-model="showPreview">
            <q-img :src="preview" style="width: 90vw; max-width: 600px;" />
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import { useQuasar } from 'quasar';
import moment from 'moment';
import ComplaintForm from 'src/components/ComplaintForm.vue';
import { useAuthStore } from 'src/stores/auth-store';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const AuthStore = useAuthStore();

const loading = ref(false);
const complaints = ref([]);

const search = ref('');
const filteredComplaints = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return complaints.value;
    return complaints.value.filter(c => (c.referenceNo || '').toLowerCase().includes(term));
});

const FileDialog = ref(false);
const fileFormRef = ref(null); // drives ComplaintForm's submit()/loading from this dialog's own footer button
const ClaimDialog = ref(false);
const DetailDialog = ref(false);
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

/* -------------------- detail modal: same status/complexity presentation as the internal
   desk's complaint detail modal, just simplified for a citizen audience (no per-office
   acknowledgement compliance, no AI/admin assignment reasons — those are internal ops detail). */

const activeComplaintOffices = computed(() => (selected.value?.complaintOffices || []).filter(co => co.isActive));

const complexityLabel = (complexity) => (complexity || '').replace('_', ' ');

const evidenceSlide = ref(1);

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

const resolutionComplianceColor = computed(() => ({
    on_time: 'positive',
    late: 'negative',
    overdue: 'negative',
    awaiting: 'orange',
}[selected.value?.resolutionComplianceStatus] || 'grey'));

const resolutionComplianceTooltip = computed(() => {
    const d = selected.value;
    const deadline = d?.resolutionDeadline ? moment(d.resolutionDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (d.resolutionComplianceStatus === 'awaiting') return `Target resolution by ${deadline} (${complexityLabel(d.complexity)} tier).`;
    if (d.resolutionComplianceStatus === 'overdue') return `Target was ${deadline} — still not resolved.`;
    if (d.resolutionComplianceStatus === 'on_time') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — target was ${deadline}.`;
    if (d.resolutionComplianceStatus === 'late') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} target.`;
    return '';
});

/* -------------------- data -------------------- */

const loadComplaints = async () => {
    loading.value = true;
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
const followUpFiles = ref(null);
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
/* Same 75%-of-viewport sizing as the internal desk's modals on desktop, but that's an
   uncomfortably narrow strip on an actual phone — below ~600px wide, take the full screen
   instead (edge-to-edge, no rounded corners) like a native mobile sheet. */
.eps-modal-card {
    width: 75%;
    max-width: 100vw;
}
@media (max-width: 600px) {
    .eps-modal-card {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
    }
}
/* Pinned footer + scrolling body — same fixed-footer convention used for every other
   create/submit dialog in this app (e.g. the internal Discussion/Poll create modals): the
   submit button stays visible while the form above it scrolls, instead of living inline at the
   bottom of the content (which pushed it out of view on a long form) or stretching full-width. */
.eps-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.eps-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.eps-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
</style>
