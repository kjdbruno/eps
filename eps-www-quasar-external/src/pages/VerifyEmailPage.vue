<template>
    <AuthShell
        title="Verify Email"
        :subtitle="`Enter the 6-digit code sent to ${email || 'your email'}`"
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card square class="no-shadow custom-border radius-md q-pa-xl">
                    <div class="row justify-center q-gutter-sm q-mb-lg">
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
                    <div class="text-negative text-caption text-center q-mb-md" v-if="VerifyEmailError">{{ VerifyEmailError }}</div>

                    <q-btn class="full-width q-mb-sm" unelevated color="primary" size="lg" label="verify" :loading="VerifyEmailLoading" @click="SubmitVerifyEmail()"/>
                    <q-btn class="full-width" flat color="primary" label="resend code" @click="ResendVerification()"/>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card square class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">why verify</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Confirms your email</q-item-label>
                                <q-item-label caption>Keeps your account secure and makes sure status updates actually reach you.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Unlocks your dashboard</q-item-label>
                                <q-item-label caption>Once verified, you're signed in and can see every feedback you've filed in one place.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">One-time only</q-item-label>
                                <q-item-label caption>You won't need to verify again — future sign-ins just use your email and password.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card square class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-envelope" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Didn't get a code? Check your spam folder, or use "resend code" — codes expire
                            after a while so a fresh one may be needed.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
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
