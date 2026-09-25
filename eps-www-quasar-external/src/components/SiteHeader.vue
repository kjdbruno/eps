<template>
    <q-header class="bg-white custom-border" bordered>
        <div class="gradient-bar" />
        <q-toolbar class="q-py-md" :class="$q.screen.gt.xs ? 'q-px-xl' : 'q-px-sm'">
            <router-link :to="authStore.isAuthenticated ? '/home' : '/'" class="row items-center no-decoration">
                <img src="../assets/epslogo.png" width="32" class="q-mr-sm" />
                <div>
                    <div class="text-body1 text-weight-bold text-dark" style="line-height: 1.2;">eParticipation System</div>
                </div>
            </router-link>

            <q-space />

            <div class="row items-center q-gutter-md gt-xs">
                <router-link :to="authStore.isAuthenticated ? '/home' : '/'" class="nav-link">Home</router-link>
                <router-link :to="complaintTo" class="nav-link">Feedback</router-link>
                <router-link to="/discussion" class="nav-link">Discussion</router-link>
                <router-link to="/poll" class="nav-link">Poll</router-link>
                <template v-if="authStore.isAuthenticated">
                    <q-btn flat size="md" rounded no-caps class="text-body2 text-weight-medium text-dark text-capitalize" :label="authStore.user?.firstname" >
                        <q-menu :offset="[0, 5]" class="radius-md no-shadow custom-border" square>
                            <q-list style="min-width: 150px;">
                                <q-item clickable v-close-popup @click="authStore.logout()">
                                    <q-item-section avatar>
                                        <q-icon name="bi-power" size="xs" />
                                    </q-item-section>
                                    <q-item-section>Sign out</q-item-section>
                                </q-item>
                            </q-list>
                        </q-menu>
                    </q-btn>
                    <q-btn icon="bi-bell" text-color="grey" flat round>
                        <q-badge color="negative" floating rounded v-if="authStore.notificationCount">
                            {{ authStore.notificationCount }}
                        </q-badge>
                        <q-menu :offset="[5, 5]" class="radius-md no-shadow custom-border" square @show="openTray">
                            <q-card square class="no-shadow radius-md" style="width: 350px;">
                                <q-card-section>
                                    <div class="text-uppercase text-h6 text-center">my notifications</div>
                                </q-card-section>
                                <q-separator />
                                <q-card-section class="q-pa-none" style="max-height: 60vh; overflow-y: auto;">
                                    <div v-if="trayLoading && !trayItems.length" class="text-center q-pa-md">
                                        <q-spinner-ios color="primary" size="1.5em" />
                                    </div>
                                    <div v-else-if="!trayItems.length" class="text-center text-caption text-grey q-pa-md">
                                        you're all caught up
                                    </div>
                                    <q-list v-else>
                                        <q-item v-for="(dt, index) in trayItems" :key="dt.id ?? index" class="q-mb-sm">
                                            <q-item-section avatar>
                                                <q-icon
                                                    :name="dt.isRead ? 'bi-bell' : 'bi-bell-fill'"
                                                    size="sm"
                                                    :color="dt.isRead ? 'grey' : 'primary'"
                                                />
                                            </q-item-section>
                                            <q-item-section>
                                                <q-item-label>{{ dt.content }}</q-item-label>
                                                <q-item-label caption lines="1">{{ formatDate(dt.createdAt) }}</q-item-label>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-card-section>
                            </q-card>
                        </q-menu>
                    </q-btn>
                </template>
                <template v-else>
                    <router-link to="/login" class="nav-link">Sign In</router-link>
                    <router-link to="/register" class="nav-link">Sign Up</router-link>
                </template>
            </div>

            <q-btn flat round dense icon="bi-list" color="dark" class="lt-sm" @click="mobileMenu = true" />
        </q-toolbar>
    </q-header>

    <!-- Mobile nav — a real slide-out drawer (off-canvas, overlays the page with a backdrop)
         instead of the old inline dropdown panel that just pushed the page content down. -->
    <q-drawer v-model="mobileMenu" side="right" overlay bordered class="lt-sm" :width="260">
        <div class="row items-center justify-between q-pa-md">
            <div class="text-subtitle1 text-weight-bold">Menu</div>
            <q-btn flat round dense icon="close" @click="mobileMenu = false" />
        </div>
        <q-separator />
        <q-list>
            <q-item clickable v-ripple :to="complaintTo" @click="mobileMenu = false">
                <q-item-section>Feedback</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/discussion" @click="mobileMenu = false">
                <q-item-section>Discussion</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/poll" @click="mobileMenu = false">
                <q-item-section>Poll</q-item-section>
            </q-item>
            <template v-if="authStore.isAuthenticated">
                <q-item clickable v-ripple to="/home" @click="mobileMenu = false">
                    <q-item-section>Home</q-item-section>
                </q-item>
                <q-separator spaced />
                <q-item clickable v-ripple @click="authStore.logout(); mobileMenu = false">
                    <q-item-section>Sign out ({{ authStore.user?.firstname }})</q-item-section>
                </q-item>
            </template>
            <template v-else>
                <q-separator spaced />
                <q-item clickable v-ripple to="/login" @click="mobileMenu = false">
                    <q-item-section>Sign In</q-item-section>
                </q-item>
                <q-item clickable v-ripple to="/register" @click="mobileMenu = false">
                    <q-item-section>Sign Up</q-item-section>
                </q-item>
            </template>
        </q-list>
    </q-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import moment from 'moment';

const authStore = useAuthStore();
const mobileMenu = ref(false);

// "My Complaints" only exists behind login (/home/complaint) — a guest doesn't have a complaint
// list to view yet, so this points them at where a complaint actually starts instead. Same
// branching Home/Sign-out vs Sign-in/Sign-up already uses below.
const complaintTo = computed(() => authStore.isAuthenticated ? '/home/complaint' : '/file-complaint');

const formatDate = (timestamp) => moment(timestamp).fromNow();

// Notification tray — mirrors the mobile app's NotificationBell:
//  1. seed instantly from the socket's (unread) list so there's something to show,
//  2. load the full read+unread history from GET /api/notification,
//  3. mark everything read ONLY after the list is on screen — marking read makes the
//     socket push back an empty list, which would otherwise wipe the tray immediately.
const trayItems = ref([]);
const trayLoading = ref(false);

const openTray = async () => {
    trayItems.value = [...(authStore.notificationList || [])];
    trayLoading.value = true;
    try {
        await authStore.fetchNotifications();
        trayItems.value = [...(authStore.notificationList || [])];
    } finally {
        trayLoading.value = false;
        authStore.markNotificationsRead();
    }
};
</script>

<style scoped>
.no-decoration {
    text-decoration: none;
}
.nav-link {
    text-decoration: none;
    color: #444;
    font-weight: 500;
    font-size: 0.9rem;
}
.nav-link:hover {
    color: var(--q-primary);
}
</style>
