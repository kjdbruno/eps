<template>
    <q-page class="lg-page">
        <div class="lg-card">
            <!-- the left panel: who this is for, and what is inside -->
            <aside class="lg-side gt-xs">
                <div class="lg-side-in">
                    <div class="lg-brand">
                        <img :src="logo" alt="ePS" />
                        <div>eParticipation system<small>staff workspace</small></div>
                    </div>

                    <div>
                        <div class="lg-eyebrow">csflu &middot; city government</div>
                        <h2 class="lg-headline">Hear every voice, and answer it.</h2>
                        <p class="lg-lead">Review citizen feedback, respond for your office and follow what the city is saying — all in one place.</p>
                    </div>

                    <ul class="lg-points">
                        <li><span><q-icon name="bi-inbox" /></span><div><b>Feedback desk</b><small>Receive, respond and close what is assigned to you</small></div></li>
                        <li><span><q-icon name="bi-chat-dots" /></span><div><b>Discussions and polls</b><small>See what residents are saying in real time</small></div></li>
                        <li><span><q-icon name="bi-graph-up-arrow" /></span><div><b>Reports</b><small>Performance and satisfaction at a glance</small></div></li>
                    </ul>
                </div>
            </aside>

            <!-- the form -->
            <div class="lg-form">
                <form class="lg-form-in" @submit.prevent="login">
                    <img :src="logo" alt="ePS" class="lg-logo-sm lt-sm" />
                    <div class="lg-head">
                        <span class="lg-badge"><q-icon name="bi-shield-lock" size="22px" /></span>
                        <div>
                            <div class="lg-title">Sign in</div>
                            <div class="lg-sub">Use your staff account to open the workspace.</div>
                        </div>
                    </div>

                    <div class="lg-alert" v-if="errors.length">
                        <q-icon name="bi-exclamation-circle" size="18px" />
                        <div>
                            <div v-for="(dt, index) in errors" :key="index">{{ dt.msg }}</div>
                        </div>
                    </div>

                    <div>
                        <div class="lg-label" :class="{ 'lg-label--err': formErrors.username.type }">Username</div>
                        <q-input
                            v-model="username" outlined rounded dense hide-bottom-space no-error-icon
                            placeholder="Enter your username" :error="!!formErrors.username.type"
                            autocomplete="username" autofocus
                        >
                            <template #prepend><q-icon name="bi-person" size="18px" /></template>
                        </q-input>
                        <div class="lg-err" v-if="formErrors.username.type">{{ formErrors.username.msg }}</div>
                    </div>

                    <div>
                        <div class="lg-label" :class="{ 'lg-label--err': formErrors.password.type }">Password</div>
                        <q-input
                            v-model="password" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon
                            placeholder="Enter your password" :error="!!formErrors.password.type"
                            autocomplete="current-password"
                        >
                            <template #prepend><q-icon name="bi-lock" size="18px" /></template>
                            <template #append>
                                <q-icon :name="showPassword ? 'bi-eye' : 'bi-eye-slash'" size="18px" class="cursor-pointer" @click="showPassword = !showPassword" />
                            </template>
                        </q-input>
                        <div class="lg-err" v-if="formErrors.password.type">{{ formErrors.password.msg }}</div>
                    </div>

                    <q-checkbox v-model="rememberMe" label="Keep me signed in on this device" dense size="sm" class="lg-remember" unchecked-icon="bi-check-circle" checked-icon="bi-check-circle-fill" />

                    <q-btn type="submit" unelevated rounded no-caps color="primary" label="Sign in" icon-right="bi-arrow-right" class="lg-btn full-width" :loading="loading">
                        <template v-slot:loading><q-spinner-ios size="1em" /></template>
                    </q-btn>

                    <div class="lg-note">
                        <q-icon name="bi-info-circle" size="16px" />
                        <span>For authorised staff only. Actions taken in the workspace are recorded in the activity log.</span>
                    </div>
                </form>
            </div>
        </div>
    </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store';
import { api } from 'src/boot/axios';
import logo from 'src/assets/epslogo.png';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');

const showPassword = ref(false);
const rememberMe = ref(false);

const loading = ref(false);

const formErrors = reactive({
    username: { msg: null, type: null },
    password: { msg: null, type: null }
});

const errors = ref([]);

const userValidator = () => {
    let isError = false;
    if (username.value == '' || username.value == '') {
        formErrors.username.msg = 'Username is required!';
        formErrors.username.type = true;
        isError = true;
    } else {
        formErrors.username.msg = null;
        formErrors.username.type = null;
    }
    if (password.value == '' || password.value == null) {
        formErrors.password.msg = 'Password is required!'
        formErrors.password.type = true;
        isError = true;
    } else {
        formErrors.password.msg = null;
        formErrors.password.type = null;
    }
    return isError;
}

const login = async () => {
    const isError = userValidator();
    if (isError) return false;
    errors.value = [];
    loading.value = true;
    try {
        await authStore.login(username.value, password.value, rememberMe.value);
        router.push('/home');
    } catch (e) {
        console.error(e);
        // Three different shapes depending on what actually failed: {errors:[{msg}]} for a
        // rejected login (wrong credentials, disabled account — see AuthController.login),
        // {error} for an unexpected 500, {message} for the rate limiter (rateLimiter.js) —
        // normalized here into the array shape the banner below already renders.
        const data = e.response?.data;
        errors.value = Array.isArray(data?.errors) && data.errors.length
            ? data.errors
            : [{ msg: data?.message || data?.error || 'Unable to log in. Please try again.' }];
    } finally {
        // This was never reset on failure at all — the "login" button's spinner just spun
        // forever after a rejected login, on top of no error message ever showing (see above).
        loading.value = false;
    }
}
</script>

<style scoped>
/* exactly the height of the window, so the page itself never scrolls (only a very short window scrolls inside it) */
.lg-page { display: flex; align-items: center; justify-content: center; box-sizing: border-box; height: 100vh; min-height: 0 !important; overflow-x: hidden; overflow-y: auto; padding: 24px 16px; background: linear-gradient(160deg, #F4F7FC 0%, #E6EEFA 100%); }
.lg-card { width: 100%; max-width: 1000px; margin: auto 0; display: grid; grid-template-columns: 1fr; border-radius: 24px; overflow: hidden; background: #fff; border: 1px solid #E4EAF3; box-shadow: 0 24px 60px rgba(30, 42, 68, .14); }
@media (min-width: 600px) { .lg-card { grid-template-columns: 1.05fr 1fr; } }
@media (min-width: 600px) and (min-height: 760px) { .lg-card { min-height: 620px; } }

/* left panel */
.lg-side { position: relative; background: linear-gradient(160deg, #001B3F 0%, #00306B 45%, var(--q-primary) 100%); color: #fff; overflow: hidden; }
.lg-side::before { content: ''; position: absolute; right: -90px; top: -100px; width: 320px; height: 320px; border-radius: 50%; background: rgba(255, 255, 255, .06); }
.lg-side::after { content: ''; position: absolute; left: -70px; bottom: -110px; width: 260px; height: 260px; border-radius: 50%; background: rgba(253, 184, 19, .12); }
.lg-side-in { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; padding: 38px 36px; }
.lg-brand { display: flex; align-items: center; gap: 12px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; font-size: 15px; }
.lg-brand img { height: 40px; width: auto; padding: 5px 9px; border-radius: 12px; background: #fff; }
.lg-brand small { display: block; margin-top: 1px; font-size: 10px; font-weight: 500; letter-spacing: .14em; opacity: .7; }
.lg-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: var(--q-secondary); margin-bottom: 12px; }
.lg-headline { margin: 0 0 12px; font-size: 30px; line-height: 1.18; font-weight: 800; }
.lg-lead { margin: 0; max-width: 360px; font-size: 14px; line-height: 1.65; opacity: .88; }
.lg-points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.lg-points li { display: flex; align-items: center; gap: 14px; }
.lg-points li > span { flex: none; width: 38px; height: 38px; border-radius: 12px; background: rgba(255, 255, 255, .14); border: 1px solid rgba(255, 255, 255, .28); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.lg-points b { display: block; font-size: 14px; }
.lg-points small { display: block; margin-top: 1px; font-size: 12px; opacity: .78; }

/* the form */
.lg-form { display: flex; align-items: center; justify-content: center; padding: 34px 30px; }
.lg-form-in { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
.lg-logo-sm { height: 38px; width: auto; align-self: flex-start; margin-bottom: 4px; }
.lg-head { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
.lg-badge { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 14px; background: #E8EFFB; color: var(--q-primary); }
.lg-title { font-size: 26px; font-weight: 800; color: #1E2A44; line-height: 1.1; }
.lg-sub { margin-top: 3px; font-size: 12.5px; line-height: 1.4; color: #6B7A99; }
.lg-label { margin: 0 0 6px 6px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #6B7A99; }
.lg-label--err { color: var(--q-negative); }
.lg-err { margin: 4px 0 0 14px; font-size: 11.5px; color: var(--q-negative); }
.lg-remember { color: #4C5C79; font-size: 13px; }
.lg-btn { height: 46px; font-weight: 700; letter-spacing: .02em; margin-top: 2px; }
.lg-alert { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: #FCE8E6; border: 1px solid #F3C4BE; color: #A52E22; font-size: 12.5px; line-height: 1.45; }
.lg-alert > .q-icon { flex: none; margin-top: 1px; }
.lg-note { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: #F2F6FD; border: 1px solid #DCE5F3; color: #4C5C79; font-size: 12px; line-height: 1.5; }
.lg-note > .q-icon { flex: none; margin-top: 1px; color: var(--q-primary); }
.lg-form :deep(.q-field--dense .q-field__control) { height: 46px; }
.lg-form :deep(.q-field--outlined .q-field__control:before) { border-color: #DCE4F0; }
.lg-form :deep(.q-field__native::placeholder) { color: #8A96AD; opacity: 1; }
@media (max-width: 599px) { .lg-page { padding: 0; align-items: stretch; } .lg-card { border-radius: 0; border: 0; box-shadow: none; margin: 0; } .lg-form { padding: 24px 20px 32px; } }
</style>
