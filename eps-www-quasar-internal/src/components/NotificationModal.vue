<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" position="right" full-height @show="onShow" class="notification-modal">
        <q-card square class="ntf-card column no-wrap">
            <div class="row items-center no-wrap q-pa-md">
                <q-avatar size="40px" class="ntf-avatar">
                    <q-icon name="bi-bell-fill" color="white" size="1.1em" />
                </q-avatar>
                <div class="text-subtitle1 text-weight-bold text-uppercase q-ml-md col">notifications</div>
                <q-btn icon="bi-x-circle" flat round dense v-close-popup />
            </div>
            <q-separator />

            <div class="ntf-body col">
                <q-list separator v-if="notifications.length">
                    <q-item v-for="(dt, index) in notifications" :key="dt.id || index" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar size="36px" color="primary" text-color="white">
                                <q-icon name="bi-bell" size="0.9em" />
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-body2">{{ dt.content }}</q-item-label>
                            <q-item-label caption>{{ formatDate(dt.createdAt) }}</q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
                <div class="q-pa-xl text-center text-grey" v-else>
                    <q-icon name="bi-bell" size="2em" class="q-mb-sm" />
                    <div class="text-caption text-uppercase">no notifications</div>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref } from 'vue';
import moment from 'moment';
import { useAuthStore } from 'src/stores/auth-store';

defineProps({
    modelValue: { type: Boolean, default: false },
});
defineEmits(['update:modelValue']);

const AuthStore = useAuthStore();

// A local snapshot taken on open, not a live binding to AuthStore.notificationList —
// readNotification() below tells the server everything's read, which makes the next
// 'loadNotifications' socket push come back with an EMPTY unread list (see sockets/index.js's
// emitNotifications), and a live binding here would wipe what the viewer just opened this panel
// to read right out from under them mid-read.
const notifications = ref([]);

// This dialog instance is toggled via v-model rather than remounted per open (it lives once in
// MainLayout.vue), so the snapshot has to be re-taken on every @show, not just on component mount.
const onShow = () => {
    notifications.value = [...(AuthStore.notificationList || [])];
    AuthStore.readNotification();
};

const formatDate = (timestamp) => moment(timestamp).fromNow();
</script>

<style scoped>
/* position="right" + full-height gives an edge-docked panel already — this just fixes its width
   and strips the default QCard padding the header/body sections manage on their own. */
.ntf-card {
    width: 420px;
    max-width: 100vw;
    height: 100vh;
    padding: 0;
}
.ntf-avatar {
    background: var(--q-primary);
}
.ntf-body {
    overflow-y: auto;
    min-height: 0;
}
</style>
