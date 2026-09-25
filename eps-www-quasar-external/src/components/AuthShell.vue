<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <!-- "website" mode: content flows in open sections on the page, no boxed card, generous
                 spacing — used by the richer pages (file complaint, track, discussion, poll). -->
            <q-page v-if="wide" class="q-py-xl q-px-md">
                <div class="wide-shell" :style="{ maxWidth: maxWidth }">
                    <div class="row items-center q-mb-xl" v-if="title || route.path !== '/'">
                        <q-btn
                            v-if="route.path !== '/'"
                            flat round dense icon="bi-arrow-left" color="grey-8" class="q-mr-md"
                            to="/"
                        >
                            <q-tooltip>Back to Home</q-tooltip>
                        </q-btn>
                        <div v-if="title">
                            <div class="text-h4 text-dark">{{ title }}</div>
                            <div class="text-body1 text-grey q-mt-xs" v-if="subtitle">{{ subtitle }}</div>
                        </div>
                    </div>
                    <slot />
                </div>
            </q-page>

            <!-- classic mode: a single centered card — still used for the short auth/OTP forms. -->
            <q-page v-else class="flex flex-center q-pa-md q-py-xl">
                <q-card class="no-shadow radius-md bg-accent q-pa-xl relative-position" :style="{ width: maxWidth, maxWidth: '95vw' }">
                    <q-btn
                        v-if="route.path !== '/'"
                        class="absolute-top-left q-ma-sm"
                        flat
                        round
                        dense
                        icon="bi-arrow-left"
                        color="grey-8"
                        to="/"
                    >
                        <q-tooltip>Back to Home</q-tooltip>
                    </q-btn>
                    <q-card-section class="text-center" v-if="title">
                        <div class="text-h4 text-capitalize text-dark">{{ title }}</div>
                        <div class="text-caption text-grey q-mt-xs" v-if="subtitle">{{ subtitle }}</div>
                    </q-card-section>
                    <q-card-section>
                        <slot />
                    </q-card-section>
                </q-card>
            </q-page>
        </q-page-container>
        <SiteFooter />
    </q-layout>
</template>

<script setup>
import { useRoute } from 'vue-router';
import SiteHeader from './SiteHeader.vue';
import SiteFooter from './SiteFooter.vue';

const route = useRoute();

defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    maxWidth: { type: String, default: '480px' },
    wide: { type: Boolean, default: false },
});
</script>

<style scoped>
.wide-shell {
    margin: 0 auto;
}
</style>
