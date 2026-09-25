<template>
    <div>

        <!-- Patterned after the internal desk's discussion detail modal: eyebrow + title + status
             pill header, bg-accent sections for description/comments/compose. Single column
             throughout so it reads naturally on a phone-width screen. -->
        <q-card class="no-shadow dt-card" v-if="discussion">
            <div class="row items-start justify-between q-gutter-sm q-mb-md">
                <div>
                    <div class="dt-eyebrow">public discussion &middot; topic detail</div>
                    <div class="text-h5">{{ discussion.title }}</div>
                    <div class="row items-center q-gutter-xs q-mt-xs">
                        <span class="dt-pill" :style="statusPillStyle(discussion)">{{ statusLabel(discussion) }}</span>
                        <span class="dt-pill dt-pill--office" v-for="o in discussion.offices" :key="o.id">{{ o.alias || o.name }}</span>
                        <span class="text-caption text-grey" v-if="discussion.expiresAt">
                            {{ discussion.isExpired ? 'expired' : 'expires' }} {{ formatDate(discussion.expiresAt) }}
                        </span>
                    </div>
                </div>
                <div class="text-caption text-grey">filed {{ formatDate(discussion.createdAt) }}</div>
            </div>

            <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm" v-if="discussion.description" style="border-radius: 15px;">
                <div class="text-caption text-uppercase text-grey q-mb-xs">description</div>
                <div class="text-body2">{{ discussion.description }}</div>
            </q-card-section>

            <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm" style="border-radius: 15px;">
                <div class="text-caption text-uppercase text-grey q-mb-xs">{{ discussion.comments.length }} comment(s)</div>
                <q-list bordered separator class="radius-sm overflow-hidden" v-if="discussion.comments.length">
                    <q-item v-for="c in discussion.comments" :key="c.id">
                        <q-item-section avatar top>
                            <q-avatar color="primary" text-color="white" size="36px">{{ initials(c.authorName) }}</q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-weight-bold text-capitalize">{{ c.authorName }}</q-item-label>
                            <q-item-label caption>{{ formatDate(c.createdAt) }}</q-item-label>
                            <div class="text-body2 q-mt-xs">{{ c.content }}</div>
                        </q-item-section>
                    </q-item>
                </q-list>
                <div class="text-caption text-grey" v-else>Be the first to comment.</div>
            </q-card-section>

            <q-card-section class="q-pa-md radius-sm bg-accent" style="border-radius: 15px;">
                <template v-if="canComment">
                    <div class="text-caption text-uppercase text-grey q-mb-xs">join the discussion</div>
                    <div class="q-mb-sm" v-if="!authStore.isAuthenticated">
                        <div class="text-caption text-uppercase q-mb-xs text-grey">your name (optional)</div>
                        <q-input outlined dense v-model="guestName" placeholder="Anonymous" />
                    </div>
                    <q-input outlined type="textarea" v-model="content" placeholder="Share your thoughts or suggestion..." class="q-mb-sm" />
                    <div class="text-negative text-caption q-mb-sm" v-if="error">{{ error }}</div>
                    <q-btn unelevated color="primary" no-caps label="post comment" class="full-width" :loading="posting" @click="submitComment" />
                </template>
                <div class="text-caption text-grey" v-else>
                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                    This discussion is closed to new comments.
                </div>
            </q-card-section>
        </q-card>

        <div class="text-center q-pa-lg" v-else-if="loading">
            <q-spinner-ios size="1.5em" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
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
const statusPillStyle = (d) => {
    if (d.status === 'open' && d.isExpired) return { background: '#FBF1D9', color: '#9A6B00' };
    if (d.status === 'open') return { background: '#E4F5E9', color: '#1C8A3B' };
    return { background: '#F6F9FC', color: '#8493AC' };
};

const formatDate = (timestamp) => moment(timestamp).fromNow();
const initials = (name) => (name || 'A').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

const loadDiscussion = async () => {
    if (!discussionId.value) return;
    loading.value = true;
    discussion.value = null;
    try {
        const response = await api.get(`/discussion/${discussionId.value}`);
        discussion.value = response.data.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const submitComment = async () => {
    error.value = '';
    if (!content.value.trim()) {
        error.value = 'Please write something before posting.';
        return;
    }
    posting.value = true;
    try {
        await api.post(`/discussion/${discussionId.value}/comment`, {
            content: content.value,
            guestName: guestName.value
        });
        content.value = '';
        await loadDiscussion();
    } catch (e) {
        error.value = e.response?.data?.message || 'Unable to post your comment.';
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
.dt-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.dt-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.dt-pill--office {
    background: #F6F9FC;
    color: #4C5C79;
}
@media (max-width: 600px) {
    .dt-card {
        padding: 16px !important;
    }
}
</style>
