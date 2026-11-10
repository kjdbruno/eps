<template>
    <div class="kx-home">
        <div class="kx-hero">
            <div class="kx-hero-eyebrow">welcome to the eParticipation system</div>
            <div class="kx-hero-title">How can we help you today?</div>
            <div class="kx-hero-sub">Tell us about a concern, or rate the service you just received. Tap a card below to begin.</div>
        </div>

        <div class="kx-tiles">
            <div
                v-for="(mod, i) in modules" :key="mod.route"
                class="kx-tile" :class="{ 'kx-tile--main': i === 0 }"
                @click="router.push({ name: mod.route })"
            >
                <span class="kx-tile-ico"><q-icon :name="mod.icon" /></span>
                <div class="kx-tile-title">{{ mod.label }}</div>
                <div class="kx-tile-sub">{{ mod.description }}</div>
                <span class="kx-tile-go">{{ mod.cta }} <q-icon name="bi-arrow-right" /></span>
            </div>
        </div>

        <div class="kx-hint">
            <span><q-icon name="bi-clock" /> Takes about a minute</span>
            <span><q-icon name="bi-shield-check" /> Your answers stay private</span>
            <span><q-icon name="bi-signpost-split" /> Routed to the right office automatically</span>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const modules = [
    {
        label: 'File a complaint',
        route: 'file-complaint',
        icon: 'bi-chat-quote',
        cta: 'Start now',
        description: "Report an issue or concern — we'll route it to the right department and email you a reference number to track it.",
    },
    {
        label: 'Give feedback',
        route: 'feedback',
        icon: 'bi-emoji-smile',
        cta: 'Rate our service',
        description: 'Rate the service you just received — it takes about a minute and helps us improve.',
    },
];
</script>
