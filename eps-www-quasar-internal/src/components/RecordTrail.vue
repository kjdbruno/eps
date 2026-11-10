<template>
    <div class="rt">
        <!-- the details of the record: who or what it is, and the few facts that matter -->
        <section v-if="headline || facts.length" class="rt-card">
            <div v-if="headline" class="rt-head">
                <PersonAvatar v-if="person" :user="person" :size="44" :online="!!person.isOnline" />
                <span v-else class="rt-badge"><q-icon :name="icon" size="20px" /></span>
                <div class="rt-title">
                    <div class="rt-name">{{ headline }}</div>
                    <div v-if="subline" class="rt-sub">{{ subline }}</div>
                </div>
                <span v-if="status" class="rc-pill" :class="`rc-pill--${status.tone}`">{{ status.label }}</span>
            </div>
            <div v-if="facts.length" class="rt-facts">
                <div v-for="f in facts" :key="f.label" class="rt-fact">
                    <q-icon :name="f.icon" size="15px" class="rt-fact-ico" />
                    <span class="rt-fact-l">{{ f.label }}</span>
                    <span class="rt-fact-v" :class="{ 'rt-fact-v--dim': f.dim }">{{ f.value }}</span>
                </div>
            </div>
        </section>

        <div class="rc-cap rt-cap">history<span class="rc-count">{{ entries.length }}</span></div>

        <q-inner-loading :showing="loading && !loaded"><q-spinner-ios color="primary" size="sm" /></q-inner-loading>

        <div v-if="entries.length" class="rt-list">
            <div v-for="(e, i) in entries" :key="e.key" class="rt-item" :class="{ 'rt-item--last': i === entries.length - 1 }">
                <span class="rt-dot" :class="`rt-dot--${e.tone}`"><q-icon :name="e.icon" size="12px" /></span>
                <div class="rt-body">
                    <div class="rt-text">{{ e.text }}</div>
                    <div class="rt-meta">
                        <template v-if="e.who">{{ e.who }} &middot; </template>{{ moment(e.at).format('MMM DD, YYYY') }}
                        <span class="rt-ago">{{ moment(e.at).fromNow() }}</span>
                    </div>
                </div>
            </div>
        </div>
        <EmptyState v-else-if="loaded" compact icon="bi-clock-history" title="No history yet" hint="What is done to this record shows up here." />

        <button v-if="showLink" type="button" class="rt-link" @click="emit('manage')">
            <q-icon name="bi-toggles" size="14px" />
            <span>{{ linkText }} <b>Manage</b></span>
            <q-icon name="bi-arrow-right-short" size="18px" />
        </button>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import EmptyState from 'src/components/EmptyState.vue';
import PersonAvatar from 'src/components/PersonAvatar.vue';

// The right-hand panel of an existing record while it is only being looked at: the trail of what was done to it, newest first
// (created, changed, switched on or off, by whom and when), from the activity log. A record that was seeded has no log lines,
// so it starts from the day it was created. The pencil is not here: changing and switching on or off are in Manage, and the
// link at the bottom goes there.
//   module     'user' | 'office' | 'holiday' | 'canned' | 'client'
//   entityId   the record
//   createdAt  when the record was created (the first line of the trail when nothing else says so)
const props = defineProps({
    module: { type: String, required: true },
    entityId: { type: Number, default: null },
    createdAt: { type: String, default: '' },
    // a history that is already at hand (a feedback keeps its own): [{ id, action, actorLabel, description, createdAt }]. Nothing is fetched then.
    items: { type: Array, default: null },
    // false where Manage is already open (the link would go nowhere)
    showLink: { type: Boolean, default: true },
    // the details shown above the history: a headline (and a line under it), the status as a pill, and a few facts
    //   facts   [{ label, value, icon, dim }]  (dim greys a value that says "not on record")
    headline: { type: String, default: '' },
    subline: { type: String, default: '' },
    icon: { type: String, default: 'bi-info-circle' },
    person: { type: Object, default: null },
    status: { type: Object, default: null },
    facts: { type: Array, default: () => [] },
    // what Manage is for, in the link at the bottom
    linkText: { type: String, default: 'Change it or switch it on or off in' },
});
const emit = defineEmits(['manage']);

const logs = ref([]);
const loading = ref(false);
const loaded = ref(false);

// what an action looks like in the trail: by its name, so the logs of every module (feedback, discussion, survey, accounts...) fit
const lookOf = (action) => {
    const a = String(action || '').toLowerCase();
    if (/creat|filed|opened|add/.test(a)) return { icon: 'bi-plus-lg', tone: 'ok' };
    if (/reopen/.test(a)) return { icon: 'bi-arrow-counterclockwise', tone: 'info' };
    if (/cancel|disabl|closed|left_unassigned/.test(a)) return { icon: 'bi-slash-lg', tone: 'bad' };
    if (/complet|enabl|verified|receiv|done/.test(a)) return { icon: 'bi-check-lg', tone: 'ok' };
    if (/respon|comment|reply/.test(a)) return { icon: 'bi-chat-dots', tone: 'info' };
    if (/assign|route|hand|reassign|office/.test(a)) return { icon: 'bi-diagram-3', tone: 'info' };
    if (/extend|extension/.test(a)) return { icon: 'bi-calendar-plus', tone: 'info' };
    if (/notif|sent|email/.test(a)) return { icon: 'bi-send', tone: 'info' };
    if (/updat|edit|chang/.test(a)) return { icon: 'bi-pencil', tone: 'info' };
    return { icon: 'bi-dot', tone: 'off' };
};
const source = computed(() => props.items || logs.value);
const entries = computed(() => {
    const list = source.value.map((l, i) => ({
        key: `log-${l.id ?? i}`, at: l.createdAt, who: l.actorLabel || '', text: l.description || l.action,
        ...lookOf(l.action),
    }));
    // the day it was created, unless the log already says so
    if (props.createdAt && !source.value.some(l => /creat|filed|opened/.test(String(l.action || '').toLowerCase()))) {
        list.push({ key: 'created', at: props.createdAt, who: '', text: 'Added to the system', ...lookOf('created') });
    }
    return list;
});

const load = async () => {
    if (props.items || !props.entityId) { loaded.value = true; return; }
    loading.value = true;
    try {
        const { data } = await api.get('/report/record-history', { params: { module: props.module, entityId: props.entityId } });
        logs.value = data.data || [];
    } catch (error) {
        logs.value = [];
    } finally {
        loading.value = false;
        loaded.value = true;
    }
};
watch(() => [props.module, props.entityId], () => { loaded.value = false; logs.value = []; load(); });
onMounted(load);
// a change made now (here or by someone else) shows without reopening it
useLiveRefresh(props.items ? ['none'] : [props.module], () => load());
</script>

<style scoped>
.rt { position: relative; }
.rt-card { margin-bottom: 18px; border: 1px solid #E6ECF5; border-radius: 12px; background: #fff; overflow: hidden; }
.rt-head { display: flex; align-items: center; gap: 12px; padding: 14px; background: #F6F9FC; border-bottom: 1px solid #E6ECF5; }
.rt-badge { flex: none; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #E5EEFC; color: #204888; }
.rt-title { flex: 1; min-width: 0; }
.rt-name { font-size: 14.5px; font-weight: 800; color: #16233A; line-height: 1.25; overflow-wrap: anywhere; }
.rt-sub { margin-top: 2px; font-size: 12px; color: #6B7A99; overflow-wrap: anywhere; }
.rt-facts { padding: 4px 14px 6px; }
.rt-fact { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; border-top: 1px solid #F0F3F8; font-size: 12.5px; }
.rt-fact:first-child { border-top: 0; }
.rt-fact-ico { flex: none; align-self: center; color: #8493AC; }
.rt-fact-l { flex: none; width: 92px; color: #8493AC; }
.rt-fact-v { flex: 1; min-width: 0; font-weight: 600; color: #16233A; text-align: right; overflow-wrap: anywhere; }
.rt-fact-v--dim { font-weight: 500; color: #A9B4C7; }
.rt-cap { margin-top: 2px; }
.rt-list { margin: 4px 0 14px 4px; }
.rt-item { position: relative; display: flex; gap: 10px; padding-bottom: 14px; }
.rt-item::before { content: ''; position: absolute; left: 10px; top: 22px; bottom: 0; width: 2px; background: #E3EAF4; }
.rt-item--last::before { display: none; }
.rt-dot { flex: none; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #F1F2F5; color: #6B7488; }
.rt-dot--ok { background: #E4F6EA; color: #1C6B35; }
.rt-dot--info { background: #E5EEFC; color: #2557B3; }
.rt-dot--bad { background: #FCE8E6; color: #A52E22; }
.rt-body { min-width: 0; }
.rt-text { font-size: 13px; font-weight: 600; color: #16233A; line-height: 1.35; overflow-wrap: anywhere; }
.rt-meta { margin-top: 2px; font-size: 11.5px; color: #8493AC; }
.rt-ago { margin-left: 4px; }
.rt-link { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; border: 1px dashed #C9D4E5; border-radius: 10px; background: #F8FAFD; color: #4C5C79; font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.rt-link span { flex: 1; }
.rt-link:hover { border-color: var(--q-primary); background: #F2F7FF; color: var(--q-primary); }
</style>
