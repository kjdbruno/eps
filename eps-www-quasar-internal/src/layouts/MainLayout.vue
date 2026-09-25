<template>
    <q-layout view="lHh Lpr lFf">
        
        <q-drawer show-if-above v-model="leftDrawerOpen" side="left" :width="width" v-if="authStore.isAuthenticated && router.currentRoute.value.name != 'login'">
            <div class="full-height bg-accent q-pa-xl column no-wrap" style="overflow-y: auto;">
                <q-list>
                    <q-item clickable v-ripple class="q-pa-lg radius-xs" v-for="item in menuItems" :key="item.label" :to="item.to" @click="onNavClick(item)">
                        <q-item-section avatar>
                            <q-icon :name="item.icon" :src="isActive(item.label) ? item.iconPrimary : item.iconSecondary" :color="isActive(item.label) ? 'primary' : 'grey'" width="25" />
                        </q-item-section>
                        <q-item-section class="text-uppercase" :class="isActive(item.label) ? 'text-primary' : 'text-grey'"> {{ item.text }}</q-item-section>
                        <q-item-section side v-if="item.badgeKey && navBadges[item.badgeKey] > 0">
                            <q-badge color="negative" rounded>{{ navBadges[item.badgeKey] }}</q-badge>
                        </q-item-section>
                    </q-item>
                </q-list>
            </div>
            <div class="absolute-bottom bg-accent full-width">
                <div class="text-center q-pa-lg q-pb-md">
                    <q-avatar class="q-mb-sm relative-position">
                        <img :src="formatPhoto(authStore.user)">
                        <q-icon
                            :name="authStore.isSocketConnected ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"
                            :color="authStore.isSocketConnected ? 'positive' : 'negative'"
                            class="status-icon"
                            size="xs"
                        >
                            <q-tooltip>{{ authStore.isSocketConnected ? 'Online' : 'Offline — reconnecting…' }}</q-tooltip>
                        </q-icon>
                    </q-avatar>
                    <div class="text-weight-bold text-uppercase text-body1">{{ formatName(authStore.user) }}</div>
                    <div class="text-caption text-grey">{{ authStore.user.username }}</div>
                </div>
                <div class="row justify-center q-gutter-sm q-pb-lg">
                    <q-btn round flat icon="bi-bell" text-color="grey" class="bg-white" @click="notificationModalOpen = true">
                        <q-badge color="negative" floating rounded v-if="authStore.notificationCount">{{ authStore.notificationCount }}</q-badge>
                        <q-tooltip>Notifications</q-tooltip>
                    </q-btn>
                    <!-- <q-btn round flat size="1em" icon="bi-chat" text-color="grey" class="bg-white" @click="goToMessages">
                        <q-tooltip>Messages</q-tooltip>
                    </q-btn> -->
                    <q-btn round flat icon="bi-power" text-color="grey" class="bg-white" @click="authStore.logout()">
                        <q-tooltip>Logout</q-tooltip>
                    </q-btn>
                </div>
            </div>
        </q-drawer>

        <q-page-container>
            <q-page class="q-pa-lg">
                <router-view />
            </q-page>
        </q-page-container>

        <!-- Right-docked panel, same idiom as the Team panel's TeamMemberModal — replaces the old
             full-page NotificationPage.vue/'notification' route entirely (both removed). -->
        <NotificationModal v-model="notificationModalOpen" />

    </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useIndexStore } from 'src/stores/index-store';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { usePreferenceStore } from 'src/stores/preference-store';
import { api } from 'src/boot/axios';
import NotificationModal from 'src/components/NotificationModal.vue';

import logo from 'src/assets/epslogo.png';

import Home from 'src/assets/icons/Home.png';
import HomeActive from 'src/assets/icons/HomeActive.png';
import Setting from 'src/assets/icons/Setting.png';
import SettingActive from 'src/assets/icons/SettingActive.png';
import Feedback from 'src/assets/icons/Feedback.png';
import FeedbackActive from 'src/assets/icons/FeedbackActive.png';
import Complaint from 'src/assets/icons/Complaint.png';
import ComplaintActive from 'src/assets/icons/ComplaintActive.png';
import Print from 'src/assets/icons/Print.png';
import PrintActive from 'src/assets/icons/PrintActive.png';

const indexStore = useIndexStore();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const PreferenceStore = usePreferenceStore();

const leftDrawerOpen = ref(false);
const width = ref(400);

function toggleLeftDrawer () {
    leftDrawerOpen.value = !leftDrawerOpen.value
}

// Notifications now open in a right-docked modal (see NotificationModal.vue), same idiom as the
// Team panel's member modal, instead of navigating to the old full-page NotificationPage.vue.
// Messages moved the same way earlier (to the Team panel) — goToMessages is dead along with the
// commented-out button above; both are left here only because MessagePage.vue/its route are
// still around, unlinked, in case anything else ever points at them directly.
const notificationModalOpen = ref(false);
const goToMessages = () => router.push({ name: 'message' });

// Left-nav badges — feedback/discussion/poll are "new since you last opened that section"
// (server-tracked per user via NavLastSeen), complaint is a live count of offices still holding
// an unreceived complaint right now (never clears just by visiting). See NavBadgeController.
const navBadges = ref({ feedback: 0, complaint: 0, discussion: 0, poll: 0 });
// Sections whose badge clears when opened — complaint deliberately excluded, see above.
const TIME_BASED_BADGE_SECTIONS = ['feedback', 'discussion', 'poll'];

const loadNavBadges = async () => {
    try {
        const { data } = await api.get('/nav-badges');
        navBadges.value = data.data || navBadges.value;
    } catch (error) {
        console.error('Error loading nav badges:', error);
    }
};

const onNavClick = (item) => {
    if (!item.badgeKey || !TIME_BASED_BADGE_SECTIONS.includes(item.badgeKey)) return;
    navBadges.value = { ...navBadges.value, [item.badgeKey]: 0 };
    api.post('/nav-badges/seen', { section: item.badgeKey }).catch(error => {
        console.error('Error marking nav section seen:', error);
    });
};

onMounted(() => {
    loadNavBadges();
});

// Refetch on every navigation — keeps the complaint badge (a live count) current, and re-syncs
// the other three in case they changed elsewhere (e.g. a socket-pushed update) since mount.
watch(() => route.fullPath, loadNavBadges);

// "report" was pointing at /print (a route that doesn't exist) — fixed to /report, and gated to
// super/admin/monitoring since every /report/* endpoint enforces that role server-side (monitoring
// is read-only oversight — it can see Report, just never transact anywhere — see AuthMiddleware.js).
// "preference" is hidden from anyone who couldn't open a single tab in it: workstation, monitoring,
// and citizen have no preference access at all now (Office/User are super-only; Holiday is
// super/admin) — see PreferencePage.vue for the same role split applied to its own tab list.
// `label` stays the internal identifier (matches the route name / badgeKey — see isActive and
// navBadges below); `text` is the only thing rendered. The Complaint module now brands itself
// "Feedback" in the UI, and the old Feedback (CSM) module now brands itself "CSM Report" — the
// route names, badge keys, and everything server-side are unchanged, only the label a user reads.
const menuItems = computed(() => [
    { icon: 'bi-house', label: 'home', text: 'home', to: '/home' },
    { icon: 'bi-emoji-expressionless', label: 'feedback', text: 'CSM report', to: '/feedback', badgeKey: 'feedback' },
    { icon: 'bi-chat-quote', label: 'complaint', text: 'feedback', to: '/complaint', badgeKey: 'complaint' },
    { icon: 'bi-people', label: 'discussion', text: 'discussion', to: '/discussion', badgeKey: 'discussion' },
    { icon: 'bi-bar-chart-line', label: 'poll', text: 'poll', to: '/poll', badgeKey: 'poll' },
    ...(['super', 'admin'].includes(authStore.user?.role) ? [{ icon: 'bi-sliders', label: 'preference', text: 'preference', to: '/preference' }] : []),
    ...(['super', 'admin', 'monitoring'].includes(authStore.user?.role) ? [{ icon: 'bi-file-earmark-bar-graph', label: 'report', text: 'report', to: '/report' }] : []),
])

// helper function to check if current route matches item label
const isActive = (label) => route.name?.toLowerCase() === label.toLowerCase()

const formatPhoto = (user) => {
    return `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`
}

const formatName = (user) => {
    if (!authStore.user) return ''
    return `${authStore.user.firstname} ${authStore.user.lastname}`
}

</script>
