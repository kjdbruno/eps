<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" position="right" full-height class="message-modal">
        <q-card square class="tm-card column no-wrap">
            <!-- who it is -->
            <div class="row items-center no-wrap q-pa-md">
                <PersonAvatar :user="member || {}" :size="52" :online="!!member?.isOnline" />
                <div class="q-ml-md col" style="min-width: 0;">
                    <div class="text-subtitle1 text-weight-bold text-capitalize ellipsis">{{ member?.firstname }} {{ member?.lastname }}</div>
                    <div class="text-caption text-grey text-capitalize">
                        {{ ROLE_LABELS[member?.role] || member?.role }}<template v-if="member?.office"> &middot; {{ member.office }}</template>
                    </div>
                </div>
                <q-btn icon="bi-x-circle" flat round dense v-close-popup />
            </div>
            <div class="tm-badges q-px-md q-pb-md">
                <span class="rc-pill" :class="member?.isOnline ? 'rc-pill--ok' : 'rc-pill--off'">{{ member?.isOnline ? 'online' : 'offline' }}</span>
                <span class="rc-pill" :class="member?.isActive === false ? 'rc-pill--bad' : 'rc-pill--info'">{{ member?.isActive === false ? 'inactive' : 'active' }}</span>
            </div>
            <q-separator />

            <!-- the details of the account -->
            <div class="tm-body col">
                <div class="rc-block-title q-mb-sm">the account</div>
                <div class="rc-facts">
                    <div v-for="row in facts" :key="row.label" class="rc-fact">
                        <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                        <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                    </div>
                </div>
            </div>

            <!-- what can be done: the same cards as every Manage page -->
            <q-separator />
            <div class="tm-actions q-pa-md">
                <ManageActions :title="`What would you like to do with ${member?.firstname || 'them'}?`" :actions="actions" @pick="onPick" />
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import PersonAvatar from 'src/components/PersonAvatar.vue';
import ManageActions from 'src/components/ManageActions.vue';
import { esc } from 'src/utils/escape';

// The side panel of one person in the Team list (Home): who they are, the details of their account, a button to the Messages
// page for talking to them, and, for a super admin, force logout. The conversation itself lives on the Messages page.
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    member: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'force-logout']);

const router = useRouter();
const AuthStore = useAuthStore();
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const isSuper = computed(() => AuthStore.user?.role === 'super');

const when = (v) => (v ? `${moment(v).format('MMM DD, YYYY hh:mm A')} (${moment(v).fromNow()})` : 'Never');
const facts = computed(() => {
    const m = props.member;
    if (!m) return [];
    return [
        { label: 'Username', value: m.username || '—', icon: 'bi-at', tone: 'teal' },
        { label: 'Contact number', value: m.phoneNo || 'Not on record', icon: 'bi-telephone', tone: 'blue' },
        { label: 'Role', value: ROLE_LABELS[m.role] || m.role || '—', icon: 'bi-shield-check', tone: 'purple' },
        { label: 'Office', value: m.office || 'No office', icon: 'bi-building', tone: 'red' },
        { label: 'Last signed in', value: when(m.lastLoginAt), icon: 'bi-box-arrow-in-right', tone: 'amber' },
        { label: 'In the system since', value: m.createdAt ? moment(m.createdAt).format('MMM DD, YYYY') : '—', icon: 'bi-calendar-check', tone: 'teal' },
    ];
});

// Messages, and for a super admin Force logout, as cards (the Manage design)
const actions = computed(() => [
    {
        key: 'messages', label: 'Message them', icon: 'bi-chat-dots', bg: '#E4F6EA', color: '#1C8A3B',
        hint: props.member?.unreadCount ? `Open the conversation: ${props.member.unreadCount} unread.` : 'Open the conversation on the Messages page.',
    },
    ...(isSuper.value ? [{
        key: 'logout', label: 'Force logout', icon: 'bi-box-arrow-right', bg: '#FFF4DB', color: '#8A5B00',
        hint: 'Sign them out everywhere at once. They can sign in again.',
        disabled: !props.member?.isOnline || forceLogoutLoading.value, disabledHint: forceLogoutLoading.value ? 'Signing them out...' : 'They are not signed in right now.',
    }] : []),
]);
const onPick = (key) => { if (key === 'messages') openMessages(); else if (key === 'logout') confirmForceLogout(); };

const openMessages = () => {
    emit('update:modelValue', false);
    router.push({ name: 'message', query: { user: props.member.id } });
};

/* -------------------- force logout -------------------- */

const forceLogoutLoading = ref(false);

const confirmForceLogout = async () => {
    const result = await Swal.fire({
        title: 'Confirm',
        html: `Force-logout <b class="text-capitalize">${esc(props.member?.firstname)} ${esc(props.member?.lastname)}</b>? They'll be signed out everywhere immediately.`,
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
   and strips the default QCard padding the sections manage on their own. */
.tm-card {
    width: 400px;
    max-width: 100vw;
    height: 100vh;
    padding: 0;
}
.tm-badges { display: flex; gap: 6px; }
.tm-body { overflow-y: auto; padding: 16px; min-height: 0; }
</style>
