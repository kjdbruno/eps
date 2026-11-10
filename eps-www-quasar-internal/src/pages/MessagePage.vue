<template>
    <div class="rc-shell mp-wrap">
        <!-- the conversation, in the main view -->
        <div class="rc-main">
            <div class="ov-title">the conversation</div>
            <section class="mp-chat" :class="{ 'mp-chat--hide': !activeId && narrow }">
                <template v-if="activeId">
                    <div class="mp-top">
                        <q-btn v-if="narrow" flat round dense icon="bi-arrow-left-short" size="md" @click="back" />
                        <PersonAvatar :user="activeUser" :size="42" :online="!!activeUser.isOnline" />
                        <div class="col" style="min-width: 0;">
                            <div class="mp-name">{{ fullName(activeUser) }}</div>
                            <div class="mp-meta">
                                <span>{{ subline(activeUser) }}</span>
                                <span class="rc-pill" :class="activeUser.isOnline ? 'rc-pill--ok' : 'rc-pill--off'">{{ activeUser.isOnline ? 'active now' : 'offline' }}</span>
                            </div>
                        </div>
                    </div>

                    <div ref="threadEl" class="mp-thread">
                        <q-inner-loading :showing="messageStore.loadingThread && !messageStore.thread.length"><q-spinner-ios size="1.8em" color="primary" /></q-inner-loading>
                        <EmptyState
                            v-if="!messageStore.loadingThread && !messageStore.thread.length" compact icon="bi-chat-heart"
                            :title="`Say hello to ${activeUser.firstname || 'them'}`" hint="Nothing has been said yet. What you write here reaches them at once."
                        />
                        <template v-for="(msg, i) in messageStore.thread" :key="msg.id">
                            <div v-if="newDay(i)" class="mp-day">{{ dayLabel(msg.createdAt) }}</div>
                            <div class="mp-msg" :class="isMine(msg) ? 'mp-msg--mine' : ''">
                                <div class="mp-bubble">
                                    <div class="mp-text">{{ msg.content }}</div>
                                    <div class="mp-at">{{ formatTime(msg.createdAt) }}</div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div class="mp-compose">
                        <q-input v-model="draft" dense outlined rounded hide-bottom-space class="col" placeholder="Write a message..." bg-color="grey-1" @keyup.enter="send" />
                        <q-btn unelevated round color="primary" icon="bi-send" :loading="messageStore.sending" :disable="!draft.trim()" @click="send" />
                    </div>
                </template>
                <EmptyState
                    v-else icon="bi-chat-square-text" title="Choose someone"
                    hint="Pick a person from the list to read your conversation or start a new one."
                />
            </section>
        </div>

        <!-- the people, in the trail panel on the right -->
        <PreferenceRail
            title="people" empty-title="No one found" :shown="shownCount" :total="roster.length"
            v-model:search="search" placeholder="Search people..."
            :filters="TABS" v-model:filter="tab" filters-label="show" :show-add="false"
            :loading="messageStore.loading" icon="bi-chat-square-dots"
        >
            <template v-for="(group, gi) in people" :key="gi">
                <div v-if="group.label" class="mp-group">{{ group.label }}</div>
                <div
                    v-for="r in group.rows" :key="r.user.id"
                    class="rc-item rc-item--click mp-row" :class="{ 'mp-row--unread': r.unread > 0, 'mp-row--on': Number(activeId) === Number(r.user.id) }"
                    @click="choose(r.user.id)"
                >
                    <div class="row items-center no-wrap">
                        <PersonAvatar :user="r.user" :size="36" :online="!!r.user.isOnline" />
                        <div class="col q-ml-sm" style="min-width: 0;">
                            <div class="row items-center no-wrap">
                                <div class="mp-row-name ellipsis">{{ fullName(r.user) }}</div>
                                <q-space />
                                <span v-if="r.at" class="mp-row-time" :class="{ 'mp-row-time--new': r.unread > 0 }">{{ Ago(r.at) }}</span>
                            </div>
                            <div class="row items-center no-wrap">
                                <div class="mp-row-sub ellipsis">
                                    <template v-if="r.last">{{ r.fromMe ? 'You: ' : '' }}{{ r.last }}</template>
                                    <template v-else>{{ subline(r.user) }}</template>
                                </div>
                                <q-space />
                                <q-badge v-if="r.unread > 0" color="negative" rounded>{{ r.unread }}</q-badge>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </PreferenceRail>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import moment from 'moment';
import { Toast } from 'src/boot/sweetalert';
import { useAuthStore } from 'src/stores/auth-store';
import { useMessageStore } from 'src/stores/message-store';
import { Ago } from 'src/utils/timeago';
import PersonAvatar from 'src/components/PersonAvatar.vue';
import PreferenceRail from 'src/components/PreferenceRail.vue';
import EmptyState from 'src/components/EmptyState.vue';

// The Messages page, laid out like every other page: the conversation in the main view, and the people (the ones you have
// talked to first, then everyone else with the online ones first) in the trail panel on the right. Reached from the header's
// Messages menu, or from a person's panel on Home (?user=<id> opens that person's thread).
const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const messageStore = useMessageStore();

const search = ref('');
const tab = ref('all');
const TABS = computed(() => [
    { value: 'all', label: 'All' },
    { value: 'unread', label: messageStore.unreadTotal ? `Unread (${messageStore.unreadTotal})` : 'Unread' },
]);
const draft = ref('');
const threadEl = ref(null);
const narrow = computed(() => $q.screen.width < 1201);
const activeId = computed(() => messageStore.activeUserId);

const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation', monitoring: 'Monitoring' };
const fullName = (u) => `${u?.firstname || ''} ${u?.lastname || ''}`.trim() || u?.username || '';
const subline = (u) => [ROLE_LABELS[u?.role] || u?.role, u?.office].filter(Boolean).join(' · ');
const isMine = (m) => m.senderId === authStore.user?.id;
const formatTime = (t) => moment(t).format('h:mm A');
const dayLabel = (t) => moment(t).calendar(null, { sameDay: '[Today]', lastDay: '[Yesterday]', lastWeek: 'dddd', sameElse: 'MMM D, YYYY' });
const newDay = (i) => i === 0 || !moment(messageStore.thread[i].createdAt).isSame(messageStore.thread[i - 1].createdAt, 'day');

const roster = computed(() => messageStore.roster.filter(u => u.isActive !== false));
const activeUser = computed(() => roster.value.find(u => Number(u.id) === Number(activeId.value)) || { id: activeId.value });

// people you have talked to first, then everyone else (online first)
const people = computed(() => {
    const q = search.value.trim().toLowerCase();
    const match = (u) => !q || fullName(u).toLowerCase().includes(q) || String(u.username || '').toLowerCase().includes(q);
    const byId = new Map(roster.value.map(u => [u.id, u]));
    const talked = messageStore.conversations
        .filter(c => byId.has(c.userId) && match(byId.get(c.userId)))
        .map(c => ({ user: byId.get(c.userId), last: c.lastMessage, at: c.lastMessageAt, fromMe: !!c.fromMe, unread: c.unreadCount || 0 }));
    if (tab.value === 'unread') {
        const r = talked.filter(x => x.unread > 0);
        return r.length ? [{ label: '', rows: r }] : [];
    }
    const known = new Set(messageStore.conversations.map(c => c.userId));
    const others = roster.value
        .filter(u => !known.has(u.id) && match(u))
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || fullName(a).localeCompare(fullName(b)))
        .map(u => ({ user: u, last: '', at: null, fromMe: false, unread: u.unreadCount || 0 }));
    const groups = [];
    if (talked.length) groups.push({ label: others.length ? 'Recent' : '', rows: talked });
    if (others.length) groups.push({ label: 'People', rows: others });
    return groups;
});
const shownCount = computed(() => people.value.reduce((n, g) => n + g.rows.length, 0));

const scrollDown = () => nextTick(() => { if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight; });

const choose = async (id) => {
    if (Number(route.query.user) !== Number(id)) router.replace({ name: 'message', query: { user: id } });
    await messageStore.openThread(Number(id));
    scrollDown();
};

const back = () => {
    messageStore.closeThread();
    router.replace({ name: 'message' });
};

const send = async () => {
    const content = draft.value.trim();
    if (!content || !activeId.value) return;
    draft.value = '';
    try {
        await messageStore.sendMessage(activeId.value, content);
    } catch (error) {
        draft.value = content;
        Toast.fire({ icon: 'error', html: '<div class="text-caption">Unable to send that message.</div>' });
    }
};

watch(() => messageStore.thread.length, scrollDown);
watch(() => route.query.user, (id) => {
    if (id && Number(id) !== Number(activeId.value)) choose(id);
    else if (!id && route.name === 'message') messageStore.closeThread();
});

onMounted(async () => {
    await Promise.all([messageStore.loadDirectory(), messageStore.loadConversations()]);
    if (route.query.user) await choose(route.query.user);
    else messageStore.closeThread();
});

// leaving the page: nobody's thread is "open" any more, so a new message counts as unread again
onBeforeUnmount(() => messageStore.closeThread());
</script>

<style scoped>
.mp-chat { display: flex; flex-direction: column; height: calc(100vh - var(--app-hdr, 48px) - 150px); min-height: 440px; background: #fff; border: 1px solid #E6ECF5; border-radius: 14px; overflow: hidden; }
.mp-chat > .es { margin: auto; }
.mp-top { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #EEF2F8; }
.mp-name { font-size: 15px; font-weight: 800; color: #1E2A44; text-transform: capitalize; }
.mp-meta { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #6B7A99; }
.mp-thread { position: relative; flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: #F8FAFD; }
.mp-day { text-align: center; margin: 12px 0 8px; font-size: 11.5px; font-weight: 700; color: #8493AC; }
.mp-msg { display: flex; margin-bottom: 6px; }
.mp-msg--mine { justify-content: flex-end; }
.mp-bubble { max-width: min(70%, 520px); padding: 8px 14px; border-radius: 18px; background: #fff; border: 1px solid #E6ECF5; color: #1E2A44; }
.mp-msg--mine .mp-bubble { background: var(--q-primary); border-color: var(--q-primary); color: #fff; }
.mp-text { font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
.mp-at { font-size: 10.5px; opacity: .7; margin-top: 2px; text-align: right; }
.mp-compose { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid #EEF2F8; }

.mp-group { position: sticky; top: 0; z-index: 1; padding: 8px 16px; background: #F1F5FB; border-bottom: 1px solid #E3EAF4; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #8493AC; }
.mp-row { border-left-color: transparent; }
.mp-row--unread { background: #EAF1FF; }
.mp-row--on, .mp-row--on:hover { background: #E5EEFC; border-left-color: var(--q-primary); }
.mp-row-name { font-size: 13px; font-weight: 700; color: #1E2A44; text-transform: capitalize; }
.mp-row-sub { font-size: 12px; color: #6B7A99; }
.mp-row--unread .mp-row-sub { color: var(--q-primary); font-weight: 700; }
.mp-row-time { flex: none; font-size: 11px; color: #8493AC; }
.mp-row-time--new { color: var(--q-primary); font-weight: 700; }
@media (max-width: 1200px) {
    .mp-chat--hide { display: none; }
}
</style>
