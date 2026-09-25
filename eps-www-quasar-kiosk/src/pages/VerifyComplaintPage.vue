<template>
    <q-page class="kv-page">
        <div class="kv-shell">
            <template v-if="!verified">
                <div class="text-center q-mb-lg">
                    <div class="kx-eyebrow">complaint module</div>
                    <div class="text-h4 text-weight-bold">Verify Your Complaint</div>
                    <div class="text-body1 text-grey">Enter the one-time pin (OTP) emailed to you after filing.</div>
                </div>

                <q-card flat class="kv-card radius-md custom-border q-pa-xl">
                    <q-input
                        outlined v-model="referenceNoInput" label="Reference number" class="q-mb-lg"
                        hint="Shown when you filed — also in the confirmation email."
                        input-class="kc-input"
                    />

                    <div class="text-subtitle1 text-weight-bold text-center q-mb-md">One-time pin</div>
                    <div class="row justify-center q-gutter-sm q-mb-lg">
                        <q-input
                            v-for="(digit, index) in otp.code.value"
                            :key="index"
                            :ref="el => { if (el) otp.inputs.value[index] = el }"
                            outlined
                            maxlength="1"
                            v-model="otp.code.value[index]"
                            input-class="kv-otp-input"
                            class="kv-otp-box"
                            @update:model-value="val => otp.onInput(val, index)"
                            @keydown.backspace="otp.onBackspace(index)"
                            @paste="otp.onPaste"
                        />
                    </div>
                    <div class="text-negative text-caption text-center q-mb-md" v-if="error">{{ error }}</div>

                    <q-btn unelevated color="primary" size="lg" class="full-width" label="verify" :loading="loading" @click="submit" />

                    <div class="text-center q-mt-lg">
                        <q-btn flat no-caps color="primary" label="didn't get a code? file again" to="/complaint" />
                    </div>
                </q-card>
            </template>

            <template v-else>
                <q-card flat class="kv-card kv-success radius-md custom-border q-pa-xl text-center">
                    <q-icon name="bi-check-circle-fill" color="positive" size="72px" class="q-mb-md" />
                    <div class="text-h5 text-weight-bold q-mb-sm">Complaint Verified!</div>
                    <div class="text-body1 text-grey q-mb-lg">Your complaint has been confirmed and routed automatically.</div>
                    <div class="kv-refbox q-mb-lg">
                        <div class="text-caption text-uppercase text-grey">reference no.</div>
                        <div class="text-h5 text-weight-bold">{{ referenceNo }}</div>
                    </div>
                    <div class="text-caption text-grey q-mb-lg">Returning to home in {{ countdown }}s&hellip;</div>
                    <q-btn unelevated color="primary" size="lg" class="full-width" label="done" to="/" />
                </q-card>
            </template>
        </div>
    </q-page>
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

<style scoped>
.kv-page {
    padding: 32px;
    display: flex;
    justify-content: center;
}
.kv-shell {
    width: 100%;
    max-width: 560px;
}
.kx-eyebrow {
    font-size: 13px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 4px;
}
.kv-card {
    background: #FFFFFF;
}
.kv-otp-box {
    width: clamp(44px, 12vw, 64px);
}
.kv-otp-input {
    text-align: center;
    font-size: 26px;
    font-weight: 700;
}
.kv-refbox {
    background: #F6F9FC;
    border-radius: 12px;
    padding: 16px;
}
</style>
