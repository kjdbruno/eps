<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <!-- HomePage manages its own full-bleed hero/sections (same shape as IndexPage), so it
                 skips the centered wrapper. Every other authenticated page gets the same centered
                 "wide" body the guest pages use. -->
            <q-page v-if="route.path === '/home'">
                <router-view />
            </q-page>
            <q-page v-else class="pt-page">
                <router-view />
            </q-page>
        </q-page-container>
        <SiteFooter />
    </q-layout>
</template>

<script setup>
import { useRoute } from 'vue-router';
import SiteHeader from 'src/components/SiteHeader.vue';
import SiteFooter from 'src/components/SiteFooter.vue';

const route = useRoute();
</script>
