<template>
    <div>
        <!-- caption above the control: the field's name, or its error message in red; a small
             mandatory / optional tag on the right (same pattern as the revapp forms) -->
        <div class="row items-center no-wrap">
            <div class="text-caption text-uppercase" :class="error ? 'text-negative' : 'text-grey'">{{ error || label }}</div>
            <q-space />
            <div v-if="tag && !error" class="text-grey text-uppercase ff-tag">{{ tag }}</div>
        </div>
        <slot />
        <div v-if="hint" class="text-caption text-grey q-mt-xs">{{ hint }}</div>
    </div>
</template>

<script setup>
defineProps({
    label: { type: String, default: '' },
    // the error message; when set it replaces the caption, in red
    error: { type: String, default: '' },
    // 'mandatory' | 'optional' | '' (nothing)
    tag: { type: String, default: '' },
    hint: { type: String, default: '' },
});
</script>

<style scoped>
.ff-tag { font-size: 10px; letter-spacing: .04em; }
</style>
