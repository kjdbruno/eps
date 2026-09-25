<template>
    <div>
        <!-- On the guest page (top-level route) the title/subtitle already comes from AuthShell —
             this header is only needed in the authenticated dashboard, which has no title of its own. -->
        <div class="row items-center justify-between q-mb-sm" v-if="basePath === '/home'">
            <div class="row items-baseline q-gutter-xs">
                <div class="text-overline text-primary text-weight-bold">Have Your Say</div>
            </div>
        </div>
        <div class="row items-baseline q-gutter-xs q-mb-sm">
            <div class="text-h6 text-capitalize">polls</div>
            <div class="text-caption text-grey">{{ filteredPolls.length }} of {{ polls.length }}</div>
        </div>
        <q-input outlined dense v-model="search" placeholder="Search poll question..." class="q-mb-md">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>

        <q-card flat class="no-shadow custom-border radius-sm q-py-md">
            <q-list separator v-if="filteredPolls.length">
                <q-item
                    v-for="p in filteredPolls" :key="p.id"
                    clickable class="q-pa-md"
                    @click="openDetail(p.id)"
                >
                    <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" icon="bi-bar-chart" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label class="text-weight-bold">{{ p.question }}</q-item-label>
                        <q-item-label caption>{{ p.totalVotes }} vote(s)</q-item-label>
                    </q-item-section>
                    <q-item-section side top>
                        <q-badge outline :color="p.status === 'open' ? 'positive' : 'grey'" class="text-uppercase q-mb-xs">{{ p.status }}</q-badge>
                        <q-badge color="primary" v-if="p.hasVoted" class="text-uppercase">voted</q-badge>
                    </q-item-section>
                </q-item>
            </q-list>
            <div v-else-if="loading" class="q-pa-xl text-center text-grey">
                <q-spinner-ios size="1.5em" />
                <div class="text-caption text-uppercase q-mt-sm">loading polls...</div>
            </div>
            <div v-else class="q-pa-xl text-center text-grey">
                <q-icon name="bi-bar-chart" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no polls yet</div>
            </div>
        </q-card>

        <!-- Detail — a modal now (was a full page navigation), matching Complaint's pattern.
             PollVote itself is unchanged either way; hide-back just drops its own "back to all
             polls" link, which has no meaning inside a dialog you simply close. Refreshing the
             list on close (@hide) is new too — the list used to naturally refetch just by
             navigating back to it; as a modal it never unmounts, so a vote's updated tally/
             "voted" badge would otherwise only show after a manual page reload. -->
        <q-dialog v-model="detailDialog" full-height persistent @hide="loadPolls">
            <q-card class="column full-height eps-modal-card" style="border-radius: 20px;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">poll information</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section class="scroll" style="flex: 1">
                    <PollVote :id="selectedId" hide-back />
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { getGuestToken } from 'src/utils/guestToken';
import PollVote from 'src/components/PollVote.vue';

const route = useRoute();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));

const loading = ref(false);
const polls = ref([]);

const detailDialog = ref(false);
const selectedId = ref(null);
const openDetail = (id) => {
    selectedId.value = id;
    detailDialog.value = true;
};

const search = ref('');
const filteredPolls = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return polls.value;
    return polls.value.filter(p => (p.question || '').toLowerCase().includes(term));
});

const loadPolls = async () => {
    loading.value = true;
    try {
        const response = await api.get('/poll', { params: { guestToken: getGuestToken() } });
        polls.value = response.data.data || [];
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(loadPolls);
</script>

<style scoped>
/* Same 75%-of-viewport sizing as the Complaint modals, full-screen below ~600px — see
   ComplaintPage.vue for the original of this rule. */
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
</style>
