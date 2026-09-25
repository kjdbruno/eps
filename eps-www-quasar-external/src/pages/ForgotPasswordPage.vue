<template>
    <AuthShell
        title="Forgot Password"
        :subtitle="stepSubtitle"
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl">
                    <!-- Step 1: request a code. Always the same generic outcome regardless of
                         whether the email is actually registered (see CitizenController.
                         forgotPassword) — this page moves to step 2 either way, so there's nothing
                         for a citizen to learn here about which emails have accounts. -->
                    <template v-if="step === 'email'">
                        <div class="q-mb-md">
                            <div class="text-caption text-uppercase q-mb-xs" :class="RequestError ? 'text-negative' : 'text-grey'">email</div>
                            <q-input outlined label="Enter Email" v-model="email" :error="!!RequestError" no-error-icon @keyup.enter="SubmitRequest()" />
                        </div>
                        <div class="text-negative text-caption q-mb-md" v-if="RequestError">{{ RequestError }}</div>
                        <q-btn class="full-width" unelevated color="primary" size="lg" label="send reset code" @click="SubmitRequest()"/>
                        <q-inner-loading :showing="RequestLoading">
                            <q-spinner-ios color="primary" size="md"/>
                            <div class="text-caption text-uppercase text-grey">we're working on it</div>
                        </q-inner-loading>
                    </template>

                    <!-- Step 2: just the code — verified on its own (see CitizenController.
                         verifyResetCode) before asking for a new password, so a wrong/expired code
                         is caught immediately instead of only at the very last step. -->
                    <template v-else-if="step === 'code'">
                        <div class="row justify-center q-gutter-sm q-mb-lg">
                            <q-input
                                v-for="(digit, index) in resetOtp.code.value"
                                :key="index"
                                :ref="el => { if (el) resetOtp.inputs.value[index] = el }"
                                outlined
                                maxlength="1"
                                v-model="resetOtp.code.value[index]"
                                input-class="otp-input"
                                class="otp-box"
                                @update:model-value="val => resetOtp.onInput(val, index)"
                                @keydown.backspace="resetOtp.onBackspace(index)"
                                @paste="resetOtp.onPaste"
                            />
                        </div>
                        <div class="text-negative text-caption text-center q-mb-md" v-if="CodeError">{{ CodeError }}</div>

                        <q-btn class="full-width q-mb-sm" unelevated color="primary" size="lg" label="verify code" @click="SubmitCode()"/>
                        <q-btn class="full-width" flat color="primary" label="send another code" @click="SubmitRequest(true)"/>
                        <q-inner-loading :showing="CodeLoading">
                            <q-spinner-ios color="primary" size="md"/>
                            <div class="text-caption text-uppercase text-grey">we're working on it</div>
                        </q-inner-loading>
                    </template>

                    <!-- Step 3: the code is already confirmed valid — just the new password now. -->
                    <template v-else>
                        <div class="q-mb-md">
                            <div class="text-caption text-uppercase q-mb-xs text-grey">new password</div>
                            <q-input
                                outlined label="Enter New Password" v-model="newPassword"
                                :type="showPassword ? 'text' : 'password'"
                            >
                                <template v-slot:append>
                                    <q-icon :name="showPassword ? 'bi-eye-slash' : 'bi-eye'" class="cursor-pointer" size="xs" @click="showPassword = !showPassword" />
                                </template>
                            </q-input>
                        </div>
                        <div class="q-mb-md">
                            <div class="text-caption text-uppercase q-mb-xs text-grey">confirm new password</div>
                            <q-input
                                outlined label="Confirm New Password" v-model="confirmPassword"
                                :type="showPassword ? 'text' : 'password'"
                                @keyup.enter="SubmitReset()"
                            />
                        </div>
                        <div class="text-negative text-caption text-center q-mb-md" v-if="ResetError">{{ ResetError }}</div>

                        <q-btn class="full-width" unelevated color="primary" size="lg" label="reset password" @click="SubmitReset()"/>

                        <q-inner-loading :showing="ResetLoading">
                            <q-spinner-ios color="primary" size="md"/>
                            <div class="text-caption text-uppercase text-grey">we're working on it</div>
                        </q-inner-loading>
                    </template>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">how this works</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">We email you a code</q-item-label>
                                <q-item-label caption>If that email has an account, a 6-digit reset code is sent to it.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Choose a new password</q-item-label>
                                <q-item-label caption>The code is valid for 15 minutes and can only be used once.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Sign in with it</q-item-label>
                                <q-item-label caption>You'll be signed out everywhere else, and can log back in with your new password.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-envelope" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Didn't get a code? Check your spam folder, or make sure you typed the email
                            you registered with.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useOtpInput } from 'src/composables/useOtpInput';
import AuthShell from 'src/components/AuthShell.vue';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const step = ref('email'); // 'email' | 'code' | 'reset'
const stepSubtitle = computed(() => ({
    email: 'Enter your email and we\'ll send you a reset code.',
    code: `Enter the 6-digit code sent to ${email.value}`,
    reset: 'Choose a new password for your account.',
}[step.value]));

const email = ref('');
const showPassword = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const resetOtp = useOtpInput();

const RequestLoading = ref(false);
const RequestError = ref('');
const CodeLoading = ref(false);
const CodeError = ref('');
const ResetLoading = ref(false);
const ResetError = ref('');

// resend: true means we're already past step 1 (either 'code' or 'reset') and this is the "send
// another code" action — re-fires the request without moving the step backward, same idea as
// VerifyEmailPage's "resend code".
const SubmitRequest = async (resend = false) => {
    RequestError.value = '';
    if (!email.value.trim()) {
        RequestError.value = 'Please enter your email address.';
        return;
    }
    RequestLoading.value = true;
    try {
        await authStore.forgotPassword(email.value.trim());
        if (resend) {
            resetOtp.reset();
            $q.notify({ type: 'positive', message: 'If that email is registered, a new code has been sent.' });
        } else {
            step.value = 'code';
        }
    } catch (e) {
        // forgotPassword's own response is enumeration-safe and near-always a 200 — an error here
        // means something like a validation failure (malformed email) or the rate limiter, not
        // "this email doesn't exist".
        RequestError.value = e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || 'Unable to send a reset code right now.';
    } finally {
        RequestLoading.value = false;
    }
};

// Verifies the code on its own (CitizenController.verifyResetCode doesn't consume it) — once
// accepted, the same code value carries over to SubmitReset below rather than asking for it twice.
const SubmitCode = async () => {
    CodeError.value = '';
    if (!resetOtp.isComplete()) {
        CodeError.value = 'Please enter the full 6-digit code.';
        return;
    }
    CodeLoading.value = true;
    try {
        await authStore.verifyResetCode(email.value.trim(), resetOtp.value());
        step.value = 'reset';
    } catch (e) {
        CodeError.value = e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || 'Invalid or expired reset code.';
    } finally {
        CodeLoading.value = false;
    }
};

const SubmitReset = async () => {
    ResetError.value = '';
    if (newPassword.value.length < 8) {
        ResetError.value = 'Password must be at least 8 characters.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        ResetError.value = 'Passwords do not match.';
        return;
    }
    ResetLoading.value = true;
    try {
        await authStore.resetPassword(email.value.trim(), resetOtp.value(), newPassword.value);
        $q.notify({ type: 'positive', message: 'Password reset — please sign in with your new password.' });
        router.push('/login');
    } catch (e) {
        const message = e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || 'Invalid or expired reset code.';
        // The code was already accepted in step 2, but it can still have expired in the meantime
        // (15-minute TTL) — send them back a step rather than stranding them on a password form
        // tied to a code that no longer works, and show the error there instead of here.
        if (e.response?.status === 400) {
            step.value = 'code';
            resetOtp.reset();
            CodeError.value = message;
        } else {
            ResetError.value = message;
        }
    } finally {
        ResetLoading.value = false;
    }
};
</script>

<style lang="css">
.otp-input {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
}
</style>

<style scoped>
.otp-box {
    width: clamp(38px, 12vw, 56px);
}
</style>
