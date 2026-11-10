<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" position="right" full-height @show="onShow" class="notification-modal">
        <q-card square class="ntf-card column no-wrap">
            <!-- same layout as the bell menu in the top bar, with room for the whole list -->
            <div class="hm-head">
                <div class="hm-title">Notifications</div>
                <q-space />
                <button type="button" class="hm-link" :disabled="!unreadCount" @click="markAllRead">Mark all as read</button>
                <q-btn icon="bi-x-circle" flat round dense v-close-popup />
            </div>
            <div class="hm-tabs">
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'all' }" @click="tab = 'all'">All</button>
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'unread' }" @click="tab = 'unread'">Unread<template v-if="unreadCount"> · {{ unreadCount }}</template></button>
            </div>
            <q-separator />

            <div class="ntf-body col">
                <div v-if="loading && !notifications.length" class="hm-empty"><q-spinner-ios size="1.5em" /></div>
                <div v-else-if="!shown.length" class="hm-empty">
                    <q-icon name="bi-bell-slash" />
                    {{ tab === 'unread' ? 'You are all caught up' : 'No notifications yet' }}
                </div>
                <div class="q-pa-sm">
                    <div v-for="n in shown" :key="n.id" class="hm-row q-mb-xs" :class="{ 'hm-row--unread': !n.isRead }">
                        <span class="hm-ico" :class="icon(n).tone && `hm-ico--${icon(n).tone}`"><q-icon :name="icon(n).name" size="18px" /></span>
                        <span class="hm-body">
                            <span class="hm-line">{{ n.content }}</span>
                            <span class="hm-time" :class="{ 'hm-time--new': !n.isRead }">{{ AgoLabel(n.createdAt) }}</span>
                        </span>
                        <i v-if="!n.isRead" class="hm-dot" />
                    </div>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import { AgoLabel } from 'src/utils/timeago';
import { NotificationIcon } from 'src/utils/notification';

defineProps({
    modelValue: { type: Boolean, default: false },
});
defineEmits(['update:modelValue']);

const AuthStore = useAuthStore();
const icon = NotificationIcon;

const tab = ref('all');
const notifications = ref([]);
const loading = ref(false);
const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length);
const shown = computed(() => notifications.value.filter(n => tab.value === 'all' || !n.isRead));

const markAllRead = async () => {
    notifications.value.forEach(n => { n.isRead = true; });
    try {
        await api.post('/notification/read');
    } catch (error) {
        console.error('Error marking notifications read:', error);
    }
    AuthStore.readNotification();
};

// This dialog instance is toggled via v-model rather than remounted per open (it lives once in
// MainLayout.vue), so the list is re-fetched on every @show. Opening it is still the "I've seen
// these" moment — the badge clears — but the rows keep their unread highlight from the snapshot
// just taken, so what you came to read isn't wiped out from under you.
const onShow = async () => {
    tab.value = 'all';
    loading.value = true;
    try {
        const { data } = await api.get('/notification', { params: { limit: 100 } });
        notifications.value = data.data || [];
    } catch (error) {
        console.error('Error loading notifications:', error);
    } finally {
        loading.value = false;
    }
    AuthStore.readNotification();
    api.post('/notification/read').catch(() => {});
};
</script>

<style scoped>
/* position="right" + full-height gives an edge-docked panel already — this just fixes its width. */
.ntf-card {
    width: 420px;
    max-width: 100vw;
    height: 100vh;
    padding: 0;
}
.ntf-body {
    overflow-y: auto;
    min-height: 0;
}
</style>
