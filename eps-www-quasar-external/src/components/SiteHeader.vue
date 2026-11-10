<template>
    <q-header class="pt-header">
        <div class="pt-bar">
            <router-link :to="home" class="pt-brand">
                <img src="../assets/epslogo.png" alt="ePS" />
                <div>eParticipation system<small>citizen portal</small></div>
            </router-link>

            <!-- desktop / tablet nav -->
            <nav class="pt-nav gt-sm">
                <router-link class="pt-nav-link" :class="{ 'pt-nav-link--on': isOn('home') }" :to="home">Home</router-link>
                <router-link class="pt-nav-link" :class="{ 'pt-nav-link--on': isOn('feedback') }" :to="complaintTo">Feedback</router-link>
                <router-link class="pt-nav-link" :class="{ 'pt-nav-link--on': isOn('discussion') }" :to="base + '/discussion'">Discussion</router-link>
                <router-link class="pt-nav-link" :class="{ 'pt-nav-link--on': isOn('poll') }" :to="base + '/poll'">Survey</router-link>

                <template v-if="!authStore.isAuthenticated">
                    <q-btn rounded outline no-caps color="primary" label="Sign in" to="/login" class="q-ml-md" />
                    <q-btn rounded unelevated no-caps color="primary" label="Sign up" to="/register" class="q-ml-xs" />
                </template>
                <NotificationMenu v-if="authStore.isAuthenticated" />
                <button v-if="authStore.isAuthenticated" type="button" class="pt-acct" aria-label="Account menu">
                    <span class="pt-acct-av">{{ initials }}</span>
                    <span class="pt-acct-name">{{ authStore.user?.firstname || 'Account' }}</span>
                    <q-icon name="bi-chevron-down" size="12px" class="pt-acct-caret" />

                    <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" class="pt-acct-menu" transition-show="jump-down" transition-hide="jump-up">
                        <div class="pt-acct-card">
                            <span class="pt-acct-av pt-acct-av--lg">{{ initials }}</span>
                            <div class="pt-acct-who">
                                <div class="pt-acct-fn">{{ fullName || 'Account' }}</div>
                                <div v-if="authStore.user?.email" class="pt-acct-em">{{ authStore.user.email }}</div>
                            </div>
                        </div>
                        <div class="pt-acct-list">
                            <router-link v-close-popup class="pt-acct-item" to="/home/complaint">
                                <q-icon name="bi-file-earmark-text" size="18px" /> My feedback
                            </router-link>
                            <router-link v-close-popup class="pt-acct-item" to="/home/complaint?action=file">
                                <q-icon name="bi-plus-circle" size="18px" /> File feedback
                            </router-link>
                        </div>
                        <div class="pt-acct-list pt-acct-list--end">
                            <a v-close-popup href="#" class="pt-acct-item pt-acct-item--out" @click.prevent="authStore.logout()">
                                <q-icon name="bi-box-arrow-right" size="18px" /> Sign out
                            </a>
                        </div>
                    </q-menu>
                </button>
            </nav>

            <!-- mobile burger -->
            <NotificationMenu v-if="authStore.isAuthenticated" class="lt-md q-ml-auto" />
            <q-btn flat round dense icon="bi-list" size="lg" class="lt-md" :class="{ 'q-ml-auto': !authStore.isAuthenticated }" @click="mobileMenu = !mobileMenu" />
        </div>
    </q-header>

    <!-- Mobile nav — a real slide-out drawer (off-canvas, overlays the page with a backdrop). -->
    <q-drawer v-model="mobileMenu" side="right" overlay bordered class="lt-md" :width="270">
        <q-list padding>
            <q-item clickable v-ripple v-close-popup :to="home">
                <q-item-section avatar><q-icon name="bi-house" /></q-item-section>
                <q-item-section>Home</q-item-section>
            </q-item>
            <q-item clickable v-ripple v-close-popup :to="complaintTo">
                <q-item-section avatar><q-icon name="bi-file-earmark-text" /></q-item-section>
                <q-item-section>Feedback</q-item-section>
            </q-item>
            <q-item clickable v-ripple v-close-popup :to="base + '/discussion'">
                <q-item-section avatar><q-icon name="bi-people" /></q-item-section>
                <q-item-section>Discussion</q-item-section>
            </q-item>
            <q-item clickable v-ripple v-close-popup :to="base + '/poll'">
                <q-item-section avatar><q-icon name="bi-bar-chart-line" /></q-item-section>
                <q-item-section>Survey</q-item-section>
            </q-item>

            <q-separator spaced />

            <template v-if="!authStore.isAuthenticated">
                <q-item clickable v-ripple v-close-popup to="/login">
                    <q-item-section avatar><q-icon name="bi-box-arrow-in-right" /></q-item-section>
                    <q-item-section>Sign in</q-item-section>
                </q-item>
                <q-item clickable v-ripple v-close-popup to="/register">
                    <q-item-section avatar><q-icon name="bi-person-plus" /></q-item-section>
                    <q-item-section>Sign up</q-item-section>
                </q-item>
            </template>
            <template v-else>
                <q-item-label header class="text-uppercase">{{ fullName }}</q-item-label>
                <q-item clickable v-ripple v-close-popup @click="authStore.logout()">
                    <q-item-section avatar><q-icon name="bi-box-arrow-right" /></q-item-section>
                    <q-item-section>Sign out</q-item-section>
                </q-item>
            </template>
        </q-list>
    </q-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import NotificationMenu from 'src/components/NotificationMenu.vue';

const route = useRoute();
const authStore = useAuthStore();
const mobileMenu = ref(false);

// Signed in, the same pages live under /home; a guest uses the open ones at the top level.
const base = computed(() => (authStore.isAuthenticated ? '/home' : ''));
const home = computed(() => (authStore.isAuthenticated ? '/home' : '/'));

// "My Complaints" only exists behind login (/home/complaint) — a guest doesn't have a complaint
// list to view yet, so this points them at where a complaint actually starts instead.
const complaintTo = computed(() => (authStore.isAuthenticated ? '/home/complaint' : '/file-complaint'));

const fullName = computed(() => [authStore.user?.firstname, authStore.user?.lastname].filter(Boolean).join(' '));
const initials = computed(() => (fullName.value || authStore.user?.firstname || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase());

// which top-level link the current page belongs to
const isOn = (key) => {
    const p = route.path;
    if (key === 'home') return p === '/' || p === '/home';
    if (key === 'feedback') return p.startsWith('/home/complaint') || p.startsWith('/file-complaint') || p.startsWith('/verify-complaint');
    if (key === 'discussion') return p.includes('/discussion');
    if (key === 'poll') return p.includes('/poll');
    return false;
};
</script>
