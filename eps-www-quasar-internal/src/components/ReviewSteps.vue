<template>
    <!-- "1 · details  2 · review" under a dialog's title, same pills as the CSM wizard. -->
    <div class="rc-hero-badges">
        <span class="rc-hero-pill" :class="{ 'rc-hero-pill--on': !reviewing }" :style="{ opacity: reviewing ? .7 : 1 }">1 &middot; {{ first }}</span>
        <span class="rc-hero-pill" :class="{ 'rc-hero-pill--on': reviewing }" :style="{ opacity: reviewing ? 1 : .7 }">2 &middot; review</span>
    </div>
</template>

<script setup>
defineProps({
    reviewing: { type: Boolean, default: false },
    first: { type: String, default: 'details' },
});
</script>
