<template>
    <AuthShell
        title="Verify Feedback"
        subtitle="Enter the one-time pin (OTP) emailed to you after filing."
        auth
        icon="bi-patch-check"
        headline="Verify your feedback"
        lead="Confirm it is really you, and get your reference number."
        :steps="SIDE_STEPS"
    >
        <div v-if="!referenceNo" class="lgn-stack">
            <!-- The verification code is the only thing needed — it is unique per complaint, so there is no
                 reference number to type here. Enter the 6 digits from the email; the reference number
                 comes back once it is confirmed. -->
            <div class="lgn-otp">
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
            <div class="lgn-alert lgn-alert--bad" v-if="VerifyError"><q-icon name="bi-exclamation-circle" size="18px" /><div>{{ VerifyError }}</div></div>
            <q-btn unelevated rounded no-caps color="primary" label="Verify" class="lgn-btn full-width" :loading="VerifyLoading" @click="SubmitComplaintOTP()" />
        </div>

        <!-- Verified — hand over the reference number to link it to an account with. -->
        <div v-else class="lgn-done">
            <span class="lgn-done-ico"><q-icon name="bi-check-lg" /></span>
            <div class="lgn-done-t">Feedback verified</div>
            <div class="lgn-done-l">your reference no.</div>
            <div class="lgn-done-ref">{{ referenceNo }}</div>
            <div class="lgn-done-s">Save this &mdash; you will need it (with your code) to add the feedback to your account.</div>
            <q-btn unelevated rounded no-caps color="primary" label="Sign in to claim it" to="/login" class="lgn-btn full-width" />
        </div>

        <div class="lgn-note">
            <q-icon name="bi-envelope" size="18px" />
            <div>Didn't get a code? Check your spam folder, or <router-link to="/file-complaint" class="text-primary">file again</router-link> to request a new one.</div>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "You'll get a reference number",
        "text": "Once verified, your feedback is confirmed and given a reference number."
    },
    {
        "title": "It's routed automatically",
        "text": "Verifying is what triggers routing — the system reads what you wrote and assigns it to the right department."
    },
    {
        "title": "Follow it from an account",
        "text": "Sign in and use \"claim feedback\" with your reference number and access code to see every update."
    },
    {
        "title": "Optional: keep it in an account",
        "text": "Register with any email, then use \"claim feedback\" with this reference number and access code to add it to your account. (Not available for feedback filed anonymously.)"
    }
];
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
