<template>
    <div>
        <q-btn
            v-if="!hideBack" flat dense no-caps size="sm" color="primary" icon="bi-arrow-left" label="all polls"
            :to="`${basePath}/poll`" class="q-mb-md"
        />

        <!-- Patterned after the internal desk's poll detail modal: eyebrow + title + status pill
             header, bg-accent section for voting/results. Single column throughout so it reads
             naturally on a phone-width screen. -->
        <q-card class="no-shadow pv-card" v-if="poll">
            <div class="row items-start justify-between q-gutter-sm q-mb-md">
                <div>
                    <div class="pv-eyebrow">public poll &middot; topic detail</div>
                    <div class="text-h5">{{ poll.question }}</div>
                    <div class="row items-center q-gutter-xs q-mt-xs">
                        <span class="pv-pill" :style="statusPillStyle(poll)">{{ statusLabel(poll) }}</span>
                        <span class="pv-pill pv-pill--office" v-for="o in poll.offices" :key="o.id">{{ o.alias || o.name }}</span>
                        <span class="text-caption text-grey" v-if="poll.expiresAt">
                            {{ poll.isExpired ? 'expired' : 'expires' }} {{ formatDate(poll.expiresAt) }}
                        </span>
                    </div>
                </div>
                <div class="text-caption text-grey">{{ poll.totalVotes }} vote(s)</div>
            </div>

            <q-card-section class="q-pa-md radius-sm bg-accent" style="border-radius: 15px;">
                <!-- not yet voted, poll still genuinely open (status AND not expired): show choices -->
                <template v-if="!poll.hasVoted && canVote">
                    <q-option-group v-model="selectedOptionId" :options="optionModel" color="primary" class="q-mb-md" />
                    <div class="text-negative text-caption q-mb-sm" v-if="error">{{ error }}</div>
                    <q-btn unelevated color="primary" no-caps label="submit vote" class="full-width" :disable="!selectedOptionId" :loading="voting" @click="submitVote" />
                </template>

                <!-- already voted, or poll closed/expired: show results -->
                <template v-else>
                    <div v-for="o in poll.options" :key="o.id" class="q-mb-md">
                        <div class="row items-center q-mb-xs">
                            <div class="text-body2" :class="o.id === poll.myOptionId ? 'text-primary text-weight-bold' : ''">
                                {{ o.label }}
                                <q-icon name="bi-check-circle-fill" color="primary" size="xs" class="q-ml-xs" v-if="o.id === poll.myOptionId" />
                            </div>
                            <q-space />
                            <div class="text-caption text-grey">{{ o.votes }} ({{ o.percent }}%)</div>
                        </div>
                        <q-linear-progress :value="(o.percent || 0) / 100" color="primary" track-color="grey-3" size="10px" rounded />
                    </div>
                    <div class="text-caption text-grey" v-if="poll.hasVoted">Thanks for voting!</div>
                    <div class="text-caption text-grey" v-else-if="!canVote">
                        <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                        This poll is closed to new votes.
                    </div>
                </template>
            </q-card-section>
        </q-card>

        <div class="text-center q-pa-lg" v-else-if="loading">
            <q-spinner-ios size="1.5em" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { getGuestToken } from 'src/utils/guestToken';
import moment from 'moment';

// id/hideBack let this same component serve two contexts: standalone on its own route (default —
// id falls back to route.params.id, back button shown) and embedded as modal content from
// PollList.vue (id passed explicitly, hideBack set — there's no "back", just closing the dialog).
const props = defineProps({
    id: { type: [String, Number], default: null },
    hideBack: { type: Boolean, default: false },
});

const route = useRoute();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));
const pollId = computed(() => props.id ?? route.params.id);

const loading = ref(false);
const poll = ref(null);
const selectedOptionId = ref(null);
const voting = ref(false);
const error = ref('');

const optionModel = computed(() => (poll.value?.options || []).map(o => ({ label: o.label, value: o.id })));

// A poll can be "open" in status but past its own expiresAt — the backend rejects a vote either
// way (see PollController.vote), so the ballot has to check both, not just status.
const canVote = computed(() => poll.value?.status === 'open' && !poll.value?.isExpired);
const statusLabel = (p) => (p.status === 'open' && p.isExpired) ? 'expired' : p.status;
const statusPillStyle = (p) => {
    if (p.status === 'open' && p.isExpired) return { background: '#FBF1D9', color: '#9A6B00' };
    if (p.status === 'open') return { background: '#E4F5E9', color: '#1C8A3B' };
    return { background: '#F6F9FC', color: '#8493AC' };
};

const formatDate = (timestamp) => moment(timestamp).fromNow();

const loadPoll = async () => {
    if (!pollId.value) return;
    loading.value = true;
    poll.value = null;
    try {
        const response = await api.get(`/poll/${pollId.value}`, { params: { guestToken: getGuestToken() } });
        poll.value = response.data.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const submitVote = async () => {
    error.value = '';
    if (!selectedOptionId.value) return;
    voting.value = true;
    try {
        const response = await api.post(`/poll/${pollId.value}/vote`, {
            optionId: selectedOptionId.value,
            guestToken: getGuestToken()
        });
        poll.value = response.data.data;
    } catch (e) {
        error.value = e.response?.data?.message || 'Unable to record your vote.';
    } finally {
        voting.value = false;
    }
};

// One reactive source drives loading, whether the id comes from the route (standalone page) or
// changes because PollList.vue reused this same component instance across clicks on different
// rows (modal mode). immediate: true covers the initial mount, so a separate onMounted isn't
// needed. Reset the in-progress ballot/error on every id change too, or a selection or stale
// error from the previous poll would carry over into this one.
watch(pollId, (newId) => {
    if (!newId) return;
    selectedOptionId.value = null;
    error.value = '';
    loadPoll();
}, { immediate: true });
</script>

<style scoped>
.pv-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.pv-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.pv-pill--office {
    background: #F6F9FC;
    color: #4C5C79;
}
@media (max-width: 600px) {
    .pv-card {
        padding: 16px !important;
    }
}
</style>
