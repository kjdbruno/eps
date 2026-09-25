<template>
    <AuthShell
        title="Verify Feedback"
        subtitle="Enter the one-time pin (OTP) emailed to you after filing."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl" v-if="!referenceNo">
                    <!-- The verification code is the only thing needed — it's unique per complaint,
                         so there's no reference number to type here. Enter the 6 digits from the
                         email; the reference number comes back once it's confirmed. -->
                    <div class="row justify-center q-gutter-sm q-mb-lg">
                        <q-input
                            v-for="(digit, index) in complaintOtp.code.value"
                            :key="index"
                            :ref="el => { if (el) complaintOtp.inputs.value[index] = el }"
                            outlined
                            maxlength="1"
                            v-model="complaintOtp.code.value[index]"
                            input-class="otp-input"
                            class="otp-box"
                            @update:model-value="val => complaintOtp.onInput(val, index)"
                            @keydown.backspace="complaintOtp.onBackspace(index)"
                            @paste="complaintOtp.onPaste"
                        />
                    </div>
                    <div class="text-negative text-caption text-center q-mb-md" v-if="VerifyError">{{ VerifyError }}</div>

                    <q-btn class="full-width" unelevated color="primary" size="lg" label="submit" @click="SubmitComplaintOTP()"/>

                    <q-inner-loading :showing="VerifyLoading">
                        <q-spinner-ios color="primary" size="md"/>
                        <div class="text-caption text-uppercase text-grey">we're working on it</div>
                    </q-inner-loading>
                </q-card>
                <!-- Verified — hand over the reference number to track it with. -->
                <q-card class="no-shadow custom-border radius-md q-pa-xl text-center" v-else>
                    <q-icon name="bi-check-circle" color="positive" size="2.5em" class="q-mb-md" />
                    <div class="text-subtitle1 text-weight-bold q-mb-sm">Feedback verified</div>
                    <div class="text-caption text-uppercase text-grey">reference no.</div>
                    <div class="text-h6 text-weight-bold q-mb-sm">{{ referenceNo }}</div>
                    <div class="text-caption text-grey q-mb-lg">
                        Save this — you'll need it (with your code) to track the feedback or link it to an account.
                    </div>
                    <router-link class="text-primary text-caption" to="/track">track this feedback &rarr;</router-link>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">what happens next</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">You'll get a reference number</q-item-label>
                                <q-item-label caption>Once verified, your feedback is confirmed and given a reference number to track it by.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">It's routed automatically</q-item-label>
                                <q-item-label caption>Verifying is what triggers routing — the system reads what you wrote and assigns it to the right department.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Track it anytime</q-item-label>
                                <q-item-label caption>Use your reference number and access code on the Track page to check its status.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">4</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Optional: keep it in an account</q-item-label>
                                <q-item-label caption>
                                    <router-link to="/register" class="text-primary">Register</router-link>
                                    with any email, then use <b>claim feedback</b> with this reference number and access code
                                    to add it to your account. (Not available for feedback filed anonymously.)
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-envelope" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Didn't get a code? Check your spam folder, or
                            <router-link to="/file-complaint" class="text-primary">file again</router-link>
                            to request a new one.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import { ref } from 'vue';
import { api } from 'src/boot/axios';
import { useOtpInput } from 'src/composables/useOtpInput';
import AuthShell from 'src/components/AuthShell.vue';

const VerifyLoading = ref(false);
const VerifyError = ref('');
const referenceNo = ref('');
const complaintOtp = useOtpInput();

const SubmitComplaintOTP = async () => {
    VerifyError.value = '';
    if (!complaintOtp.isComplete()) {
        VerifyError.value = 'Please enter the full 6-digit code.';
        return;
    }
    VerifyLoading.value = true;
    try {
        const response = await api.post('/complaint/otp/validate', { otp: complaintOtp.value() });
        referenceNo.value = response.data.complaint.referenceNo;
    } catch (e) {
        VerifyError.value = e.response?.data?.message || 'That code is invalid or has already been used.';
    } finally {
        VerifyLoading.value = false;
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
