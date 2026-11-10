<template>
    <span class="rc-pill imp" :class="`rc-pill--${look.tone}`">
        <q-icon :name="look.icon" size="13px" />
        <span>{{ shown }}</span>
        <q-tooltip v-if="why" max-width="280px">{{ why }}</q-tooltip>
    </span>
</template>

<script setup>
import { computed } from 'vue';

// How a client felt, as a small pill: positive / neutral / negative, or "not rated" when there is nothing to judge it by.
// Used for a feedback, a CSM report and a client as a whole (see utils/clientProfile.js in the API for how each is worked out).
//   value  'positive' | 'neutral' | 'negative' | null
//   label  goes after the word (e.g. "positive · 4.2 / 5")
//   why    what it was worked out from, shown on hover
const props = defineProps({
    value: { type: String, default: null },
    label: { type: String, default: '' },
    why: { type: String, default: '' },
});

const LOOKS = {
    positive: { tone: 'ok', icon: 'bi-emoji-smile', text: 'positive' },
    neutral: { tone: 'warn', icon: 'bi-emoji-neutral', text: 'neutral' },
    negative: { tone: 'bad', icon: 'bi-emoji-frown', text: 'negative' },
};
const shown = computed(() => (props.label && props.value ? `${LOOKS[props.value].text} · ${props.label}` : (props.label || look.value.text)));
const look = computed(() => LOOKS[props.value] || { tone: 'off', icon: 'bi-dash-circle', text: 'not rated' });
</script>

<style scoped>
.imp { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
</style>
