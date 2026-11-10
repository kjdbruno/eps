<template>
    <AuthShell
        title="Forgot Password"
        :subtitle="stepSubtitle"
        auth
        icon="bi-key"
        headline="Get back into your account"
        lead="Reset your password with a one-time code sent to your email."
        :steps="SIDE_STEPS"
    >
        <!-- where you are: email -> code -> new password -->
        <div class="lgn-dots">
            <span :class="{ on: true }" /><span :class="{ on: step !== 'email' }" /><span :class="{ on: step === 'reset' }" />
        </div>

        <!-- Step 1: request a code. Always the same generic outcome regardless of whether the email is
             actually registered (see CitizenController.forgotPassword) — this page moves to step 2
             either way, so there is nothing for a citizen to learn here about which emails have accounts. -->
        <form v-if="step === 'email'" class="lgn-stack" @submit.prevent="SubmitRequest()">
            <div class="lgn-alert lgn-alert--bad" v-if="RequestError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ RequestError }}</div></div>
            <q-input v-model="email" type="email" outlined rounded dense hide-bottom-space no-error-icon placeholder="Email address" :error="!!RequestError" autocomplete="email" autofocus>
                <template #prepend><q-icon name="bi-envelope" size="18px" /></template>
            </q-input>
            <q-btn type="submit" unelevated rounded no-caps color="primary" label="Send reset code" class="lgn-btn full-width" :loading="RequestLoading" />
        </form>

        <!-- Step 2: just the code — verified on its own (see CitizenController.verifyResetCode) before
             asking for a new password, so a wrong or expired code is caught immediately. -->
        <div v-else-if="step === 'code'" class="lgn-stack">
            <div class="lgn-otp">
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
            <div class="lgn-alert lgn-alert--bad" v-if="CodeError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ CodeError }}</div></div>
            <q-btn unelevated rounded no-caps color="primary" label="Verify code" class="lgn-btn full-width" :loading="CodeLoading" @click="SubmitCode()" />
            <q-btn flat rounded no-caps color="primary" label="Send another code" class="full-width" @click="SubmitRequest(true)" />
        </div>

        <!-- Step 3: the code is already confirmed valid — just the new password now. -->
        <form v-else class="lgn-stack" @submit.prevent="SubmitReset()">
            <div class="lgn-alert lgn-alert--bad" v-if="ResetError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ ResetError }}</div></div>
            <q-input v-model="newPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="New password" autocomplete="new-password" autofocus>
                <template #prepend><q-icon name="bi-lock" size="18px" /></template>
                <template #append><q-icon :name="showPassword ? 'bi-eye' : 'bi-eye-slash'" size="18px" class="cursor-pointer" @click="showPassword = !showPassword" /></template>
            </q-input>
            <q-input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Confirm new password" autocomplete="new-password">
                <template #prepend><q-icon name="bi-lock-fill" size="18px" /></template>
            </q-input>
            <div class="lgn-hint">Use at least 8 characters.</div>
            <q-btn type="submit" unelevated rounded no-caps color="primary" label="Reset password" class="lgn-btn full-width" :loading="ResetLoading" />
        </form>

        <div class="lgn-help">
            Remembered it?
            <router-link class="lgn-link lgn-link--b" to="/login">Back to sign in</router-link>
        </div>

        <div class="lgn-note">
            <q-icon name="bi-envelope" size="18px" />
            <div>Didn't get a code? Check your spam folder, or make sure you typed the email you registered with.</div>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "We email you a code",
        "text": "If that email has an account, a 6-digit reset code is sent to it."
    },
    {
        "title": "Choose a new password",
        "text": "The code is valid for 15 minutes and can only be used once."
    },
    {
        "title": "Sign in with it",
        "text": "You'll be signed out everywhere else, and can log back in with your new password."
    }
];
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
