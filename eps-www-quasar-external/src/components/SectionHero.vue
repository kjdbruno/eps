<template>
    <header class="sh">
        <div class="sh-main">
            <div class="sh-top">
                <span class="sh-ico"><q-icon :name="icon" /></span>
                <div class="col" style="min-width: 0;">
                    <div class="sh-eyebrow">{{ eyebrow }}</div>
                    <h1 class="sh-title">{{ title }}</h1>
                </div>
            </div>
            <p v-if="subtitle" class="sh-sub">{{ subtitle }}</p>
        </div>

        <!-- a few numbers about what is on the board -->
        <div v-if="stats.length" class="sh-stats">
            <div v-for="s in stats" :key="s.label" class="sh-stat">
                <b>{{ s.value }}</b><small>{{ s.label }}</small>
            </div>
        </div>

        <!-- the page's buttons, under the title and the numbers -->
        <div v-if="$slots.default" class="sh-actions"><slot /></div>
    </header>
</template>

<script setup>
// The band at the top of the Discussions and Polls pages. Its colours come from the section
// (a `tone-feedback` / `tone-discussion` / `tone-survey` ancestor, see portal.scss): feedback is light blue, discussions orange, surveys yellow.
defineProps({
    icon: { type: String, required: true },
    eyebrow: { type: String, default: '' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    // [{ value, label }]
    stats: { type: Array, default: () => [] },
});
</script>
