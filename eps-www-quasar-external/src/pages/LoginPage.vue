<template>
    <AuthShell
        title="Sign In"
        subtitle="Access your feedback and account details."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl">
                    <div class="q-mb-md">
                        <div class="text-caption text-uppercase q-mb-xs" :class="LoginError ? 'text-negative' : 'text-grey'">email</div>
                        <q-input outlined label="Enter Email" v-model="loginEmail" :error="!!LoginError" no-error-icon />
                    </div>
                    <div class="q-mb-md">
                        <div class="row items-center justify-between q-mb-xs">
                            <div class="text-caption text-uppercase" :class="LoginError ? 'text-negative' : 'text-grey'">{{ LoginError || 'password' }}</div>
                            <router-link class="text-caption text-primary" to="/forgot-password">forgot password?</router-link>
                        </div>
                        <q-input outlined label="Enter Password" v-model="loginPassword" type="password" :error="!!LoginError" no-error-icon @keyup.enter="SubmitLogin()" />
                    </div>

                    <q-btn class="full-width" unelevated color="primary" size="lg" label="sign in" @click="SubmitLogin()"/>

                    <div class="text-center q-mt-md">
                        <span class="text-caption text-grey">don't have an account? </span>
                        <router-link class="text-caption text-primary" to="/register">sign up</router-link>
                    </div>

                    <q-inner-loading :showing="LoginLoading">
                        <q-spinner-ios color="primary" size="md"/>
                        <div class="text-caption text-uppercase text-grey">we're working on it</div>
                    </q-inner-loading>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">why sign in</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">All your feedback in one place</q-item-label>
                                <q-item-label caption>See every feedback you've filed and its status, without needing a reference number each time.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">File without the OTP step</q-item-label>
                                <q-item-label caption>Signed-in feedback skips the one-time email code and goes straight to processing.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Your name, not "Anonymous"</q-item-label>
                                <q-item-label caption>Comments on discussions and poll votes show your real name instead of a guest label.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-person-plus" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            New here? Creating an account takes less than a minute and doesn't require
                            existing feedback to sign up.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
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
