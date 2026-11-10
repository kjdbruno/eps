<template>
    <q-btn flat round dense size="sm" icon="bi-chat-dots" class="app-hdr-btn" :class="{ 'app-hdr-btn--on': open }" aria-label="Messages">
        <i v-if="messageStore.unreadTotal" class="app-hdr-dot" aria-label="You have unread messages" />
        <q-tooltip v-if="!open">Messages</q-tooltip>

        <q-menu v-model="open" anchor="bottom right" self="top right" :offset="[0, 8]" class="hm-menu" transition-show="jump-down" transition-hide="jump-up" @show="refresh">
            <div class="hm-head">
                <div class="hm-title">Chats</div>
                <q-space />
                <button type="button" class="hm-link" @click="viewAll">See all</button>
            </div>
            <div class="hm-search">
                <q-input v-model="search" dense outlined rounded hide-bottom-space placeholder="Search people" bg-color="grey-1">
                    <template #prepend><q-icon name="bi-search" size="14px" /></template>
                </q-input>
            </div>
            <div class="hm-tabs">
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'all' }" @click="tab = 'all'">All</button>
                <button type="button" class="hm-tab" :class="{ 'hm-tab--on': tab === 'unread' }" @click="tab = 'unread'">Unread<template v-if="messageStore.unreadTotal"> · {{ messageStore.unreadTotal }}</template></button>
            </div>

            <div class="hm-list">
                <div v-if="messageStore.loading && !messageStore.roster.length" class="hm-empty"><q-spinner-ios size="1.5em" /></div>
                <div v-else-if="!rows.length" class="hm-empty">
                    <q-icon name="bi-chat-square-dots" />
                    {{ tab === 'unread' ? 'No unread messages' : (search ? 'No one found' : 'No conversations yet') }}
                </div>
                <button v-for="r in rows" :key="r.user.id" type="button" class="hm-row hm-row--msg q-mb-xs" :class="{ 'hm-row--unread': r.unread > 0 }" @click="openChat(r.user)">
                    <PersonAvatar :user="r.user" :size="32" :online="!!r.user.isOnline" />
                    <span class="hm-body">
                        <span class="hm-name" style="display: block;">{{ fullName(r.user) }}</span>
                        <span class="hm-sub">
                            <span v-if="r.last">{{ r.fromMe ? 'You: ' : '' }}{{ r.last }}</span>
                            <span v-else>{{ subline(r.user) }}</span>
                            <span v-if="r.at" class="hm-time" :class="{ 'hm-time--new': r.unread > 0 }">· {{ Ago(r.at) }}</span>
                        </span>
                    </span>
                    <q-badge v-if="r.unread > 1" color="negative" rounded>{{ r.unread }}</q-badge>
                    <i v-else-if="r.unread === 1" class="hm-dot" />
                </button>
            </div>

            <div class="hm-foot"><button type="button" @click="viewAll">See all in Messages</button></div>
        </q-menu>
    </q-btn>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessageStore } from 'src/stores/message-store';
import { Ago } from 'src/utils/timeago';
import PersonAvatar from './PersonAvatar.vue';

// The chat icon in the top bar and the menu it opens — the revapp apps' Messages menu: search,
// All / Unread tabs, the people you have talked to (newest first, each with the last message, how
// long ago, and an unread count), then — so the list is never thin — people you could start with,
// online ones first. Picking someone opens their conversation on the Messages page.
const router = useRouter();
const messageStore = useMessageStore();
const open = ref(false);
const tab = ref('all');
const search = ref('');

const MIN_PEOPLE = 5;
const MAX_PEOPLE = 8;
const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation', monitoring: 'Monitoring' };

const fullName = (u) => `${u?.firstname || ''} ${u?.lastname || ''}`.trim() || u?.username || '';
const subline = (u) => [ROLE_LABELS[u.role] || u.role, u.office].filter(Boolean).join(' · ');

const refresh = () => {
    messageStore.loadDirectory();
    messageStore.loadConversations();
};

const rows = computed(() => {
    const q = search.value.trim().toLowerCase();
    const match = (u) => !q || fullName(u).toLowerCase().includes(q) || String(u.username || '').toLowerCase().includes(q);
    const people = new Map(messageStore.roster.filter(u => u.isActive !== false).map(u => [u.id, u]));

    let talked = messageStore.conversations
        .filter(c => people.has(c.userId) && match(people.get(c.userId)))
        .map(c => ({ user: people.get(c.userId), last: c.lastMessage, at: c.lastMessageAt, fromMe: !!c.fromMe, unread: c.unreadCount || 0 }));
    if (tab.value === 'unread') return talked.filter(r => r.unread > 0);

    const known = new Set(messageStore.conversations.map(c => c.userId));
    const others = [...people.values()]
        .filter(u => !known.has(u.id) && match(u))
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || fullName(a).localeCompare(fullName(b)))
        .map(u => ({ user: u, last: '', at: null, fromMe: false, unread: u.unreadCount || 0 }));

    // with a search the whole roster is searched; otherwise the list is topped up to the minimum
    if (q) return [...talked, ...others].slice(0, 12);
    talked = talked.slice(0, MAX_PEOPLE);
    return [...talked, ...others.slice(0, Math.max(0, MIN_PEOPLE - talked.length))];
});

const openChat = (user) => {
    open.value = false;
    router.push({ name: 'message', query: { user: user.id } });
};

const viewAll = () => {
    open.value = false;
    router.push({ name: 'message' });
};
</script>
