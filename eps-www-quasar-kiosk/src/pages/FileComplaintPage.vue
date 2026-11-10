<template>
    <div class="kx-center">
        <div class="kx-head">
            <span class="kx-head-ico"><q-icon name="bi-chat-quote" /></span>
            <div>
                <div class="kx-head-t">File a complaint</div>
                <div class="kx-head-s">No account needed — we'll email you a one-time code to verify it.</div>
            </div>
        </div>

        <!-- 1. who is reporting -->
        <div class="kx-card kx-form-card">
            <div class="kx-sec"><span>1</span>Who is reporting</div>

            <div class="kx-anon" :class="{ 'kx-anon--on': isAnonymous }" @click="isAnonymous = !isAnonymous">
                <span class="ico"><q-icon name="bi-incognito" /></span>
                <div>
                    <b>Report anonymously</b>
                    <small>Your name stays hidden. Your email and number are used only to send the one-time code.</small>
                    <small>I-check ang box kung ayaw magpakilala sa reklamo.</small>
                </div>
                <q-toggle :model-value="isAnonymous" size="lg" color="primary" @click.stop @update:model-value="isAnonymous = $event" />
            </div>

            <div class="kx-grid q-mt-md">
                <template v-if="!isAnonymous">
                    <div>
                        <div class="kx-label" :class="{ 'kx-label--err': errors.firstname.type }">First name <i>required</i></div>
                        <q-input v-model="firstname" outlined class="kx-field" placeholder="Juan" :error="errors.firstname.type" no-error-icon />
                        <div class="kx-err" v-if="errors.firstname.type">{{ errors.firstname.message }}</div>
                    </div>
                    <div>
                        <div class="kx-label" :class="{ 'kx-label--err': errors.lastname.type }">Last name <i>required</i></div>
                        <q-input v-model="lastname" outlined class="kx-field" placeholder="Dela Cruz" :error="errors.lastname.type" no-error-icon />
                        <div class="kx-err" v-if="errors.lastname.type">{{ errors.lastname.message }}</div>
                    </div>
                </template>
                <div>
                    <div class="kx-label" :class="{ 'kx-label--err': errors.email.type }">Email <i>required</i></div>
                    <q-input v-model="email" type="email" outlined class="kx-field" placeholder="you@example.com" :error="errors.email.type" no-error-icon />
                    <div class="kx-err" v-if="errors.email.type">{{ errors.email.message }}</div>
                </div>
                <div>
                    <div class="kx-label" :class="{ 'kx-label--err': errors.contactNo.type }">Contact no. <i>required</i></div>
                    <q-input v-model="contactNo" outlined class="kx-field" placeholder="09XXXXXXXXX" :error="errors.contactNo.type" no-error-icon />
                    <div class="kx-err" v-if="errors.contactNo.type">{{ errors.contactNo.message }}</div>
                </div>
            </div>
        </div>

        <!-- 2. what happened -->
        <div class="kx-card kx-form-card">
            <div class="kx-sec"><span>2</span>What happened</div>
            <div class="kx-label" :class="{ 'kx-label--err': errors.content.type }">Describe your complaint <i>required</i></div>
            <q-input
                v-model="content" type="textarea" rows="6" outlined class="kx-field"
                placeholder="Tell us what is wrong, where, and since when..."
                :error="errors.content.type" no-error-icon
            />
            <div class="kx-err" v-if="errors.content.type">{{ errors.content.message }}</div>
            <div class="kx-note q-mt-sm">
                <q-icon name="bi-signpost-split" size="20px" />
                <span>No category to pick — we read what you write and send it to the right department automatically.</span>
            </div>
        </div>

        <!-- 3. photos -->
        <div class="kx-card kx-form-card">
            <div class="kx-sec"><span>3</span>Photos <em>optional</em></div>
            <q-file
                v-model="files" outlined multiple use-chips counter max-files="5" accept="image/*"
                class="kx-field" placeholder="Attach up to 5 photos"
            >
                <template v-slot:prepend><q-icon name="bi-images" /></template>
            </q-file>
        </div>

        <q-expansion-item class="kx-card q-mb-md" expand-icon="bi-chevron-down" expanded-icon="bi-chevron-up" icon="bi-shield-check" label="Data privacy notice" header-class="text-weight-bold">
            <div class="q-px-md q-pb-md text-caption text-grey-7">
                Ang anumang impormasyon na aming makukuha ay gagamitin sa transaksyon na ito at sa pakikipag-ugnayan sa ePS,
                alinsunod sa Data Privacy Act. Ang pagpapatuloy ay nangangahulugan ng inyong pagsang-ayon.
            </div>
        </q-expansion-item>

        <div class="kx-actions q-mb-lg">
            <q-btn flat rounded no-caps color="primary" class="kx-btn" icon="bi-arrow-left" label="Back" to="/" />
            <q-btn unelevated rounded no-caps color="primary" class="kx-btn" icon-right="bi-send" label="Submit complaint" :loading="loading" @click="submit" />
        </div>
    </div>
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
