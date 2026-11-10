<template>
    <AuthShell
        title="Sign In"
        subtitle="Access your feedback and account details."
        auth
        icon="bi-person-circle"
        headline="Sign in to your account"
        lead="See every feedback you have filed and file new ones faster."
        :steps="SIDE_STEPS"
    >
        <form class="lgn-stack" @submit.prevent="SubmitLogin()">
            <div class="lgn-alert lgn-alert--bad" v-if="LoginError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ LoginError }}</div></div>

            <q-input v-model="loginEmail" type="email" outlined rounded dense hide-bottom-space no-error-icon placeholder="Email address" :error="!!LoginError" autocomplete="email" autofocus>
                <template #prepend><q-icon name="bi-envelope" size="18px" /></template>
            </q-input>
            <q-input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Password" :error="!!LoginError" autocomplete="current-password">
                <template #prepend><q-icon name="bi-lock" size="18px" /></template>
                <template #append><q-icon :name="showPassword ? 'bi-eye' : 'bi-eye-slash'" size="18px" class="cursor-pointer" @click="showPassword = !showPassword" /></template>
            </q-input>
            <div class="lgn-row-end">
                <router-link class="lgn-link" to="/forgot-password">Forgot password?</router-link>
            </div>

            <q-btn type="submit" unelevated rounded no-caps color="primary" label="Sign in" class="lgn-btn full-width" :loading="LoginLoading" />
        </form>

        <div class="lgn-help">
            New to the portal?
            <router-link class="lgn-link lgn-link--b" to="/register">Create an account</router-link>
        </div>

        <div class="lgn-note">
            <q-icon name="bi-person-plus" size="18px" />
            <div>New here? Creating an account takes less than a minute and doesn't require existing feedback to sign up.</div>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "All your feedback in one place",
        "text": "See every feedback you've filed and its status, without needing a reference number each time."
    },
    {
        "title": "File without the OTP step",
        "text": "Signed-in feedback skips the one-time email code and goes straight to processing."
    },
    {
        "title": "Your name, not \"Anonymous\"",
        "text": "Comments on discussions and survey responses show your real name instead of a guest label."
    }
];
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import AuthShell from 'src/components/AuthShell.vue';

const router = useRouter();
const authStore = useAuthStore();

const LoginLoading = ref(false);
const LoginError = ref('');
const loginEmail = ref('');
const loginPassword = ref('');
const showPassword = ref(false);

const SubmitLogin = async () => {
    LoginError.value = '';
    LoginLoading.value = true;
    try {
        await authStore.loginCitizen(loginEmail.value, loginPassword.value);
        router.push('/home');
    } catch (e) {
        if (e.response?.data?.notVerified) {
            router.push({ path: '/verify-email', query: { email: e.response.data.email || loginEmail.value } });
        } else {
            LoginError.value = e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || 'Invalid email or password.';
        }
    } finally {
        LoginLoading.value = false;
    }
};
</script>
