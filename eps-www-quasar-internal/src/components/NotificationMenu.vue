<template>
    <q-btn flat round dense size="sm" icon="bi-bell" class="app-hdr-btn" :class="{ 'app-hdr-btn--on': open }" aria-label="Notifications">
        <i v-if="authStore.notificationCount" class="app-hdr-dot" aria-label="You have new notifications" />
        <q-tooltip v-if="!open">Notifications</q-tooltip>

        <q-menu v-model="open" anchor="bottom right" self="top right" :offset="[0, 8]" class="hm-menu" transition-show="jump-down" transition-hide="jump-up" @show="load">
            <div class="hm-head">
                <div class="hm-title">Notifications</div>
                <q-space />
                <button type="button" class="hm-link" :disabled="!unreadCount" @click="markAllRead">Mark all as read</button>
            </div>
            <div class="hm-tabs">
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'all' }" @click="tab = 'all'">All</button>
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'unread' }" @click="tab = 'unread'">Unread<template v-if="unreadCount"> · {{ unreadCount }}</template></button>
            </div>

            <div class="hm-list">
                <div v-if="loading && !items.length" class="hm-empty"><q-spinner-ios size="1.5em" /></div>
                <div v-else-if="!shown.length" class="hm-empty">
                    <q-icon name="bi-bell-slash" />
                    {{ tab === 'unread' ? 'You are all caught up' : 'No notifications yet' }}
                </div>
                <button v-for="n in shown" :key="n.id" type="button" class="hm-row q-mb-xs" :class="{ 'hm-row--unread': !n.isRead }" @click="openOne(n)">
                    <span class="hm-ico" :class="icon(n).tone && `hm-ico--${icon(n).tone}`"><q-icon :name="icon(n).name" size="18px" /></span>
                    <span class="hm-body">
                        <span class="hm-line hm-line--clamp">{{ n.content }}</span>
                        <span class="hm-time" :class="{ 'hm-time--new': !n.isRead }">{{ AgoLabel(n.createdAt) }}</span>
                    </span>
                    <i v-if="!n.isRead" class="hm-dot" />
                </button>
            </div>

            <div class="hm-foot"><button type="button" @click="viewAll">View all notifications</button></div>
        </q-menu>
    </q-btn>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import { AgoLabel } from 'src/utils/timeago';
import { NotificationIcon, NotificationLink } from 'src/utils/notification';

// The bell in the top bar and the menu it opens (same layout as the revapp apps): All / Unread
// tabs, a list of what happened, "Mark all as read", and a link to the full list.
const emit = defineEmits(['view-all']);

const router = useRouter();
const authStore = useAuthStore();
const open = ref(false);
const tab = ref('all');
const items = ref([]);
const loading = ref(false);

const icon = NotificationIcon;
const unreadCount = computed(() => authStore.notificationCount || 0);
const shown = computed(() => items.value.filter(n => tab.value === 'all' || !n.isRead).slice(0, 12));

// read AND unread, newest first — the socket only ever pushes the unread set
const load = async () => {
    loading.value = true;
    try {
        const { data } = await api.get('/notification', { params: { limit: 30 } });
        items.value = data.data || [];
    } catch (error) {
        console.error('Error loading notifications:', error);
    } finally {
        loading.value = false;
    }
};

// a new notification arrived while the menu is open
watch(() => authStore.notificationCount, () => { if (open.value) load(); });

const markAllRead = async () => {
    items.value.forEach(n => { n.isRead = true; });
    try {
        await api.post('/notification/read');
    } catch (error) {
        console.error('Error marking notifications read:', error);
    }
    authStore.readNotification();
};

// opening one notification marks just that one read (the rest stay unread), then goes to its page
const openOne = (n) => {
    open.value = false;
    if (!n.isRead) {
        n.isRead = true;
        authStore.notificationCount = Math.max(0, (authStore.notificationCount || 0) - 1);
        api.post(`/notification/${n.id}/read`).catch(error => console.error('Error marking a notification read:', error));
    }
    const to = NotificationLink(n);
    if (to) router.push(to);
};

const viewAll = () => {
    open.value = false;
    emit('view-all');
};
</script>
