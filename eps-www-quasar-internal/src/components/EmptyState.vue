<template>
    <div class="rc-empty es" :class="{ 'rc-empty--sm': small, 'es--rail': rail }">
        <q-icon :name="icon" :size="small ? '26px' : '36px'" />
        <div class="rc-empty-t">{{ title }}</div>
        <div v-if="hint" class="rc-empty-d">{{ hint }}</div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
// What a list, a rail or a panel shows when there is nothing to list: the same dashed block as the empty photos and
// the empty activity in the detail dialogs (an icon in a circle, a title, a line of help). `rail` is the compact form for
// the right-hand lists, with a margin so it does not touch the edges of the rail. `compact` is the same small form without
// the margin, for a notice inside a panel or a block (a locked step, a finalized feedback).
const props = defineProps({
    icon: { type: String, default: 'bi-inbox' },
    title: { type: String, default: '' },
    hint: { type: String, default: '' },
    rail: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
});
const small = computed(() => props.rail || props.compact);
</script>
