<template>
    <div class="tone-survey">
        <SectionHero
            icon="bi-ui-checks" :eyebrow="authed ? 'Have your say' : 'open to every resident'" title="Surveys"
            :subtitle="authed ? 'Answer surveys and help shape decisions for the City.' : 'See the surveys the City has opened for residents. Sign in to answer them.'"
            :stats="authed ? stats : []"
        >
            <template v-if="authed">
                <button type="button" class="sh-act sh-act--main" @click="showOpen"><q-icon name="bi-check2-square" />Answer an open survey</button>
                <router-link class="sh-act" to="/home/complaint?action=file"><q-icon name="bi-plus-lg" />File feedback</router-link>
            </template>
            <template v-else>
                <router-link class="sh-act sh-act--main" to="/login"><q-icon name="bi-box-arrow-in-right" />Sign in to answer</router-link>
                <router-link class="sh-act" to="/register"><q-icon name="bi-person-plus" />Create an account</router-link>
            </template>
        </SectionHero>

        <!-- signed out: the list with the short "how it works" beside it, the same as the Feedback page -->
        <div :class="{ 'pt-split': isPublic }">
        <div>
            <div class="row items-center no-wrap q-mb-md">
                <div class="col">
                    <div class="pt-title" style="font-size: 20px;">Open for answers</div>
                    <div class="pt-sub">Questions the City is asking. You see the results after you answer.</div>
                </div>
                <q-btn flat rounded no-caps color="primary" icon="bi-arrow-clockwise" label="Refresh" :loading="loading" @click="loadPolls" />
            </div>

        <q-input ref="searchBox" outlined dense rounded v-model="search" placeholder="Search surveys..." class="pt-search q-mb-sm">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>
        <div class="pt-chips q-mb-md">
            <button v-for="f in FILTERS" :key="f.value" type="button" class="pt-chip" :class="{ 'pt-chip--on': filter === f.value }" @click="filter = f.value">
                {{ f.label }} &middot; {{ countOf(f.value) }}
            </button>
        </div>

        <div v-if="loading && !polls.length" class="row justify-center q-py-xl"><q-spinner-oval size="lg" color="primary" /></div>

        <div v-else-if="!polls.length" class="pt-card pt-empty">
            <div class="pt-empty-ico"><q-icon name="bi-ui-checks" /></div>
            <div class="pt-empty-t">No surveys yet</div>
            <div>The City has not opened a survey. Please check back later.</div>
        </div>

        <div v-else-if="!filteredPolls.length" class="pt-card pt-empty">
            <div class="pt-empty-ico"><q-icon name="bi-funnel" /></div>
            <div class="pt-empty-t">Nothing in this view</div>
            <div>No survey matches your search.</div>
        </div>

        <div v-else class="pt-rows">
            <div v-for="p in filteredPolls" :key="p.id" class="sc" :class="{ 'sc--closed': state(p) !== 'open' }" @click="openDetail(p.id)">
                <div class="sc-top">
                    <span class="sc-ico"><q-icon name="bi-ui-checks" /></span>
                    <div class="sc-main">
                        <div class="sc-type">survey</div>
                        <div class="sc-title">{{ p.question }}</div>
                    </div>
                    <span class="pt-pill" :class="`pt-st-${state(p)}`">{{ state(p) }}</span>
                </div>
                <div class="sc-foot">
                    <span class="sc-chips">
                        <span class="sc-chip"><q-icon name="bi-ui-checks" size="13px" />{{ p.questionCount || 1 }} question{{ (p.questionCount || 1) === 1 ? '' : 's' }}</span>
                        <span class="sc-chip"><q-icon name="bi-people" size="13px" />{{ p.totalVotes }} response{{ p.totalVotes === 1 ? '' : 's' }}</span>
                        <span v-if="p.hasVoted" class="sc-chip"><q-icon name="bi-check-circle-fill" size="13px" />you answered</span>
                    </span>
                    <span class="sc-go">{{ p.hasVoted || state(p) !== 'open' ? 'See results' : 'Answer' }} <q-icon name="bi-arrow-right" /></span>
                </div>
            </div>
        </div>

        </div>
        <SideInfo v-if="isPublic" title="why answer" :steps="SIDE_STEPS" icon="bi-people">Have more to say? <router-link :to="isPublic ? '/discussion' : '/home/discussion'" class="text-primary">Join a discussion</router-link> and share your thoughts in full.</SideInfo>
        </div>

        <!-- Detail — a modal (not a page navigation). Refreshing the list on close (@hide) matters
             because the modal never unmounts, so a vote's updated tally / "voted" badge would
             otherwise only show after a manual page reload. -->
        <q-dialog v-model="detailDialog" persistent class="dialog" @hide="loadPolls">
            <q-card class="tone-survey">
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">public survey</div>
                        <div class="text-h5 text-uppercase">survey information</div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>
                <q-card-section class="col scroll bg-accent">
                    <PollVote :id="selectedId" hide-back />
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { getGuestToken } from 'src/utils/guestToken';
import PollVote from 'src/components/PollVote.vue';
import SectionHero from 'src/components/SectionHero.vue';
import SideInfo from 'src/components/SideInfo.vue';
import { useAuthStore } from 'src/stores/auth-store';

const route = useRoute();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));
// outside the signed-in layout, the list sits beside a short "how it works"
const isPublic = computed(() => basePath.value !== '/home');
const SIDE_STEPS = [
    { title: 'Sign in to answer', text: 'Anyone can read the surveys; answering needs an account, with one response each.' },
    { title: 'Results after you vote', text: 'Keeps your answers honest: you see the running results only after giving your own.' },
    { title: 'Real decisions', text: 'City offices ask these about things they are actually weighing, so your answers count.' },
];

const loading = ref(false);
const polls = ref([]);

const detailDialog = ref(false);
const selectedId = ref(null);
const openDetail = (id) => {
    selectedId.value = id;
    detailDialog.value = true;
};

const search = ref('');
const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
];
const filter = ref('');

const AuthStore = useAuthStore();
const authed = computed(() => AuthStore.isAuthenticated);
const searchBox = ref(null);
// "Vote on an open poll": show only the open ones and bring the list into view
const showOpen = () => {
    filter.value = 'open';
    searchBox.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
// the numbers in the band
const stats = computed(() => [
    { value: polls.value.length, label: 'surveys' },
    { value: polls.value.filter(p => state(p) === 'open').length, label: 'open' },
    { value: polls.value.reduce((n, p) => n + (p.totalVotes || 0), 0), label: 'responses' },
]);
// "open" on the server but past its end date is expired: it is shown as such everywhere, and counts
// as closed (it takes no votes), the same as in its own window
const state = (p) => (p.status === 'open' && p.isExpired ? 'expired' : p.status);
const inGroup = (p, value) => !value || (value === 'open' ? state(p) === 'open' : state(p) !== 'open');
const countOf = (value) => polls.value.filter(p => inGroup(p, value)).length;
const filteredPolls = computed(() => {
    const term = search.value.trim().toLowerCase();
    return polls.value.filter(p =>
        inGroup(p, filter.value) &&
        (!term || (p.question || '').toLowerCase().includes(term))
    );
});

const loadPolls = async ({ quiet = false } = {}) => {
    if (!quiet) loading.value = true;
    try {
        const response = await api.get('/poll', { params: { guestToken: getGuestToken() } });
        polls.value = response.data.data || [];
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => loadPolls());

// a survey opened, closed or answered anywhere shows here without reloading the page
useLiveRefresh(['poll'], () => loadPolls({ quiet: true }));
</script>
