<template>
    <q-card flat class="rc-kpi radius-xs" :class="tone === 'primary' ? 'bg-primary' : 'custom-border'">
        <span class="rc-kpi-ico"><q-icon :name="icon" size="19px" /></span>
        <div class="rc-kpi-body">
            <div class="rc-kpi-value" :class="valueClass">{{ value }}</div>
            <div class="rc-kpi-label" :class="tone === 'primary' ? 'text-white' : 'text-grey'">{{ label }}</div>
        </div>
    </q-card>
</template>

<script setup>
import { computed } from 'vue';

// One stat tile: a tinted icon, the number, and a small caption. `tone` 'primary' is the filled
// headline tile; 'positive' / 'negative' colour the number on an outlined tile.
const props = defineProps({
    icon: { type: String, default: 'bi-circle' },
    value: { type: [Number, String], default: 0 },
    label: { type: String, default: '' },
    tone: { type: String, default: '' },
});

const valueClass = computed(() => ({
    primary: 'text-white',
    positive: 'text-positive',
    negative: 'text-negative',
}[props.tone] || 'text-primary'));
</script>
