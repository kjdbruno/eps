<template>
    <AuthShell
        title="Choose your password"
        subtitle="One more step before you continue."
        auth
        icon="bi-key"
        headline="Make this account yours"
        lead="Your account started with a temporary password from your email. Choose one that only you know."
        :steps="SIDE_STEPS"
    >
        <form class="lgn-stack" @submit.prevent="Submit()">
            <div class="lgn-alert lgn-alert--bad" v-if="FormError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ FormError }}</div></div>

            <q-input v-model="currentPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Temporary password (from your email)" autocomplete="current-password" autofocus>
                <template #prepend><q-icon name="bi-lock" size="18px" /></template>
                <template #append><q-icon :name="showPassword ? 'bi-eye' : 'bi-eye-slash'" size="18px" class="cursor-pointer" @click="showPassword = !showPassword" /></template>
            </q-input>
            <q-input v-model="newPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="New password" autocomplete="new-password">
                <template #prepend><q-icon name="bi-lock-fill" size="18px" /></template>
            </q-input>
            <q-input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Confirm new password" autocomplete="new-password">
                <template #prepend><q-icon name="bi-lock-fill" size="18px" /></template>
            </q-input>
            <div class="lgn-hint">Use at least 8 characters.</div>
            <q-btn type="submit" unelevated rounded no-caps color="primary" label="Save my password" class="lgn-btn full-width" :loading="Loading" />
        </form>

        <div class="lgn-help">
            Not now?
            <a class="lgn-link lgn-link--b cursor-pointer" @click="LogOut()">Log out</a>
        </div>
    </AuthShell>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import AuthShell from 'src/components/AuthShell.vue';

// Where an account that still has the temporary password it was emailed ends up after its first login (see
// User.mustChangePassword in the API: it refuses everything else until the password is changed).
const SIDE_STEPS = [
    { title: 'You signed in', text: 'With the temporary password from your email.' },
    { title: 'Choose your own password', text: 'At least 8 characters, and different from the temporary one.' },
    { title: 'Carry on', text: 'Your feedback and everything in your account is waiting.' },
];

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const showPassword = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const Loading = ref(false);
const FormError = ref('');

const Submit = async () => {
    FormError.value = '';
    if (!currentPassword.value) { FormError.value = 'Enter the temporary password from your email.'; return; }
    if (newPassword.value.length < 8) { FormError.value = 'The new password must be at least 8 characters.'; return; }
    if (newPassword.value === currentPassword.value) { FormError.value = 'Choose a password different from the temporary one.'; return; }
    if (newPassword.value !== confirmPassword.value) { FormError.value = 'The two passwords do not match.'; return; }

    Loading.value = true;
    try {
        await api.post('/change-password', { currentPassword: currentPassword.value, newPassword: newPassword.value });
        authStore.user = { ...authStore.user, mustChangePassword: false };
        localStorage.setItem('user', JSON.stringify(authStore.user));
        $q.notify({ type: 'positive', message: 'Your password was changed.' });
        router.push('/home');
    } catch (e) {
        FormError.value = e.response?.data?.message || 'Unable to change the password. Please try again.';
    } finally {
        Loading.value = false;
    }
};

const LogOut = async () => {
    try { await api.post('/logout'); } catch (e) { /* the session is cleared here either way */ }
    authStore.clearAuthData();
    router.push('/login');
};
</script>
