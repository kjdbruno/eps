<template>
    <!-- The "review" step of a creation dialog: what is about to be saved, as plain label / value pairs. -->
    <div class="rc-block">
        <div class="rc-block-title">{{ title }}</div>
        <div class="text-caption text-grey q-mb-sm">{{ hint }}</div>
        <div class="rc-kv">
            <template v-for="row in shown" :key="row.label">
                <span>{{ row.label }}</span>
                <span v-if="Array.isArray(row.value) && row.value.length">
                    <div v-for="line in row.value" :key="line">{{ line }}</div>
                </span>
                <span v-else :class="{ 'text-grey': isEmpty(row.value) }">{{ isEmpty(row.value) ? 'not set' : row.value }}</span>
            </template>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    rows: { type: Array, default: () => [] },
    title: { type: String, default: 'review' },
    hint: { type: String, default: 'Check everything below. Go back to change something, or submit to finish.' },
});

const isEmpty = (v) => v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
// rows can be hidden when they do not apply (a flag: show === false)
const shown = computed(() => props.rows.filter(r => r.show !== false));
</script>
