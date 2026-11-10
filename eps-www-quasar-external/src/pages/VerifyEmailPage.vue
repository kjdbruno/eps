<template>
    <AuthShell
        title="Verify Email"
        :subtitle="`Enter the 6-digit code sent to ${email || 'your email'}`"
        auth
        icon="bi-envelope-check"
        headline="Confirm your email"
        lead="One quick step so your updates actually reach you."
        :steps="SIDE_STEPS"
    >
        <div class="lgn-stack">
            <div class="lgn-otp">
            <q-input
                v-for="(digit, index) in emailOtp.code.value"
                :key="index"
                :ref="el => { if (el) emailOtp.inputs.value[index] = el }"
                outlined
                maxlength="1"
                v-model="emailOtp.code.value[index]"
                input-class="otp-input"
                class="otp-box"
                @update:model-value="val => emailOtp.onInput(val, index)"
                @keydown.backspace="emailOtp.onBackspace(index)"
                @paste="emailOtp.onPaste"
            />
        </div>
            <div class="lgn-alert lgn-alert--bad" v-if="VerifyEmailError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ VerifyEmailError }}</div></div>

            <q-btn unelevated rounded no-caps color="primary" label="Verify" class="lgn-btn full-width" :loading="VerifyEmailLoading" @click="SubmitVerifyEmail()" />
            <q-btn flat rounded no-caps color="primary" label="Resend code" class="full-width" @click="ResendVerification()" />
        </div>

        <div class="lgn-note">
            <q-icon name="bi-envelope" size="18px" />
            <div>Didn't get a code? Check your spam folder, or use "resend code" — codes expire after a while so a fresh one may be needed.</div>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "Confirms your email",
        "text": "Keeps your account secure and makes sure status updates actually reach you."
    },
    {
        "title": "Unlocks your dashboard",
        "text": "Once verified, you're signed in and can see every feedback you've filed in one place."
    },
    {
        "title": "One-time only",
        "text": "You won't need to verify again — future sign-ins just use your email and password."
    }
];
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useOtpInput } from 'src/composables/useOtpInput';
import AuthShell from 'src/components/AuthShell.vue';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref(route.query.email || '');
const VerifyEmailLoading = ref(false);
const VerifyEmailError = ref('');
const emailOtp = useOtpInput();

const SubmitVerifyEmail = async () => {
    VerifyEmailError.value = '';
    if (!email.value) {
        VerifyEmailError.value = 'Email address is missing — please register or sign in again.';
        return;
    }
    if (!emailOtp.isComplete()) {
        VerifyEmailError.value = 'Please enter the full 6-digit code.';
        return;
    }
    VerifyEmailLoading.value = true;
    try {
        await authStore.verifyEmail(email.value, emailOtp.value());
        router.push('/home');
    } catch (e) {
        VerifyEmailError.value = e.response?.data?.message || 'Invalid or expired verification code.';
    } finally {
        VerifyEmailLoading.value = false;
    }
};

const ResendVerification = async () => {
    if (!email.value) {
        VerifyEmailError.value = 'Email address is missing — please register or sign in again.';
        return;
    }
    try {
        await authStore.resendVerification(email.value);
        $q.notify({ type: 'positive', message: 'A new verification code has been sent.' });
    } catch (e) {
        $q.notify({ type: 'negative', message: e.response?.data?.message || 'Unable to resend code.' });
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
