<template>
    <q-page class="kc-page">
        <div class="kc-shell">
            <div class="text-center q-mb-lg">
                <div class="kx-eyebrow">complaint module</div>
                <div class="text-h4 text-weight-bold">File a Complaint</div>
                <div class="text-body1 text-grey">No account needed — we'll email you a one-time code to verify it.</div>
            </div>

            <q-card flat class="kc-card radius-md custom-border q-pa-xl">
                <q-checkbox
                    v-model="isAnonymous" size="lg"
                    label="Report Anonymously (I-check ang box kung ayaw magpakilala sa reklamo)"
                    class="q-mb-lg"
                />

                <div class="row q-col-gutter-md q-mb-md" v-if="!isAnonymous">
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="firstname" label="Firstname (required)" :error="errors.firstname.type" :error-message="errors.firstname.message" no-error-icon input-class="kc-input" />
                    </div>
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="lastname" label="Lastname (required)" :error="errors.lastname.type" :error-message="errors.lastname.message" no-error-icon input-class="kc-input" />
                    </div>
                </div>

                <div class="row q-col-gutter-md q-mb-md">
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="email" label="Email (required)" :error="errors.email.type" :error-message="errors.email.message" no-error-icon input-class="kc-input" />
                    </div>
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="contactNo" label="Contact no. (required)" :error="errors.contactNo.type" :error-message="errors.contactNo.message" no-error-icon input-class="kc-input" />
                    </div>
                </div>

                <q-separator class="q-my-lg" />

                <div class="text-subtitle1 text-weight-bold q-mb-sm">What happened?</div>
                <q-input
                    outlined type="textarea" rows="6" v-model="content" label="Describe your complaint"
                    :error="errors.content.type" :error-message="errors.content.message" no-error-icon
                    input-class="kc-input"
                />
                <div class="text-caption text-grey q-mt-xs">
                    <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                    We'll route this to the right department automatically based on what you describe here.
                </div>

                <q-file
                    outlined v-model="files" counter use-chips multiple max-files="5" accept="image/*"
                    label="Attach photos (optional, up to 5)" class="q-mt-lg"
                >
                    <template v-slot:prepend><q-icon name="bi-paperclip" /></template>
                </q-file>

                <div class="q-mt-lg text-caption text-grey">
                    <div class="text-uppercase text-weight-bold">data privacy notice</div>
                    Ang anumang impormasyon na aming makukuha ay gagamitin sa transaksyon na ito at sa pakikipag-ugnayan sa ePS,
                    alinsunod sa Data Privacy Act. Ang pagpapatuloy ay nangangahulugan ng inyong pagsang-ayon.
                </div>

                <q-btn
                    unelevated color="primary" size="lg" class="full-width q-mt-xl" label="submit complaint"
                    :loading="loading" @click="submit"
                />
            </q-card>
        </div>
    </q-page>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';

const router = useRouter();
const $q = useQuasar();

const isAnonymous = ref(false);
const firstname = ref('');
const lastname = ref('');
const email = ref('');
const contactNo = ref('');
const content = ref('');
const files = ref([]);
const loading = ref(false);

const errors = reactive({
    firstname: { type: null, message: '' },
    lastname: { type: null, message: '' },
    email: { type: null, message: '' },
    contactNo: { type: null, message: '' },
    content: { type: null, message: '' },
});

const validate = () => {
    Object.keys(errors).forEach((key) => { errors[key] = { type: null, message: '' }; });
    let ok = true;

    // Only required when not filing anonymously (matches the backend — ComplaintValidator.
    // validateForm now enforces this same rule server-side too, so this client-side check exists
    // to catch it early with a clear message rather than a generic "submission failed").
    if (!isAnonymous.value) {
        if (!firstname.value.trim()) {
            errors.firstname = { type: true, message: 'Firstname is required.' };
            ok = false;
        }
        if (!lastname.value.trim()) {
            errors.lastname = { type: true, message: 'Lastname is required.' };
            ok = false;
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value) {
        errors.email = { type: true, message: 'Email is required.' };
        ok = false;
    } else if (!emailRegex.test(email.value)) {
        errors.email = { type: true, message: 'Invalid email format.' };
        ok = false;
    }

    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!contactNo.value) {
        errors.contactNo = { type: true, message: 'Contact no. is required.' };
        ok = false;
    } else if (!phoneRegex.test(contactNo.value)) {
        errors.contactNo = { type: true, message: 'Invalid contact no. format.' };
        ok = false;
    }

    if (!content.value.trim()) {
        errors.content = { type: true, message: 'Please describe your complaint.' };
        ok = false;
    }

    return ok;
};

const submit = async () => {
    if (!validate()) return;
    loading.value = true;
    try {
        const form = new FormData();
        form.append('isAnonymous', isAnonymous.value);
        form.append('firstname', firstname.value);
        form.append('lastname', lastname.value);
        form.append('email', email.value);
        form.append('contactNo', contactNo.value);
        form.append('content', content.value);
        files.value.forEach((f) => form.append('files', f));

        const response = await api.post('/complaint/otp/send', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        $q.notify({ type: 'positive', message: 'We\'ve emailed you a one-time code — verify it to finish filing.' });
        // Verifying needs the reference number alongside the OTP (see ComplaintController.
        // validateOTP) — hand it over via the URL so the Verify page can pre-fill it.
        router.push({ name: 'verify-complaint', query: { ref: response.data.complaint.referenceNo } });
    } catch (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Unable to submit your complaint.' });
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.kc-page {
    padding: 32px;
    display: flex;
    justify-content: center;
}
.kc-shell {
    width: 100%;
    max-width: 720px;
}
.kx-eyebrow {
    font-size: 13px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 4px;
}
.kc-card {
    background: #FFFFFF;
}
</style>
