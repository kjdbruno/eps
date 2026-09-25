<template>
    <q-page class="kx-page flex flex-center">
        <div class="kx-shell">
            <div class="text-center q-mb-xl">
                <div class="kx-eyebrow">welcome to the</div>
                <div class="text-h3 text-weight-bold q-mb-sm">eParticipation System Kiosk</div>
                <div class="text-subtitle1 text-grey">Tap a module below to get started.</div>
            </div>

            <div class="kx-tile-grid">
                <q-card
                    v-for="mod in modules" :key="mod.route"
                    flat clickable class="kx-tile radius-md custom-border"
                    @click="router.push({ name: mod.route })"
                >
                    <q-icon :name="mod.icon" size="72px" :color="mod.color" class="q-mb-md" />
                    <div class="text-h5 text-weight-bold text-capitalize q-mb-xs">{{ mod.label }}</div>
                    <div class="text-body2 text-grey">{{ mod.description }}</div>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const modules = [
    {
        label: 'File a Complaint',
        route: 'file-complaint',
        icon: 'bi-chat-quote',
        color: 'primary',
        description: 'Report an issue or concern — we\'ll route it to the right department and email you a reference number to track it.',
    },
    {
        label: 'Give Feedback',
        route: 'feedback',
        icon: 'bi-emoji-smile',
        color: 'positive',
        description: 'Rate the service you just received — it takes about a minute and helps us improve.',
    },
];
</script>

<style scoped>
.kx-page {
    padding: 32px;
}
.kx-shell {
    width: 100%;
    max-width: 900px;
}
.kx-eyebrow {
    font-size: 13px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 4px;
}
.kx-tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
}
/* Large, unmistakably tappable — this is a public touch kiosk, not a mouse-driven desktop app. */
.kx-tile {
    padding: 48px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 260px;
    justify-content: center;
    background: #FFFFFF;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kx-tile:hover, .kx-tile:active {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 78, 168, 0.12);
}
</style>
