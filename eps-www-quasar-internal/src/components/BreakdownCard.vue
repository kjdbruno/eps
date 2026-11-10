<template>
    <q-card flat class="custom-border radius-xs q-pa-md">
        <div class="row items-baseline no-wrap q-mb-md">
            <div class="text-subtitle1 text-weight-bold text-capitalize">{{ title }}</div>
            <div class="text-caption text-grey q-ml-sm" v-if="subtitle">{{ subtitle }}</div>
        </div>
        <div v-for="it in items" :key="it.label" class="q-mb-sm">
            <div class="row items-center q-mb-xs">
                <div class="text-body2 text-capitalize">{{ it.label }}</div>
                <q-space />
                <div class="text-caption text-grey">{{ it.count }} &middot; {{ percent(it.count) }}%</div>
            </div>
            <q-linear-progress :value="total ? it.count / total : 0" :color="it.color || 'primary'" track-color="grey-3" size="8px" rounded />
        </div>
    </q-card>
</template>

<script setup>
import { computed } from 'vue';

// A titled list of proportion bars — "how is this list split?" (active vs inactive, by role...).
const props = defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    // [{ label, count, color? }]
    items: { type: Array, default: () => [] },
});

const total = computed(() => props.items.reduce((s, i) => s + (i.count || 0), 0));
const percent = (count) => total.value ? Math.round(count / total.value * 100) : 0;
</script>
