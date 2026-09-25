<template>
    <div>
        <!-- Same pill-button tab pattern as the Complaint detail modal's response/history switch. -->
        <q-card-section class="q-pa-md radius-sm bg-accent q-mb-md">
            <div class="q-gutter-xs">
                <q-btn
                    v-for="t in tabs" :key="t.component"
                    unelevated no-caps rounded size="sm"
                    :class="PreferenceStore.component === t.component ? 'bg-primary text-white' : 'bg-accent'"
                    :label="t.label"
                    @click="PreferenceStore.component = t.component"
                />
            </div>
        </q-card-section>
        <div class="q-mt-md">
            <component v-if="PreferenceStore.component" :is="components[PreferenceStore.component]" :key="PreferenceStore.component" />
            <div v-else class="text-center text-grey q-pa-xl">
                <q-icon name="bi-sliders" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no preference pages available for your role</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePreferenceStore } from '../stores/preference-store';
import { useAuthStore } from 'src/stores/auth-store';
import UserPreferenceComponent from '../components/UserPreferenceComponent.vue';
import OfficePreferenceComponent from '../components/OfficePreferenceComponent.vue';
import HolidayPreferenceComponent from '../components/HolidayPreferenceComponent.vue';

const PreferenceStore = usePreferenceStore();
const authStore = useAuthStore();

// User/Office are super-only; Holiday stays super/admin — matches UserRoutes.js/OfficeRoutes.js/
// HolidayRoutes.js server-side. The nav link itself is already hidden for anyone who'd see zero
// tabs here (MainLayout.vue), but this still guards direct navigation to /preference.
const ALL_TABS = [
    { component: 'UserPreferenceComponent', label: 'user', roles: ['super'] },
    { component: 'OfficePreferenceComponent', label: 'office', roles: ['super'] },
    { component: 'HolidayPreferenceComponent', label: 'holiday', roles: ['super', 'admin'] },
];
const tabs = computed(() => ALL_TABS.filter(t => t.roles.includes(authStore.user?.role)));

// Land on the first tab this role can actually see, not always "user" — an admin opening this
// page directly would otherwise start on a tab (user) they don't have.
if (!tabs.value.some(t => t.component === PreferenceStore.component)) {
    PreferenceStore.component = tabs.value[0]?.component || null;
}

const components = {
    UserPreferenceComponent,
    OfficePreferenceComponent,
    HolidayPreferenceComponent,
};
</script>

<style scoped>

</style>