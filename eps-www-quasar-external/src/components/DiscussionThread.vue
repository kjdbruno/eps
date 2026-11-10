<template>
    <div class="dt tone-discussion">
        <div v-if="discussion">
            <!-- the topic: what it is, who opened it, how lively it is -->
            <div class="dt-hero">
                <div class="dt-hero-top">
                    <span class="dt-eyebrow">public discussion</span>
                    <span class="pt-pill dt-status" :class="statusClass(discussion)">{{ statusLabel(discussion) }}</span>
                </div>
                <div class="dt-title">{{ discussion.title }}</div>
                <div class="dt-meta">
                    <span v-for="o in discussion.offices" :key="o.id" class="dt-office"><q-icon name="bi-building" size="12px" />{{ o.alias || o.name }}</span>
                    <span><q-icon name="bi-clock" size="13px" /> opened {{ formatDate(discussion.createdAt) }}</span>
                    <span><q-icon name="bi-chat-left-text" size="13px" /> {{ discussion.comments.length }} comment{{ discussion.comments.length === 1 ? '' : 's' }}</span>
                    <span v-if="discussion.expiresAt"><q-icon name="bi-hourglass-split" size="13px" /> {{ discussion.isExpired ? 'expired' : 'closes' }} {{ formatDate(discussion.expiresAt) }}</span>
                </div>
            </div>

            <div class="dt-desc" v-if="discussion.description">
                <div class="rc-block-title">what this is about</div>
                <div class="text-body2" style="white-space: pre-line;">{{ discussion.description }}</div>
            </div>

            <!-- the conversation: one bubble per comment -->
            <div class="dt-section">
                <span>conversation</span><em>{{ discussion.comments.length }}</em>
            </div>
            <div v-if="discussion.comments.length" class="dt-thread">
                <div v-for="c in discussion.comments" :key="c.id" class="dt-msg">
                    <span class="dt-av" :style="{ background: tone(c.authorName) }">{{ initials(c.authorName) }}</span>
                    <div class="dt-bubble">
                        <div class="dt-who"><b class="text-capitalize">{{ c.authorName }}</b><small>{{ formatDate(c.createdAt) }}</small></div>
                        <div class="dt-text">{{ c.content }}</div>
                    </div>
                </div>
            </div>
            <div v-else class="dt-empty">
                <q-icon name="bi-chat-heart" />
                <b>No comments yet</b>
                <span>Be the first to share a thought or suggestion.</span>
            </div>

            <!-- the box to write one stays at the bottom of the window while the thread scrolls -->
            <div class="dt-compose">
                <template v-if="!canComment">
                    <div class="dt-closed"><q-icon name="bi-lock-fill" /> This discussion is closed to new comments.</div>
                </template>
                <template v-else-if="!authStore.isAuthenticated">
                    <div class="pt-gate">
                <span class="pt-gate-ico"><q-icon name="bi-person-lock" /></span>
                <div class="pt-gate-t">Sign in to join this discussion</div>
                <div class="pt-gate-s">Anyone can read the thread. Commenting is for signed-in residents, so your name is shown on what you post.</div>
                <div class="row justify-center q-gutter-sm q-mt-sm">
                    <q-btn unelevated rounded no-caps color="primary" label="Sign in" to="/login" />
                    <q-btn outline rounded no-caps color="primary" label="Create an account" to="/register" />
                </div>
            </div>
                </template>
                <template v-else>
                    <div class="dt-compose-row">
                        <span class="dt-av" :style="{ background: tone(myName) }">{{ initials(myName) }}</span>
                        <q-input
                            v-model="content" type="textarea" autogrow outlined rounded dense hide-bottom-space
                            placeholder="Share your thoughts or suggestion..." class="col" :error="!!error" no-error-icon
                            @keydown.ctrl.enter="submitComment" @keydown.meta.enter="submitComment"
                        />
                        <q-btn round unelevated color="primary" icon="bi-send-fill" size="md" :loading="posting" :disable="!content.trim()" @click="submitComment">
                            <q-tooltip>Post comment (Ctrl + Enter)</q-tooltip>
                        </q-btn>
                    </div>
                    <div class="text-negative text-caption q-mt-xs q-ml-xl" v-if="error">{{ error }}</div>
                </template>
            </div>
        </div>

        <div class="text-center q-pa-lg" v-else-if="loading">
            <q-spinner-oval size="lg" color="primary" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import moment from 'moment';

// id/hideBack let this same component serve two contexts: standalone on its own route (default —
// id falls back to route.params.id, back button shown) and embedded as modal content from
// DiscussionList.vue (id passed explicitly, hideBack set — there's no "back", just closing the
// dialog).
const props = defineProps({
    id: { type: [String, Number], default: null },
    hideBack: { type: Boolean, default: false },
});

const route = useRoute();
const authStore = useAuthStore();
const basePath = computed(() => (route.path.startsWith('/home') ? '/home' : ''));
const discussionId = computed(() => props.id ?? route.params.id);

const loading = ref(false);
const discussion = ref(null);
const guestName = ref('');
const content = ref('');
const posting = ref(false);
const error = ref('');

// A discussion can be "open" in status but past its own expiresAt — the backend rejects a
// comment either way (see DiscussionController.addComment), so the compose box has to check
// both, not just status.
const canComment = computed(() => discussion.value?.status === 'open' && !discussion.value?.isExpired);
const statusLabel = (d) => (d.status === 'open' && d.isExpired) ? 'expired' : d.status;
const statusClass = (x) => ((x.status === 'open' && x.isExpired) ? 'pt-st-expired' : `pt-st-${x.status}`);
const statusPillStyle = (d) => {
    if (d.status === 'open' && d.isExpired) return { background: '#FBF1D9', color: '#9A6B00' };
    if (d.status === 'open') return { background: '#E4F5E9', color: '#1C8A3B' };
    return { background: '#F6F9FC', color: '#8493AC' };
};

const formatDate = (timestamp) => moment(timestamp).fromNow();
const myName = computed(() => [authStore.user?.firstname, authStore.user?.lastname].filter(Boolean).join(' '));
// a steady colour for each person, from their name
const TONES = ['#204888', '#1C6B35', '#8A5B00', '#6A3FA0', '#A52E22', '#0F7C8C'];
const tone = (name) => TONES[[...(name || 'A')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];
const initials = (name) => (name || 'A').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

// `quiet`: load it again without blanking the thread first (after a comment, so the thread, the
// scroll position and the box you are typing in stay put while it refreshes)
const loadDiscussion = async ({ quiet = false } = {}) => {
    if (!discussionId.value) return;
    loading.value = true;
    if (!quiet) discussion.value = null;
    try {
        const response = await api.get(`/discussion/${discussionId.value}`);
        discussion.value = response.data.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

// a new comment (or the discussion being closed) shows up for everyone reading it, while what you are typing stays
useLiveRefresh(['discussion'], () => loadDiscussion({ quiet: true }));

const submitComment = async () => {
    error.value = '';
    if (!authStore.isAuthenticated) {
        error.value = 'Please sign in to join the discussion.';
        return;
    }
    if (!content.value.trim()) {
        error.value = 'Please write something before posting.';
        return;
    }
    posting.value = true;
    try {
        await api.post(`/discussion/${discussionId.value}/comment`, {
            content: content.value
        });
        content.value = '';
        await loadDiscussion({ quiet: true });
        // bring the new comment into view
        await nextTick();
        const msgs = document.querySelectorAll('.dt-msg');
        if (msgs.length) msgs[msgs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
        error.value = e.response?.data?.message || 'Unable to post your comment.';
        // closed meanwhile (400) or not allowed (403): load it again so the page shows how it stands
        if ([400, 403].includes(e.response?.status)) loadDiscussion({ quiet: true });
    } finally {
        posting.value = false;
    }
};

// One reactive source drives loading, whether the id comes from the route (standalone page) or
// changes because DiscussionList.vue reused this same component instance across clicks on
// different rows (modal mode). immediate: true covers the initial mount, so a separate
// onMounted isn't needed. Reset compose state on every id change too, or a half-typed comment/
// stale error from the previous discussion would carry over into this one.
watch(discussionId, (newId) => {
    if (!newId) return;
    content.value = '';
    guestName.value = '';
    error.value = '';
    loadDiscussion();
}, { immediate: true });
</script>

<style scoped>
.dt-hero { padding: 20px 22px; border-radius: 18px; color: #fff; background: linear-gradient(135deg, var(--tone) 0%, var(--tone-2) 100%); position: relative; overflow: hidden; margin-bottom: 14px; }
.dt-hero::after { content: ''; position: absolute; right: -50px; top: -60px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255, 255, 255, .07); }
.dt-hero > * { position: relative; z-index: 1; }
.dt-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dt-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #FFC900; }
.dt-title { font-size: 22px; font-weight: 800; line-height: 1.25; margin: 8px 0 12px; }
.dt-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; opacity: .92; }
.dt-meta > span { display: inline-flex; align-items: center; gap: 6px; }
.dt-office { padding: 2px 10px; border-radius: 99px; background: rgba(255, 255, 255, .16); font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
.dt-desc { padding: 14px 18px; margin-bottom: 18px; background: #fff; border: 1px solid #E6ECF5; border-left: 4px solid var(--tone-2); border-radius: 6px 14px 14px 6px; }

.dt-section { display: flex; align-items: center; gap: 10px; margin: 6px 2px 12px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #4C5C79; }
.dt-section em { font-style: normal; padding: 1px 9px; border-radius: 99px; background: var(--tone-soft); color: var(--tone-ink); letter-spacing: 0; }
.dt-section::after { content: ''; flex: 1; height: 1px; background: #DCE4F0; order: 1; }
.dt-section em { order: 2; }

.dt-thread { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
.dt-msg { display: flex; gap: 12px; align-items: flex-start; }
.dt-av { flex: none; width: 38px; height: 38px; border-radius: 50%; color: #fff; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
.dt-bubble { flex: 1; min-width: 0; padding: 11px 14px; background: #fff; border: 1px solid #E6ECF5; border-radius: 4px 16px 16px 16px; box-shadow: 0 2px 6px rgba(22, 35, 58, .04); }
.dt-who { display: flex; align-items: baseline; gap: 10px; }
.dt-who b { font-size: 13.5px; color: #1E2A44; }
.dt-who small { font-size: 11.5px; color: #8493AC; }
.dt-text { margin-top: 3px; font-size: 14px; line-height: 1.55; color: #3A4A68; white-space: pre-line; word-break: break-word; }
.dt-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 30px 16px; margin-bottom: 18px; text-align: center; color: #8493AC; font-size: 13px; background: #fff; border: 1px dashed #D3DCEB; border-radius: 16px; }
.dt-empty .q-icon { font-size: 34px; color: var(--tone); }
.dt-empty b { color: #1E2A44; font-size: 15px; }

.dt-compose { position: sticky; bottom: 0; margin: 0 -16px -16px; padding: 12px 16px 16px; background: linear-gradient(180deg, rgba(246, 249, 252, 0) 0, #F6F9FC 22%); }
.dt-compose-row { display: flex; align-items: flex-end; gap: 10px; padding: 10px; background: #fff; border: 1px solid #DCE4F0; border-radius: 18px; box-shadow: 0 8px 24px rgba(20, 40, 90, .1); }
.dt-compose-row .dt-av { margin-bottom: 2px; }
.dt-compose .q-btn--round { background: var(--tone) !important; color: #fff !important; }
.dt-closed { padding: 12px 16px; border-radius: 14px; background: #F1F2F5; color: #6B7488; font-size: 13px; text-align: center; }
</style>