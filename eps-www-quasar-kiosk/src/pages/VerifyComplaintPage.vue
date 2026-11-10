<template>
    <div class="kx-center kx-center--narrow">
        <template v-if="!verified">
            <div class="kx-head">
                <span class="kx-head-ico"><q-icon name="bi-patch-check" /></span>
                <div>
                    <div class="kx-head-t">Verify your complaint</div>
                    <div class="kx-head-s">Enter the one-time pin (OTP) emailed to you after filing.</div>
                </div>
            </div>

            <div class="kx-card kx-form-card">
                <div class="kx-sec"><span>1</span>Your reference number</div>
                <q-input
                    v-model="referenceNoInput" outlined class="kx-field" placeholder="EPS2026..."
                    :error="!!error && !referenceNoInput.trim()" no-error-icon
                >
                    <template #prepend><q-icon name="bi-hash" /></template>
                </q-input>
                <div class="text-caption text-grey q-mt-xs q-ml-sm">Shown when you filed — also in the confirmation email.</div>
            </div>

            <div class="kx-card kx-form-card">
                <div class="kx-sec"><span>2</span>The 6-digit code</div>
                <div class="kx-otp">
                    <q-input
                        v-for="(digit, index) in otp.code.value"
                        :key="index"
                        :ref="el => { if (el) otp.inputs.value[index] = el }"
                        outlined
                        maxlength="1"
                        v-model="otp.code.value[index]"
                        input-class="kx-otp-input"
                        class="kx-otp-box"
                        @update:model-value="val => otp.onInput(val, index)"
                        @keydown.backspace="otp.onBackspace(index)"
                        @paste="otp.onPaste"
                    />
                </div>
                <div class="kx-note" v-if="error" style="background: #FCE8E6; border-color: #F3C4BE; color: #A52E22;">
                    <q-icon name="bi-exclamation-circle" size="20px" style="color: #A52E22;" />
                    <span>{{ error }}</span>
                </div>
            </div>

            <q-btn unelevated rounded no-caps color="primary" class="kx-btn full-width" icon-right="bi-check2" label="Verify" :loading="loading" @click="submit" />
            <div class="text-center q-mt-md q-mb-lg">
                <q-btn flat no-caps rounded color="primary" label="Didn't get a code? File again" to="/complaint" />
            </div>
        </template>

        <template v-else>
            <div class="kx-card kx-done">
                <div class="kx-done-ico"><q-icon name="bi-check-lg" /></div>
                <div class="kx-done-t">Complaint verified!</div>
                <div class="kx-done-s">Your complaint has been confirmed and routed automatically.</div>
                <div class="kx-ref"><small>your reference no.</small><b>{{ referenceNo }}</b></div>
                <div class="kx-done-s">Please write this down — you will need it to track your complaint.</div>
                <div class="kx-count">Returning to home in {{ countdown }}s&hellip;</div>
                <q-btn unelevated rounded no-caps color="primary" class="kx-btn full-width" icon="bi-house-fill" label="Done" to="/" />
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import { useOtpInput } from 'src/composables/useOtpInput';

const route = useRoute();
const router = useRouter();

const referenceNoInput = ref(typeof route.query.ref === 'string' ? route.query.ref : '');
const otp = useOtpInput();
const loading = ref(false);
const error = ref('');

const verified = ref(false);
const referenceNo = ref('');
const countdown = ref(15);
let countdownTimer = null;

const submit = async () => {
    error.value = '';
    if (!referenceNoInput.value.trim()) {
        error.value = 'Please enter your reference number.';
        return;
    }
    if (!otp.isComplete()) {
        error.value = 'Please enter the full 6-digit OTP.';
        return;
    }
    loading.value = true;
    try {
        const response = await api.post('/complaint/otp/validate', {
            referenceNo: referenceNoInput.value.trim(),
            otp: otp.value(),
        });
        referenceNo.value = response.data.complaint.referenceNo;
        verified.value = true;
        countdownTimer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
                clearInterval(countdownTimer);
                router.push('/');
            }
        }, 1000);
    } catch (e) {
        error.value = e.response?.data?.message || 'Invalid reference number or OTP.';
    } finally {
        loading.value = false;
    }
};

onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer);
});
</script>
