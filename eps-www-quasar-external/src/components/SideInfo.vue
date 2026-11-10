<template>
    <!-- the short "how it works" beside a form or a list: numbered steps, then a one-line note -->
    <aside class="pt-side">
        <div class="pt-side-card">
            <div class="pt-side-title">{{ title }}</div>
            <div v-for="(s, i) in steps" :key="i" class="pt-side-step">
                <span>{{ i + 1 }}</span>
                <div><b>{{ s.title }}</b><small>{{ s.text }}</small></div>
            </div>
        </div>
        <div class="pt-side-note" v-if="$slots.default">
            <q-icon :name="icon" size="20px" />
            <div><slot /></div>
        </div>
    </aside>
</template>

<script setup>
defineProps({
    title: { type: String, default: '' },
    // [{ title, text }]
    steps: { type: Array, default: () => [] },
    icon: { type: String, default: 'bi-info-circle' },
});
</script>
