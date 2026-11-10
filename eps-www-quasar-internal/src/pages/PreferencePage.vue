<template>
    <div>
        <!-- Pinned to the top while the list under it scrolls (same header as the revapp Preference
             pages): eyebrow + title. Switching section is done from the drawer's Preference group. -->
        <div class="sticky-header q-pb-md">
            <div class="rc-header pref-header" style="margin-bottom: 0;">
                <div>
                    <div class="rc-eyebrow">preference &middot; {{ section?.label || 'none' }}</div>
                    <div class="text-h5 text-capitalize">{{ section?.label || 'preference' }} preference</div>
                </div>
            </div>
        </div>

        <component v-if="section" :is="section.component" :key="section.name" />
        <div v-else class="rc-empty">
            <q-icon name="bi-sliders" size="26px" />
            <div class="rc-empty-title">No preference pages available for your role</div>
        </div>
    </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import UserPreferenceComponent from '../components/UserPreferenceComponent.vue';
import OfficePreferenceComponent from '../components/OfficePreferenceComponent.vue';
import HolidayPreferenceComponent from '../components/HolidayPreferenceComponent.vue';
import CannedPreferenceComponent from '../components/CannedPreferenceComponent.vue';
import ClientPreferenceComponent from '../components/ClientPreferenceComponent.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// One entry per section, in the order the drawer lists them. Office/User are super-only; Holiday
// stays super/admin — matches OfficeRoutes.js/UserRoutes.js/HolidayRoutes.js server-side and the
// route guards in router/routes.js.
const SECTIONS = [
    { name: 'office preference', label: 'office', to: '/preference/office', component: OfficePreferenceComponent, roles: ['super', 'admin'] },
    { name: 'user preference', label: 'user', to: '/preference/user', component: UserPreferenceComponent, roles: ['super'] },
    { name: 'holiday preference', label: 'holiday', to: '/preference/holiday', component: HolidayPreferenceComponent, roles: ['super', 'admin'] },
    { name: 'canned preference', label: 'canned messages', to: '/preference/canned', component: CannedPreferenceComponent, roles: ['super', 'admin'] },
    { name: 'client preference', label: 'client accounts', to: '/preference/clients', component: ClientPreferenceComponent, roles: ['super', 'admin'] },
];
const allowed = computed(() => SECTIONS.filter(s => s.roles.includes(authStore.user?.role)));

// The section for the current route; on the bare /preference there is none yet, so send the person
// to the first one their role can open.
const section = computed(() => SECTIONS.find(s => s.name === route.name) || null);
watch(() => route.name, (name) => {
    if (name === 'preference' && allowed.value.length) router.replace(allowed.value[0].to);
}, { immediate: true });
</script>

<style scoped>
/* the list rail is fixed to the right edge on wide screens, so the header stops short of it */
@media (min-width: 1201px) {
    .pref-header {
        padding-right: 396px;
    }
}
</style>
