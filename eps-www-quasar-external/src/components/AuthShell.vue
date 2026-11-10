<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <!-- sign in / register / forgot / verify: one card with the way through on the left and the form on the right -->
            <q-page v-if="auth" class="lgn-page">
                <div class="lgn-card">
                    <aside class="lgn-side gt-xs">
                        <div class="lgn-side-in">
                            <div class="lgn-eyebrow">eParticipation system</div>
                            <h2 class="lgn-headline">{{ headline || title }}</h2>
                            <p class="lgn-lead" v-if="lead">{{ lead }}</p>
                            <ol v-if="steps.length" class="lgn-steps">
                                <li v-for="(s, i) in steps" :key="i" :class="{ 'lgn-steps--on': active === i + 1 }">
                                    <span>{{ i + 1 }}</span>
                                    <div><b>{{ s.title }}</b><small>{{ s.text }}</small></div>
                                </li>
                            </ol>
                        </div>
                    </aside>

                    <div class="lgn-form">
                        <div class="lgn-form-in">
                            <div class="lgn-head">
                                <span class="lgn-badge"><q-icon :name="icon" size="22px" /></span>
                                <div>
                                    <div class="lgn-title">{{ title }}</div>
                                    <div class="lgn-sub" v-if="subtitle">{{ subtitle }}</div>
                                </div>
                            </div>
                            <slot />
                        </div>
                    </div>
                </div>
            </q-page>

            <!-- a page: its heading, then the form and a short "how it works" side by side -->
            <q-page v-else class="pt-page">
                <router-link v-if="route.path !== '/'" to="/" class="pt-back"><q-icon name="bi-arrow-left" size="12px" /> Back to home</router-link>
                <div class="pt-pagehead" v-if="title">
                    <span class="pt-pagehead-ico"><q-icon :name="icon" /></span>
                    <div>
                        <div class="pt-title">{{ title }}</div>
                        <div class="pt-sub" v-if="subtitle">{{ subtitle }}</div>
                    </div>
                </div>
                <slot />
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
    icon: { type: String, default: 'bi-person-circle' },
    // the sign-in layout: the left panel's words, and which of its steps this page is
    auth: { type: Boolean, default: false },
    headline: { type: String, default: '' },
    lead: { type: String, default: '' },
    steps: { type: Array, default: () => [] },
    active: { type: Number, default: 0 },
});
</script>
