<template>
    <div class="tone-discussion">
        <SectionHero
            icon="bi-people" :eyebrow="authed ? 'Join in' : 'open to every resident'" title="Discussions"
            :subtitle="authed ? 'Join the conversation on topics the City has opened up for public input.' : 'Read what residents are saying on topics the City has opened up. Sign in to join the conversation.'"
            :stats="authed ? stats : []"
        >
            <template v-if="authed">
                <button type="button" class="sh-act sh-act--main" @click="showOpen"><q-icon name="bi-chat-dots" />Join an open discussion</button>
                <router-link class="sh-act" to="/home/complaint?action=file"><q-icon name="bi-plus-lg" />File feedback</router-link>
            </template>
            <template v-else>
                <router-link class="sh-act sh-act--main" to="/login"><q-icon name="bi-box-arrow-in-right" />Sign in to join</router-link>
                <router-link class="sh-act" to="/register"><q-icon name="bi-person-plus" />Create an account</router-link>
            </template>
        </SectionHero>

        <!-- signed out: the list with the short "how it works" beside it, the same as the Feedback page -->
        <div :class="{ 'pt-split': isPublic }">
        <div>
            <div class="row items-center no-wrap q-mb-md">
                <div class="col">
                    <div class="pt-title" style="font-size: 20px;">Open for comment</div>
                    <div class="pt-sub">Topics the City has opened for public input. Your name is shown on what you post.</div>
                </div>
                <q-btn flat rounded no-caps color="primary" icon="bi-arrow-clockwise" label="Refresh" :loading="loading" @click="loadDiscussions" />
            </div>

        <q-input ref="searchBox" outlined dense rounded v-model="search" placeholder="Search title or description..." class="pt-search q-mb-sm">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>
        <div class="pt-chips q-mb-md">
            <button v-for="f in FILTERS" :key="f.value" type="button" class="pt-chip" :class="{ 'pt-chip--on': filter === f.value }" @click="filter = f.value">
                {{ f.label }} &middot; {{ countOf(f.value) }}
            </button>
        </div>

        <div v-if="loading && !discussions.length" class="row justify-center q-py-xl"><q-spinner-oval size="lg" color="primary" /></div>

        <div v-else-if="!discussions.length" class="pt-card pt-empty">
            <div class="pt-empty-ico"><q-icon name="bi-chat-left-text" /></div>
            <div class="pt-empty-t">No discussions yet</div>
            <div>The City has not opened a topic for comments. Please check back later.</div>
        </div>

        <div v-else-if="!filteredDiscussions.length" class="pt-card pt-empty">
            <div class="pt-empty-ico"><q-icon name="bi-funnel" /></div>
            <div class="pt-empty-t">Nothing in this view</div>
            <div>No discussion matches your search.</div>
        </div>

        <div v-else class="pt-rows">
            <div v-for="d in filteredDiscussions" :key="d.id" class="sc" :class="{ 'sc--closed': state(d) !== 'open' }" @click="openDetail(d.id)">
                <div class="sc-top">
                    <span class="sc-ico"><q-icon name="bi-people" /></span>
                    <div class="sc-main">
                        <div class="sc-type">discussion</div>
                        <div class="sc-title">{{ d.title }}</div>
                    </div>
                    <span class="pt-pill" :class="`pt-st-${state(d)}`">{{ state(d) }}</span>
                </div>
                <div class="sc-desc" v-if="d.description">{{ d.description }}</div>
                <div class="sc-foot">
                    <span class="sc-chip"><q-icon name="bi-chat-left-text" size="13px" />{{ d.commentCount }} comment{{ d.commentCount === 1 ? '' : 's' }}</span>
                    <span class="sc-go">{{ state(d) === 'open' ? 'Join in' : 'Read' }} <q-icon name="bi-arrow-right" /></span>
                </div>
            </div>
        </div>

        </div>
        <SideInfo v-if="isPublic" title="why join a discussion" :steps="SIDE_STEPS" icon="bi-file-earmark-text">Something to report instead? <router-link :to="isPublic ? '/file-complaint' : '/home/complaint?action=file'" class="text-primary">File feedback</router-link> — it's routed to the right department automatically.</SideInfo>
        </div>

        <!-- Detail — a modal (not a page navigation). Refreshing the list on close (@hide) matters
             because the modal never unmounts, so a new comment's updated count would otherwise only
             show after a manual page reload. -->
        <q-dialog v-model="detailDialog" persistent class="dialog" @hide="loadDiscussions">
            <q-card class="tone-discussion">
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">public discussion</div>
                        <div class="text-h5 text-uppercase">discussion information</div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>
                <q-card-section class="col scroll bg-accent">
                    <DiscussionThread :id="selectedId" hide-back />
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
import DiscussionThread from 'src/components/DiscussionThread.vue';
import SectionHero from 'src/components/SectionHero.vue';
import SideInfo from 'src/components/SideInfo.vue';
import { useAuthStore } from 'src/stores/auth-store';

const route = useRoute();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));
// outside the signed-in layout, the list sits beside a short "how it works"
const isPublic = computed(() => basePath.value !== '/home');
const SIDE_STEPS = [
    { title: 'Anyone can read', text: 'Every thread is open to read, whether or not you have an account.' },
    { title: 'Sign in to join', text: 'Comments are for signed-in residents, so your name is shown on what you post.' },
    { title: 'Opened by the City', text: 'Topics come from city offices on issues that affect the community, and stay open while active.' },
];

const detailDialog = ref(false);
const selectedId = ref(null);
const openDetail = (id) => {
    selectedId.value = id;
    detailDialog.value = true;
};

const loading = ref(false);
const discussions = ref([]);

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
// "Join an open discussion": show only the open ones and bring the list into view
const showOpen = () => {
    filter.value = 'open';
    searchBox.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
// the numbers in the band
const stats = computed(() => [
    { value: discussions.value.length, label: 'topics' },
    { value: discussions.value.filter(d => state(d) === 'open').length, label: 'open' },
    { value: discussions.value.reduce((n, d) => n + (d.commentCount || 0), 0), label: 'comments' },
]);
// "open" on the server but past its end date is expired: it is shown as such everywhere, and counts
// as closed (it takes no comments), the same as in its own window
const state = (d) => (d.status === 'open' && d.isExpired ? 'expired' : d.status);
const inGroup = (d, value) => !value || (value === 'open' ? state(d) === 'open' : state(d) !== 'open');
const countOf = (value) => discussions.value.filter(d => inGroup(d, value)).length;
const filteredDiscussions = computed(() => {
    const term = search.value.trim().toLowerCase();
    return discussions.value.filter(d =>
        inGroup(d, filter.value) &&
        (!term || (d.title || '').toLowerCase().includes(term) || (d.description || '').toLowerCase().includes(term))
    );
});

const loadDiscussions = async ({ quiet = false } = {}) => {
    if (!quiet) loading.value = true;
    try {
        const response = await api.get('/discussion');
        discussions.value = response.data.data || [];
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => loadDiscussions());

// a discussion opened, closed or commented on anywhere shows here without reloading the page
useLiveRefresh(['discussion'], () => loadDiscussions({ quiet: true }));
</script>
