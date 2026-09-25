<template>
    <q-layout view="lHh Lpr lFf">
        <q-header class="bg-white text-dark kl-header" bordered>
            <q-toolbar class="kl-toolbar">
                <router-link to="/" class="row items-center no-decoration">
                    <img :src="citySeal" width="40" class="q-mr-sm" />
                    <div>
                        <div class="text-subtitle1 text-weight-bold">eParticipation System Kiosk</div>
                    </div>
                </router-link>
                <q-space />
                <q-btn
                    v-if="route.name !== 'index'"
                    unelevated rounded color="primary" label="home" size="lg"
                    class="q-px-lg" to="/"
                />
            </q-toolbar>
        </q-header>

        <q-page-container class="kl-page-container">
            <router-view />
        </q-page-container>
    </q-layout>
</template>

<script setup>
import { useRoute } from 'vue-router';
import citySeal from '../assets/epslogo.png';

const route = useRoute();
</script>

<style scoped>
/* Kiosk is a public touch terminal, always full-screen — larger header than a normal desktop
   app's, and every interactive control on every page targets a comfortably tappable size. */
.kl-header {
    height: 76px;
}
.kl-toolbar {
    height: 76px;
    padding: 0 32px;
}
.no-decoration {
    text-decoration: none;
    color: inherit;
}
.kl-page-container {
    background: #F6F9FC;
    min-height: 100vh;
}
</style>
