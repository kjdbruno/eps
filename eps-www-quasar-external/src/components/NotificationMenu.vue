<template>
    <q-btn flat round dense icon="bi-bell" class="pt-bell" size="sm" :class="{ 'pt-bell--on': open }" aria-label="Notifications">
        <i v-if="authStore.notificationCount" class="pt-bell-dot" aria-label="You have new notifications" />
        <q-tooltip v-if="!open">Notifications</q-tooltip>

        <!-- Notification tray — mirrors the mobile app's NotificationBell:
             1. seed instantly from the socket's (unread) list so there's something to show,
             2. load the full read+unread history from GET /api/notification,
             3. mark everything read ONLY after the list is on screen — marking read makes the
                socket push back an empty list, which would otherwise wipe the tray immediately. -->
        <q-menu v-model="open" anchor="bottom right" self="top right" :offset="[0, 10]" class="pn-menu" transition-show="jump-down" transition-hide="jump-up" @show="openTray">
            <div class="pn-head">
                <div class="pn-title">Notifications</div>
            </div>

            <div class="pn-list">
                <div v-if="loading && !items.length" class="pn-empty"><q-spinner-ios color="primary" size="1.5em" /></div>
                <div v-else-if="!items.length" class="pn-empty">
                    <q-icon name="bi-bell-slash" />
                    You're all caught up. Updates on your feedback will show up here.
                </div>
                <div v-for="(n, i) in items" :key="n.id ?? i" class="pn-row" :class="{ 'pn-row--unread': !n.isRead }">
                    <span class="pn-ico"><q-icon :name="n.isRead ? 'bi-bell' : 'bi-bell-fill'" size="18px" /></span>
                    <span class="pn-body">
                        <span class="pn-line">{{ n.content }}</span>
                        <span class="pn-time" :class="{ 'pn-time--new': !n.isRead }">{{ ago(n.createdAt) }}</span>
                    </span>
                    <i v-if="!n.isRead" class="pn-dot" />
                </div>
            </div>
        </q-menu>
    </q-btn>
</template>

<script setup>
import { ref } from 'vue';
import moment from 'moment';
import { useAuthStore } from 'src/stores/auth-store';

const authStore = useAuthStore();
const open = ref(false);
const items = ref([]);
const loading = ref(false);

const ago = (timestamp) => moment(timestamp).fromNow();

const openTray = async () => {
    items.value = [...(authStore.notificationList || [])];
    loading.value = true;
    try {
        await authStore.fetchNotifications();
        items.value = [...(authStore.notificationList || [])];
    } finally {
        loading.value = false;
        authStore.markNotificationsRead();
    }
};
</script>
