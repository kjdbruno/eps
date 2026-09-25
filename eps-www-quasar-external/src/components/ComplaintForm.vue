<template>
    <div>
        <div class="q-mb-md" v-if="mode === 'guest'">
            <q-checkbox v-model="isAnonymously" unchecked-icon="bi-check-circle" checked-icon="bi-check-circle-fill" label="Report Anonymously (I-check ang box kung ayaw magpakilala sa reklamo)" />
        </div>
        <!-- This block only ever renders when NOT anonymous (see the v-if) — the "optional"
             labels used to say that unconditionally, contradicting validate() below (and now the
             backend too, see ComplaintValidator.validateForm) which has always required both
             once anonymity is off. -->
        <div class="row q-col-gutter-xs q-mb-md" v-if="mode === 'guest' && !isAnonymously">
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase" :class="FormErrors.firstname.type ? 'text-negative' : 'text-grey'">firstname</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="firstname" label="Enter Firstname" :error="FormErrors.firstname.type" no-error-icon />
            </div>
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase" :class="FormErrors.lastname.type ? 'text-negative' : 'text-grey'">lastname</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="lastname" label="Enter Lastname" :error="FormErrors.lastname.type" no-error-icon />
            </div>
        </div>
        <div class="row q-col-gutter-xs" v-if="mode === 'guest'">
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">email</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="email" label="Enter Email" :error="FormErrors.email.type" no-error-icon />
            </div>
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">contact no.</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="contactNo" label="Enter Contact No." :error="FormErrors.contactNo.type" no-error-icon />
            </div>
        </div>
        <q-separator class="q-my-lg" v-if="mode === 'guest'"/>
        <div class="q-mb-md">
            <div class="row q-mb-xs">
                <span class="text-caption text-uppercase text-grey">summary of feedback</span>
                <q-space />
                <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
            </div>
            <q-input outlined v-model="complaint" label="Enter Feedback" type="textarea" :error="FormErrors.complaint.type" no-error-icon />
            <div class="text-caption text-grey q-mt-xs">
                <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                We'll route this to the right department automatically based on what you describe here.
            </div>
        </div>
        <div class="q-mb-md">
            <div class="row q-mb-xs">
                <span class="text-caption text-uppercase" :class="FormErrors.location.type ? 'text-negative' : 'text-grey'">location</span>
                <q-space />
                <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
            </div>
            <!-- Grabbed automatically as soon as this form loads (see captureLocation/onMounted) —
                 no button to tap first. Only a denied/failed permission needs a manual retry. -->
            <div class="row items-center q-gutter-sm" v-if="locationStatus === 'loading'">
                <q-spinner-ios size="1.2em" color="primary" />
                <span class="text-caption text-grey">Getting your location&hellip;</span>
            </div>
            <div class="row items-center q-gutter-sm text-positive" v-else-if="locationStatus === 'granted'">
                <q-icon name="bi-geo-alt-fill" size="1.1em" />
                <span class="text-caption">Location captured.</span>
            </div>
            <div class="row items-center q-gutter-sm text-negative" v-else>
                <q-icon name="bi-exclamation-triangle-fill" size="1.1em" />
                <span class="text-caption">Location access is required to file feedback. Please allow it and try again.</span>
                <q-btn flat dense no-caps size="sm" color="primary" label="try again" @click="captureLocation" />
            </div>
        </div>
        <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">evidence</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">optional</span>
                </div>
                <q-file outlined v-model="file" counter use-chips :counter-label="counterLabelFn" max-files="5" accept="image/*" multiple label="Upload Evidence (up to 5 photos)">
                    <template v-slot:prepend>
                        <q-icon name="attach_file" />
                    </template>
                </q-file>
            </div>
        </div>
        <div class="q-mt-lg" v-if="mode === 'guest'">
            <div class="text-caption text-uppercase">disclaimer</div>
            <div class="text-caption text-grey">Para sa gustong maging anonymous sa kanilang reklamo, ang inyong email at contact number ay gagamitin lamang sa pagpapadala ng One Time Pin (OTP) upang kayo ay makatanggap ng Reference Number mula sa ePS, kapag ang inyong reklamo ay naangkop. Aming tinitiyak na ang inyong personal na impormasyon o pagkakakilanlan ay ligtas at kompindensyal.</div>
            <div class="text-caption text-uppercase q-mt-sm">data privacy notice</div>
            <div class="text-caption text-grey">Ang anumang impormasyon na aming makukuha ay gagamitin sa transaksyon na ito at sa pakikipag-ugnayan sa ePS at sa mga susunod pang mga hakbang tungkol sa inyong reklamo, alinsunod sa Data Privacy Act at sa aming Data Privacy Policy. Ang pagpapatuloy ay nangangahulugan ng inyong pagsang-ayon.</div>
        </div>

        <!-- Modal contexts (ComplaintPage.vue's "file a complaint" dialog) hide this and put
             their own submit button in a pinned footer instead, calling submit() via a template
             ref — see hideSubmit below. FileComplaintPage.vue (a full page, not a modal) keeps
             this default, in-flow button as-is. -->
        <q-btn v-if="!hideSubmit" class="full-width q-mt-lg" unelevated color="primary" size="lg" label="submit feedback" @click="submit"/>

        <q-inner-loading :showing="loading">
            <q-spinner-ios color="primary" size="md"/>
            <div class="text-caption text-uppercase text-grey">we're working on it</div>
        </q-inner-loading>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from 'src/boot/axios';

const props = defineProps({
    mode: { type: String, default: 'guest' }, // 'guest' | 'account'
    hideSubmit: { type: Boolean, default: false },
});

const emit = defineEmits(['submitted']);

const isAnonymously = ref(false);
const firstname = ref('');
const lastname = ref('');
const email = ref('');
const contactNo = ref('');
const complaint = ref('');
const file = ref([]);
const loading = ref(false);

const FormErrors = reactive({
    firstname: { type: null, msg: '' },
    lastname: { type: null, msg: '' },
    email: { type: null, msg: '' },
    contactNo: { type: null, msg: '' },
    complaint: { type: null, msg: '' },
    location: { type: null, msg: '' },
});

/* -------------------- location (mandatory) -------------------- */
// Grabbed the moment this form mounts — no "use my location" button to tap first. The backend
// requires both latitude/longitude on every citizen-filed complaint (guest OTP and signed-in
// account alike — see ComplaintValidator.validateForm / ComplaintController.createAccountComplaint),
// so a denied/failed/unsupported browser permission blocks submit until they retry and allow it.
const latitude = ref(null);
const longitude = ref(null);
const locationStatus = ref('loading'); // 'loading' | 'granted' | 'denied'

const getPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    });
});

const captureLocation = async () => {
    locationStatus.value = 'loading';
    try {
        const position = await getPosition();
        latitude.value = position.coords.latitude;
        longitude.value = position.coords.longitude;
        locationStatus.value = 'granted';
    } catch (error) {
        console.error('Error getting location:', error);
        latitude.value = null;
        longitude.value = null;
        locationStatus.value = 'denied';
    }
};

onMounted(() => { captureLocation(); });

const validate = () => {
    let isError = false;

    Object.keys(FormErrors).forEach(key => { FormErrors[key] = { type: null, msg: '' }; });

    if (props.mode === 'guest' && !isAnonymously.value) {
        if (!firstname.value) {
            FormErrors.firstname = { type: true, msg: 'firstname is required!' };
            isError = true;
        }
        if (!lastname.value) {
            FormErrors.lastname = { type: true, msg: 'lastname is required!' };
            isError = true;
        }
    }

    if (props.mode === 'guest') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value) {
            FormErrors.email = { type: true, msg: 'email is required!' };
            isError = true;
        } else if (!emailRegex.test(email.value)) {
            FormErrors.email = { type: true, msg: 'Invalid email format!' };
            isError = true;
        }

        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!contactNo.value) {
            FormErrors.contactNo = { type: true, msg: 'Contact no. is required!' };
            isError = true;
        } else if (!phoneRegex.test(contactNo.value)) {
            FormErrors.contactNo = { type: true, msg: 'Invalid contact no. format!' };
            isError = true;
        }
    }

    if (!complaint.value) {
        FormErrors.complaint = { type: true, msg: 'feedback is required!' };
        isError = true;
    }

    if (latitude.value == null || longitude.value == null) {
        FormErrors.location = { type: true, msg: 'Location access is required to file feedback.' };
        isError = true;
    }

    return !isError;
};

const counterLabelFn = ({ totalSize, filesNumber, maxFiles }) => {
    return `${filesNumber} files of ${maxFiles} | ${totalSize}`;
};

const submit = async () => {
    if (!validate()) return;
    loading.value = true;
    try {
        const form = new FormData();
        if (props.mode === 'guest') {
            form.append('isAnonymous', isAnonymously.value);
            form.append('firstname', firstname.value);
            form.append('lastname', lastname.value);
            form.append('email', email.value);
            form.append('contactNo', contactNo.value);
        }
        form.append('content', complaint.value);
        form.append('latitude', latitude.value);
        form.append('longitude', longitude.value);
        if (file.value && file.value.length > 0) {
            for (let i = 0; i < file.value.length; i++) {
                form.append('files', file.value[i]);
            }
        }

        const endpoint = props.mode === 'guest' ? '/complaint/otp/send' : '/complaint/account';
        const response = await api.post(endpoint, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        emit('submitted', { mode: props.mode, data: response.data });
    } catch (e) {
        console.error(e);
        emit('submitted', { mode: props.mode, error: e });
    } finally {
        loading.value = false;
    }
};

// So a parent using hideSubmit can drive this form from its own footer button (see
// ComplaintPage.vue's "file a complaint" dialog).
defineExpose({ submit, loading });
</script>
