<template>
    <q-layout view="lHh Lpr lFf">
        
        <!-- One dense top bar for every page (same bar as the revapp apps): where you are on the left;
             the date, connection status, notifications and the account on the right. -->
        <q-header v-if="showHeader" class="app-hdr">
            <div class="app-hdr-in">
                <q-btn v-if="compact" flat round dense icon="bi-list" size="md" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />

                <nav class="app-crumb" aria-label="Where you are">
                    <span class="app-crumb-root">EPS</span>
                    <template v-for="(c, i) in crumbs" :key="i">
                        <q-icon name="bi-chevron-right" size="10px" class="app-crumb-sep" />
                        <span class="app-crumb-part" :class="{ 'app-crumb-part--now': i === crumbs.length - 1 }">{{ c }}</span>
                    </template>
                </nav>

                <q-space />

                <span class="app-date gt-xs"><q-icon name="bi-calendar3" size="13px" /> {{ todayLabel }}</span>

                <span class="app-live" :class="{ 'app-live--off': !authStore.isSocketConnected }">
                    <i /> <span class="gt-xs">{{ authStore.isSocketConnected ? 'Online' : 'Reconnecting…' }}</span>
                    <q-tooltip>{{ authStore.isSocketConnected ? 'Connected to the server' : 'Connection lost — reconnecting…' }}</q-tooltip>
                </span>

                <NotificationMenu @view-all="notificationModalOpen = true" />
                <MessageMenu />

                <button type="button" class="app-acct" aria-label="Account menu">
                    <span class="app-acct-av">
                        <img v-if="authStore.user?.avatar && !avatarFailed" :src="formatPhoto(authStore.user)" @error="avatarFailed = true">
                        <template v-else>{{ initials }}</template>
                    </span>
                    <span class="app-acct-name gt-xs">{{ displayName }}</span>
                    <q-icon name="bi-chevron-down" size="11px" class="app-acct-caret gt-xs" />

                    <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" class="app-acct-menu" transition-show="jump-down" transition-hide="jump-up">
                        <div class="app-acct-card">
                            <span class="app-acct-av app-acct-av--lg">
                                <img v-if="authStore.user?.avatar && !avatarFailed" :src="formatPhoto(authStore.user)" @error="avatarFailed = true">
                                <template v-else>{{ initials }}</template>
                            </span>
                            <div class="app-acct-who">
                                <div class="app-acct-fn">{{ displayName }}</div>
                                <div class="app-acct-role">{{ roleLabel }}</div>
                            </div>
                        </div>
                        <div class="app-acct-list">
                            <a v-close-popup href="#" class="app-acct-item" @click.prevent="notificationModalOpen = true"><q-icon name="bi-bell" size="18px" /> Notifications</a>
                            <a v-if="desktopState !== 'unsupported'" href="#" class="app-acct-item" @click.prevent="toggleDesktop">
                                <q-icon :name="desktopState === 'on' ? 'bi-window-desktop' : 'bi-window'" size="18px" />
                                <span class="col">Desktop notifications</span>
                                <span class="app-acct-state" :class="`app-acct-state--${desktopState}`">{{ desktopLabel }}</span>
                            </a>
                        </div>
                        <div class="app-acct-list app-acct-list--end">
                            <a v-close-popup href="#" class="app-acct-item app-acct-item--out" @click.prevent="authStore.logout()"><q-icon name="bi-power" size="18px" /> Sign out</a>
                        </div>
                    </q-menu>
                </button>
            </div>
        </q-header>

        <q-drawer show-if-above v-model="leftDrawerOpen" side="left" :width="compact ? 300 : width" :breakpoint="1024" v-if="authStore.isAuthenticated && router.currentRoute.value.name != 'login'">
            <div class="full-height bg-accent q-pa-xl column no-wrap">
                <!-- Menu (same nav as the revapp drawer): single pages, and a collapsible group for
                     Preference with one dotted sub-item per section. The group holding the current
                     page opens by itself. -->
                <div class="col dr-scroll">
                <q-list class="dr-list">
                    <template v-for="entry in navEntries" :key="entry.label">
                        <q-item
                            v-if="!entry.items" clickable class="dr-item radius-xl"
                            :class="{ 'dr-item--on': isActive(entry.label) }" @click="goTo(entry)"
                        >
                            <q-item-section avatar>
                                <q-icon :name="entry.icon" :color="isActive(entry.label) ? 'primary' : 'grey-8'" />
                            </q-item-section>
                            <q-item-section class="dr-label text-capitalize" :class="{ 'dr-label--on': isActive(entry.label) }">{{ entry.text }}</q-item-section>
                            <q-item-section side v-if="entry.badgeKey && navBadges[entry.badgeKey] > 0">
                                <q-badge color="negative" rounded>{{ navBadges[entry.badgeKey] }}</q-badge>
                            </q-item-section>
                        </q-item>

                        <template v-else>
                            <q-item clickable class="dr-item radius-xl" :class="{ 'dr-item--open': groupOpen(entry) }" @click="toggleGroup(entry)">
                                <q-item-section avatar>
                                    <q-icon :name="entry.icon" :color="groupActive(entry) ? 'primary' : 'grey-8'" />
                                </q-item-section>
                                <q-item-section class="dr-label text-capitalize" :class="{ 'dr-label--on': groupActive(entry) }">{{ entry.text }}</q-item-section>
                                <q-item-section side>
                                    <q-icon name="bi-chevron-down" size="13px" color="grey-6" class="dr-chevron" :class="{ 'dr-chevron--open': groupOpen(entry) }" />
                                </q-item-section>
                            </q-item>
                            <q-slide-transition>
                                <div v-show="groupOpen(entry)" class="dr-sub">
                                    <q-item
                                        v-for="item in entry.items" :key="item.to" clickable
                                        class="dr-subitem" :class="{ 'dr-subitem--on': isActive(item.name) }"
                                        @click="router.push(item.to)"
                                    >
                                        <q-item-section class="dr-sublabel">{{ item.label }}</q-item-section>
                                    </q-item>
                                </div>
                            </q-slide-transition>
                        </template>
                    </template>
                </q-list>
                </div>

                <!-- under the menu: what is waiting, quick links for the role, and the session -->
                <SidebarFooter :badges="navBadges" :allowed="navEntries.map(e => e.label)" @open="openEntry" />
            </div>
        </q-drawer>

        <q-page-container>
            <!-- the sign-in page fills the whole window by itself, so it gets no padding around it -->
            <q-page :class="route.name === 'login' ? 'q-pa-none' : 'q-pa-lg'">
                <router-view />
            </q-page>
        </q-page-container>

        <!-- Right-docked panel, same idiom as the Team panel's TeamMemberModal — replaces the old
             full-page NotificationPage.vue/'notification' route entirely (both removed). -->
        <NotificationModal v-model="notificationModalOpen" />

        <!-- an account that still has the password it was given has to choose its own before anything else -->
        <ForcePasswordDialog />
    </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { useQuasar } from 'quasar';
import { useIndexStore } from 'src/stores/index-store';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { usePreferenceStore } from 'src/stores/preference-store';
import { api } from 'src/boot/axios';
import NotificationModal from 'src/components/NotificationModal.vue';
import NotificationMenu from 'src/components/NotificationMenu.vue';
import MessageMenu from 'src/components/MessageMenu.vue';
import SidebarFooter from 'src/components/SidebarFooter.vue';
import ForcePasswordDialog from 'src/components/ForcePasswordDialog.vue';
import { desktopPermission, desktopMuted, setDesktopMuted, askDesktopPermission, showDesktopNotification } from 'src/utils/desktopNotify';
import { useMessageStore } from 'src/stores/message-store';
import { socket } from 'src/boot/socket';

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
const messageStore = useMessageStore();

const leftDrawerOpen = ref(false);
const width = ref(400);

const $q = useQuasar();
// compact = phones and small tablets: the menu slides over the page and the bar carries its button
const compact = computed(() => $q.screen.width < 1024);
const avatarFailed = ref(false);

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

// the counts beside Feedback, CSM report, Discussion and Survey follow what happens, without a page change
useLiveRefresh(['complaint', 'feedback', 'discussion', 'poll'], loadNavBadges);

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
// helper function to check if current route matches item label
const isActive = (label) => route.name?.toLowerCase() === label.toLowerCase()

// Preference's sections, in the order the drawer lists them — the same role split PreferencePage.vue
// and router/routes.js apply (Office/User super-only, Holiday super/admin).
const PREFERENCE_ITEMS = [
    { name: 'office preference', label: 'Office', to: '/preference/office', roles: ['super', 'admin'] },
    { name: 'user preference', label: 'User', to: '/preference/user', roles: ['super'] },
    { name: 'holiday preference', label: 'Holiday', to: '/preference/holiday', roles: ['super', 'admin'] },
    { name: 'canned preference', label: 'Canned messages', to: '/preference/canned', roles: ['super', 'admin'] },
    { name: 'client preference', label: 'Client accounts', to: '/preference/clients', roles: ['super', 'admin'] },
];

// One entry per drawer row: a plain page (has `to`), or a group (has `items`, opens/closes).
const navEntries = computed(() => {
    const role = authStore.user?.role;
    const preferenceItems = PREFERENCE_ITEMS.filter(i => i.roles.includes(role));
    return [
        { icon: 'bi-house', label: 'home', text: 'home', to: '/home' },
        { icon: 'bi-emoji-expressionless', label: 'feedback', text: 'CSM report', to: '/feedback', badgeKey: 'feedback' },
        { icon: 'bi-chat-quote', label: 'complaint', text: 'feedback', to: '/complaint', badgeKey: 'complaint' },
        { icon: 'bi-people', label: 'discussion', text: 'discussion', to: '/discussion', badgeKey: 'discussion' },
        { icon: 'bi-ui-checks', label: 'poll', text: 'survey', to: '/poll', badgeKey: 'poll' },
        ...(preferenceItems.length ? [{ icon: 'bi-sliders', label: 'preference', text: 'preference', items: preferenceItems }] : []),
        ...(['super', 'admin', 'monitoring'].includes(role) ? [{ icon: 'bi-file-earmark-bar-graph', label: 'report', text: 'report', to: '/report' }] : []),
    ];
});

const goTo = (entry) => {
    onNavClick(entry);
    router.push(entry.to);
};

// a link in the sidebar footer: opens the menu entry with that label, just as clicking it would
const openEntry = (label) => {
    const entry = navEntries.value.find(e => e.label === label);
    if (entry && entry.to) goTo(entry);
};

// An accordion: opening a group closes the one that was open. The group holding the current page
// opens by itself.
const openGroup = ref(null);
const groupActive = (group) => group.items.some(i => isActive(i.name));
const groupOpen = (group) => openGroup.value === group.label;
const toggleGroup = (group) => { openGroup.value = groupOpen(group) ? null : group.label; };
watch(() => route.name, () => {
    const holding = navEntries.value.find(e => e.items && groupActive(e));
    if (holding) openGroup.value = holding.label;
}, { immediate: true });

// ---------------------------------------------------------------- messages
// The Messages menu in the top bar lists the people you have talked to; choosing one opens their
// conversation on the Messages page. A message pushed live ('message:new') goes to the store: shown
// at once if that person's thread is open, counted as unread otherwise.
const onIncomingMessage = (message) => messageStore.receive(message, authStore.user?.id);
watch(() => authStore.isAuthenticated, (on) => {
    if (on) { messageStore.loadDirectory(); messageStore.loadConversations(); }
    else { messageStore.roster = []; messageStore.conversations = []; messageStore.closeThread(); }
}, { immediate: true });
onMounted(() => { socket.on('message:new', onIncomingMessage); });
onBeforeUnmount(() => { socket.off('message:new', onIncomingMessage); });

// ---------------------------------------------------------------- top bar
const showHeader = computed(() => authStore.isAuthenticated && route.name !== 'login');
// the pages under the fixed bar start below it (their sticky headers use this too)
watch(showHeader, (on) => { document.documentElement.style.setProperty('--app-hdr', on ? '48px' : '0px'); }, { immediate: true });

// a page with a full-height panel pinned on the right (the list rail, the team panel): the bar
// stops where the panel starts instead of running over it
const RAIL_SELECTOR = '.rc-rail-card, .cp-rail-card, .dp-rail-card, .fp-rail-card, .pp-rail-card, .hp-team-card';
const syncRail = () => {
    const el = document.querySelector(RAIL_SELECTOR);
    const fixed = el && getComputedStyle(el).position === 'fixed';
    document.documentElement.style.setProperty('--app-rail', fixed ? `${Math.round(el.getBoundingClientRect().width)}px` : '0px');
};
let railFrame = 0;
const queueSyncRail = () => { cancelAnimationFrame(railFrame); railFrame = requestAnimationFrame(syncRail); };
let railObserver = null;

// where you are: the drawer group and page, or just the page
const crumbs = computed(() => {
    for (const e of navEntries.value) {
        if (e.items) {
            const it = e.items.find(i => isActive(i.name));
            if (it) return [e.text, it.label];
        } else if (isActive(e.label)) {
            return [e.text];
        }
    }
    const n = String(route.name || '');
    return [n.charAt(0).toUpperCase() + n.slice(1)];
});

const today = ref(new Date());
let dayTimer = null;
const todayLabel = computed(() => today.value.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
onMounted(() => {
    dayTimer = setInterval(() => { today.value = new Date(); }, 60000);
    railObserver = new MutationObserver(queueSyncRail);
    railObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', queueSyncRail);
    queueSyncRail();
});
onBeforeUnmount(() => {
    clearInterval(dayTimer);
    railObserver?.disconnect();
    window.removeEventListener('resize', queueSyncRail);
    document.documentElement.style.removeProperty('--app-rail');
});

const displayName = computed(() => {
    const u = authStore.user || {};
    return u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : (u.username || '');
});
const initials = computed(() => displayName.value.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2));
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation', monitoring: 'Monitoring' };
const roleLabel = computed(() => ROLE_LABELS[authStore.user?.role] || authStore.user?.role || '');

const formatPhoto = (user) => {
    return `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`
}

const formatName = (user) => {
    if (!authStore.user) return ''
    return `${authStore.user.firstname} ${authStore.user.lastname}`
}


// ---- desktop notifications: the card from the operating system, switched on from the account menu ----
const desktopPerm = ref(desktopPermission());
const desktopOff = ref(desktopMuted());
// 'on' | 'off' (switched off here) | 'ask' (not asked yet) | 'blocked' (the browser says no) | 'unsupported'
const desktopState = computed(() => {
    if (desktopPerm.value === 'unsupported') return 'unsupported';
    if (desktopPerm.value === 'denied') return 'blocked';
    if (desktopPerm.value === 'default') return 'ask';
    return desktopOff.value ? 'off' : 'on';
});
const desktopLabel = computed(() => ({ on: 'On', off: 'Off', ask: 'Turn on', blocked: 'Blocked' }[desktopState.value] || ''));
const toggleDesktop = async () => {
    if (desktopState.value === 'blocked') {
        $q.notify({ type: 'warning', message: 'Desktop notifications are blocked. Allow them for this site in your browser settings (the lock icon beside the address).' });
        return;
    }
    if (desktopState.value === 'on') {
        setDesktopMuted(true);
        desktopOff.value = true;
        return;
    }
    desktopPerm.value = await askDesktopPermission();
    desktopOff.value = desktopMuted();
    if (desktopState.value === 'on') {
        // a sample card right away, so they can see what it looks like
        showDesktopNotification({ title: 'eParticipation System', body: 'Desktop notifications are on. You will see new feedback and messages here.', tag: 'eps-welcome', force: true });
    }
};
</script>

<style scoped>
/* the drawer menu — the revapp nav: pill rows, dark labels, the open page in the primary colour,
   and a group's pages as a thin line with a small dot each */
.dr-list { display: flex; flex-direction: column; padding: 0; }
/* the menu scrolls by itself, so the footer under it stays in view */
.dr-scroll { min-height: 0; overflow-y: auto; }
.dr-item { min-height: 44px; padding-top: 0; padding-bottom: 0; margin-bottom: 2px; }
.dr-item--on { background: rgba(0, 78, 168, .06); }
/* no hover shading anywhere in the menu: only the open page and the open group are marked */
.dr-item :deep(.q-focus-helper), .dr-subitem :deep(.q-focus-helper) { display: none !important; }
.dr-item:hover, .dr-subitem:hover { background: transparent; }
.dr-item--on:hover { background: rgba(0, 78, 168, .06); }
.dr-item--open, .dr-item--open:hover { background: #E9EFF8; }
.dr-label { font-size: 14px; font-weight: 600; letter-spacing: 0; color: #16233A; }
.dr-label--on { color: var(--q-primary); }
.dr-chevron { transition: transform .2s; }
.dr-chevron--open { transform: rotate(180deg); }

.dr-sub { position: relative; margin: 2px 0 6px 20px; padding: 2px 0; }
.dr-sub::before { content: ''; position: absolute; left: 4px; top: 0; bottom: 0; width: 1px; background: #D3DAE6; }
.dr-subitem { position: relative; min-height: 34px; padding: 0 8px 0 28px; border-radius: 8px; background: transparent; }
.dr-subitem::before { content: ''; position: absolute; left: 1px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: #C3CCDB; transition: background .15s, transform .15s; }
.dr-sublabel { font-size: 14px; letter-spacing: 0; color: #4B5568; }
.dr-subitem--on::before { left: 0; width: 9px; height: 9px; margin-top: -4.5px; background: var(--q-primary); }
.dr-subitem--on .dr-sublabel { color: #16233A; font-weight: 700; }

/* the dense top bar */
.app-hdr { background: #fff; color: #1E2A44; border-bottom: 1px solid #E4EAF3; height: 48px; right: var(--app-rail, 0px) !important; width: auto !important; }
.app-hdr-in { height: 48px; display: flex; align-items: center; gap: 6px; padding: 0 14px 0 28px; }
@media (max-width: 1023px) { .app-hdr-in { padding-left: 8px; } }
.app-hdr-btn { color: #4C5C79; }
.app-crumb { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; font-weight: 600; color: #6B7A99; white-space: nowrap; }
.app-crumb-root { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--q-primary); }
.app-crumb-sep { color: #B3BED2; }
.app-crumb-part { text-transform: capitalize; }
.app-crumb-part--now { color: var(--q-primary); font-weight: 800; padding: 3px 12px; border-radius: 99px; background: #E5EEFC; }
.app-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #6B7A99; margin-right: 6px; }
.app-live { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; margin-right: 4px; border-radius: 99px; background: #E8F7EE; color: #1B7A43; font-size: 12px; font-weight: 700; }
.app-live i { width: 7px; height: 7px; border-radius: 50%; background: #21BA45; box-shadow: 0 0 0 3px rgba(33, 186, 69, .2); }
.app-live--off { background: #FDECEE; color: #C10015; }
.app-live--off i { background: #C10015; box-shadow: 0 0 0 3px rgba(193, 0, 21, .18); }
.app-acct { display: inline-flex; align-items: center; gap: 8px; margin-left: 4px; padding: 3px 11px 3px 3px; border: 1px solid #DCE5F3; border-radius: 99px; background: #fff; color: #1E2A44; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color .12s, box-shadow .12s; }
.app-acct:hover { border-color: var(--q-primary); box-shadow: 0 2px 10px rgba(0, 78, 168, .12); }
.app-acct:focus-visible { outline: 2px solid var(--q-primary); outline-offset: 2px; }
@media (max-width: 599px) { .app-acct { padding-right: 3px; } }
.app-acct-av { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: var(--q-primary); color: #fff; font-size: 11.5px; font-weight: 800; letter-spacing: .3px; overflow: hidden; }
.app-acct-av img { width: 100%; height: 100%; object-fit: cover; }
.app-acct-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: capitalize; }
.app-acct-caret { color: #6B7A99; }
</style>

<style>
/* the account menu is drawn outside the bar, so its look is not scoped */
.app-acct-menu { border-radius: 16px !important; box-shadow: 0 14px 40px rgba(0, 48, 107, .18) !important; border: 1px solid #E6ECF6; min-width: 250px; overflow: hidden; }
.app-acct-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #F2F6FD, #E8EFFB); }
.app-acct-card .app-acct-av { flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--q-primary); color: #fff; font-weight: 800; overflow: hidden; }
.app-acct-card .app-acct-av img { width: 100%; height: 100%; object-fit: cover; }
.app-acct-card .app-acct-av--lg { width: 42px; height: 42px; font-size: 15px; }
.app-acct-who { min-width: 0; }
.app-acct-fn { font-size: 14px; font-weight: 800; color: #1E2A44; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-acct-role { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6B7A99; }
.app-acct-state { flex: none; padding: 1px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; background: #F1F2F5; color: #6B7488; }
.app-acct-state--on { background: #E4F6EA; color: #1C6B35; }
.app-acct-state--ask { background: #E5EEFC; color: #2557B3; }
.app-acct-state--blocked { background: #FCE8E6; color: #A52E22; }
.app-acct-list { padding: 6px; }
.app-acct-list--end { border-top: 1px solid #EEF2F8; }
.app-acct-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: #2B3A57; font-size: 13.5px; font-weight: 600; text-decoration: none; cursor: pointer; }
.app-acct-item .q-icon { color: #6B7A99; }
.app-acct-item:hover { background: #F2F6FD; color: var(--q-primary); }
.app-acct-item:hover .q-icon { color: var(--q-primary); }
.app-acct-item--out, .app-acct-item--out .q-icon { color: #C10015; }
.app-acct-item--out:hover { background: #FDECEE; color: #C10015; }
.app-acct-item--out:hover .q-icon { color: #C10015; }
</style>
