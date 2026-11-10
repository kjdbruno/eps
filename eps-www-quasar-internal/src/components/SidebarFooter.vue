<template>
    <div class="sf">
        <!-- what is waiting, from the same counts the menu badges show -->
        <div class="sf-card">
            <div class="sf-eyebrow">to do</div>

            <template v-if="rows.length">
                <button v-for="r in rows" :key="r.key" type="button" class="sf-row" :class="{ 'sf-row--warn': r.warn }" @click="emit('open', r.key)">
                    <q-icon :name="r.icon" size="14px" />
                    <span class="sf-row-text"><b>{{ r.count }}</b> {{ r.text }}<small v-if="r.hint">{{ r.hint }}</small></span>
                    <q-icon name="bi-chevron-right" size="11px" />
                </button>
            </template>
            <div v-else class="sf-clear">
                <q-icon name="bi-check2-circle" size="18px" />
                <span>You are all caught up</span>
            </div>
        </div>

        <!-- quick actions for the role -->
        <div class="sf-actions">
            <button v-for="a in actions" :key="a.key" type="button" class="sf-act" @click="emit('open', a.key)">
                <q-icon :name="a.icon" size="15px" /> {{ a.label }}
            </button>
        </div>

        <!-- how long the session has left -->
        <div class="sf-session">
            <q-icon name="bi-clock-history" size="12px" />
            <span>{{ sessionText }}</span>
            <q-space />
            <button type="button" class="sf-out" aria-label="Sign out" @click="authStore.logout()">
                <q-icon name="bi-power" size="14px" />
                <q-tooltip>Sign out</q-tooltip>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';

const props = defineProps({
    // { feedback, complaint, discussion, poll } — the counts the menu badges use
    badges: { type: Object, default: () => ({}) },
    // the keys of the menu entries this person can open
    allowed: { type: Array, default: () => [] },
});
// `open` carries the menu entry's label, so the layout opens it the same way a menu click does
const emit = defineEmits(['open']);

const authStore = useAuthStore();
const role = computed(() => authStore.user?.role);

const plural = (n, one, many) => (n === 1 ? one : many);

const rows = computed(() => {
    const b = props.badges || {};
    const list = [
        { key: 'complaint', icon: 'bi-chat-quote', count: b.complaint, text: 'feedback to receive', warn: true },
        { key: 'feedback', icon: 'bi-emoji-expressionless', count: b.feedback, text: plural(b.feedback, 'new CSM report', 'new CSM reports') },
        { key: 'discussion', icon: 'bi-people', count: b.discussion, text: plural(b.discussion, 'new comment', 'new comments') },
        { key: 'poll', icon: 'bi-bar-chart-line', count: b.poll, text: plural(b.poll, 'new vote', 'new votes') },
    ];
    return list.filter(r => r.count > 0 && props.allowed.includes(r.key));
});

const actions = computed(() => {
    const all = {
        complaint: { key: 'complaint', label: 'Feedback', icon: 'bi-chat-quote' },
        discussion: { key: 'discussion', label: 'Discussion', icon: 'bi-people' },
        report: { key: 'report', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
    };
    const wanted = role.value === 'workstation' ? ['complaint', 'discussion']
        : role.value === 'monitoring' ? ['report', 'complaint']
            : ['complaint', 'report'];
    return wanted.filter(k => props.allowed.includes(k)).map(k => all[k]);
});

// the session: the token's own end time, counted down in hours and minutes
const now = ref(Date.now());
let tick = null;
onMounted(() => { tick = setInterval(() => { now.value = Date.now(); }, 30000); });
onBeforeUnmount(() => clearInterval(tick));

const endsAt = computed(() => {
    try {
        const payload = JSON.parse(atob(String(authStore.token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.exp ? payload.exp * 1000 : 0;
    } catch (e) {
        return 0;
    }
});
const sessionText = computed(() => {
    if (!endsAt.value) return 'Signed in';
    const mins = Math.max(0, Math.floor((endsAt.value - now.value) / 60000));
    if (mins >= 60 * 24) return `Session ends in ${Math.floor(mins / 1440)}d`;
    if (mins >= 60) return `Session ends in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `Session ends in ${mins}m`;
});
</script>

<style scoped>
.sf { flex: none; max-height: 52%; overflow-y: auto; padding-top: 12px; }
.sf-card { background: #F6F9FC; border: 1px solid #E4EAF3; border-radius: 16px; padding: 12px 14px; }
.sf-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--q-primary); margin-bottom: 4px; }
.sf-row { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 6px; padding: 7px 9px; border-radius: 10px; background: #fff; color: #2B3A57; font: inherit; font-size: 12px; text-align: left; cursor: pointer; border: 1px solid #E4EAF3; }
.sf-row:hover { border-color: var(--q-primary); }
.sf-row-text { flex: 1; min-width: 0; line-height: 1.25; }
.sf-row-text b { font-weight: 800; color: #16233A; }
.sf-row-text small { display: block; font-size: 10.5px; color: #8493AC; }
.sf-row--warn { background: #FFF6E5; border-color: #F5D9A6; }
.sf-row--warn .q-icon:first-child { color: #B26A00; }
.sf-clear { display: flex; align-items: center; gap: 8px; padding: 6px 2px 2px; font-size: 12.5px; font-weight: 600; color: #1B7A43; }
.sf-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.sf-act { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border: 1px solid #DCE5F3; border-radius: 99px; background: #fff; color: var(--q-primary); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; overflow: hidden; }
.sf-act:hover { background: #EAF1FF; }
.sf-session { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 0 4px; font-size: 11px; color: #8493AC; }
.sf-out { border: 0; background: none; padding: 4px; border-radius: 50%; color: #8493AC; cursor: pointer; }
.sf-out:hover { background: #FDECEE; color: #C10015; }
</style>
