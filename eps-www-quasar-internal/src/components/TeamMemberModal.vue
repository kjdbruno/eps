<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" position="right" full-height @hide="onHide" class="message-modal">
        <q-card square class="tm-card column no-wrap">
            <!-- Account info header -->
            <div class="row items-center no-wrap q-pa-md">
                <q-avatar size="48px" class="tm-avatar">
                    <img v-if="member?.avatar" :src="formatAvatar(member)" />
                    <q-icon v-else name="bi-person-fill" color="white" />
                </q-avatar>
                <div class="q-ml-md col">
                    <div class="text-subtitle1 text-weight-bold text-capitalize">{{ member?.firstname }} {{ member?.lastname }}</div>
                    <div class="text-caption text-grey text-capitalize">
                        {{ ROLE_LABELS[member?.role] || member?.role }}<template v-if="member?.office"> &middot; {{ member.office }}</template>
                    </div>
                    <div class="q-mt-xs">
                        <q-btn
                            v-if="isSuper"
                            rounded size="xs" unelevated no-caps color="negative" label="force logout"
                            :loading="forceLogoutLoading" @click="confirmForceLogout"
                        />
                    </div>
                </div>
                <q-badge :color="member?.isOnline ? 'positive' : 'grey'" outline rounded class="text-uppercase q-mr-sm">
                    {{ member?.isOnline ? 'online' : 'offline' }}
                </q-badge>
                <q-btn icon="bi-x-circle" flat round dense v-close-popup />
            </div>
            <q-separator />

            <!-- Messaging thread -->
            <div class="tm-chat-body col" ref="chatBodyRef">
                <div v-if="loadingMessages" class="text-center q-pa-lg">
                    <q-spinner-ios size="1.5em" />
                </div>
                <template v-else>
                    <div v-if="!messages.length" class="text-center text-caption text-grey q-pa-lg">
                        No messages yet — say hello.
                    </div>
                    <div v-for="m in messages" :key="m.id" class="tm-bubble-row" :class="isMine(m) ? 'tm-bubble-row--mine' : ''">
                        <div class="tm-bubble" :class="isMine(m) ? 'tm-bubble--mine' : 'tm-bubble--theirs'">
                            <div>{{ m.content }}</div>
                            <div class="tm-bubble-time">{{ formatTime(m.createdAt) }}</div>
                        </div>
                    </div>
                </template>
            </div>

            <q-separator />
            <q-card-actions class="q-py-md">
                <q-input
                    outlined dense v-model="draft" placeholder="Type a message..." class="col"
                    @keyup.enter="send"
                />
                <q-btn flat unelevated color="primary" icon="bi-send" :disable="!draft.trim()" :loading="sending" @click="send" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { socket } from 'src/boot/socket';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    member: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'force-logout']);

const AuthStore = useAuthStore();
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const isSuper = computed(() => AuthStore.user?.role === 'super');

const formatAvatar = (u) => `${process.env.VUE_APP_BACKEND_URL}${u.avatar || ''}`;
const formatTime = (timestamp) => moment(timestamp).format('MMM DD, hh:mm A');
const isMine = (m) => m.senderId === AuthStore.user?.id;

/* -------------------- messaging -------------------- */

const messages = ref([]);
const loadingMessages = ref(false);
const draft = ref('');
const sending = ref(false);
const chatBodyRef = ref(null);

const scrollToBottom = async () => {
    await nextTick();
    if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
};

const loadConversation = async () => {
    if (!props.member?.id) return;
    loadingMessages.value = true;
    messages.value = [];
    try {
        const { data } = await api.get(`/messages/${props.member.id}`);
        messages.value = data.data || [];
        scrollToBottom();
    } catch (error) {
        console.error('Error loading conversation:', error);
    } finally {
        loadingMessages.value = false;
    }
};

const send = async () => {
    const content = draft.value.trim();
    if (!content || !props.member?.id) return;
    sending.value = true;
    try {
        const { data } = await api.post('/messages', { receiverId: props.member.id, content });
        messages.value.push(data.data);
        draft.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">Unable to send that message.</div>` });
    } finally {
        sending.value = false;
    }
};

// Appends a live-pushed message to the thread ONLY when it's from whoever this panel currently
// has open — a message from anyone else still lands (see NotificationController/the bell icon),
// just not into this specific open thread.
const onIncomingMessage = (message) => {
    if (!props.member?.id || message.senderId !== props.member.id) return;
    messages.value.push(message);
    scrollToBottom();
};

onMounted(() => {
    socket.on('message:new', onIncomingMessage);
});
onUnmounted(() => {
    socket.off('message:new', onIncomingMessage);
});

watch(() => props.member?.id, (id) => {
    if (id) loadConversation();
});

const onHide = () => {
    draft.value = '';
};

/* -------------------- force logout -------------------- */

const forceLogoutLoading = ref(false);

const confirmForceLogout = async () => {
    const result = await Swal.fire({
        title: 'Confirm',
        html: `Force-logout <b class="text-capitalize">${props.member?.firstname} ${props.member?.lastname}</b>? They'll be signed out everywhere immediately.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'confirm',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    forceLogoutLoading.value = true;
    try {
        const { data } = await api.post(`/team/${props.member.id}/force-logout`);
        Toast.fire({
            icon: 'success',
            html: `<div class="text-h6 text-bold text-uppercase">done!</div><div class="text-caption">${data.message}</div>`
        });
        // Their socket disconnecting SHOULD already flip them offline in the Team list via the
        // normal 'loadLogs' broadcast (see sockets/index.js's disconnect handler) — but that
        // depends on the client actually receiving 'force_logout' and tearing its socket down
        // promptly. This is the deterministic path: tell HomePage.vue to re-fetch the roster from
        // the server right now, so the list is correct immediately regardless of that timing.
        emit('force-logout', props.member.id);
    } catch (error) {
        Toast.fire({
            icon: 'error',
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to force-logout this account.'}</div>`
        });
    } finally {
        forceLogoutLoading.value = false;
    }
};
</script>

<style scoped>
/* position="right" + full-height gives an edge-docked panel already — this just fixes its width
   and strips the default QCard padding the header/chat/compose sections manage on their own. */
.tm-card {
    width: 420px;
    max-width: 100vw;
    height: 100vh;
    padding: 0;
}
.tm-avatar {
    background: var(--q-primary);
}
.tm-chat-body {
    overflow-y: auto;
    padding: 16px;
    background: #F6F9FC;
    min-height: 0;
}
.tm-bubble-row {
    display: flex;
    margin-bottom: 10px;
}
.tm-bubble-row--mine {
    justify-content: flex-end;
}
.tm-bubble {
    max-width: 78%;
    padding: 8px 12px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.4;
    word-break: break-word;
}
.tm-bubble--theirs {
    background: #FFFFFF;
    border: 1px solid #DCE4F0;
    border-bottom-left-radius: 4px;
}
.tm-bubble--mine {
    background: var(--q-primary);
    color: #FFFFFF;
    border-bottom-right-radius: 4px;
}
.tm-bubble-time {
    font-size: 10px;
    opacity: 0.65;
    margin-top: 2px;
    text-align: right;
}
</style>
