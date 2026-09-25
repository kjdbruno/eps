<template>
    <div class="cf-shell">
        <div class="row items-center q-gutter-md q-mb-lg no-wrap">
            <div>
                <div class="cf-eyebrow">citizen CSM report</div>
                <div class="text-h5 text-uppercase">file new CSM report</div>
                <div class="text-caption text-grey">step {{ step + 1 }} of {{ totalSteps }}</div>
            </div>
            <q-space />
            <q-btn icon="bi-x-circle" flat round dense v-close-popup />
        </div>

        <q-linear-progress :value="(step + 1) / totalSteps" color="primary" rounded class="q-mb-xl cf-progress" style="height: 6px;" />

        <div class="cf-step-body">
            <!-- step 0: office (pill, single-select) + date -->
            <div v-if="step === 0">
                <div class="text-subtitle1 text-weight-bold q-mb-sm">Which office is this CSM report for?</div>
                <div v-if="loadingOffices" class="q-mb-lg">
                    <q-spinner-ios size="1.5em" />
                </div>
                <div v-else class="row q-gutter-xs q-mb-lg">
                    <q-btn
                        v-for="o in offices" :key="o.id"
                        no-caps unelevated rounded size="sm" :label="o.alias"
                        class="cf-chip" :class="officeId === o.id ? 'cf-chip--active' : ''"
                        @click="officeId = o.id"
                    />
                </div>
                <div v-if="errors.office.type" class="text-negative text-caption q-mb-lg">{{ errors.office.message }}</div>

                <div class="text-subtitle1 text-weight-bold q-mb-sm">Date of visit</div>
                <q-date v-model="date" mask="YYYY-MM-DD" :options="dateOptions" flat bordered class="cf-date radius-sm" />
                <div v-if="errors.date.type" class="text-negative text-caption q-mt-sm">{{ errors.date.message }}</div>
            </div>

            <!-- step 1: client info -->
            <div v-if="step === 1">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Tell us about yourself</div>
                <div class="text-caption text-grey q-mb-xs">Client type</div>
                <div class="row q-gutter-xs q-mb-lg">
                    <q-btn
                        v-for="opt in CLIENT_TYPES" :key="opt.value"
                        no-caps unelevated rounded size="sm" :label="opt.label"
                        class="cf-chip" :class="type === opt.value ? 'cf-chip--active' : ''"
                        @click="type = opt.value"
                    />
                </div>
                <div v-if="errors.type.type" class="text-negative text-caption q-mb-lg">{{ errors.type.message }}</div>

                <div class="row q-col-gutter-sm">
                    <div class="col-12 col-sm-6">
                        <q-select outlined v-model="sex" :options="['Male', 'Female', 'Others']" label="Sex" emit-value map-options />
                    </div>
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="age" label="Age" />
                    </div>
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="residence" label="Residence / city" />
                    </div>
                    <div class="col-12 col-sm-6">
                        <q-input outlined v-model="email" label="Email (optional)" />
                    </div>
                    <div class="col-12">
                        <q-input outlined v-model="serviceAvailed" label="Service availed" />
                    </div>
                </div>
            </div>

            <!-- step 2: CC1 -->
            <div v-if="step === 2">
                <div class="text-subtitle1 text-weight-bold q-mb-xs">Citizen's Charter awareness</div>
                <div class="text-caption text-grey q-mb-md">Which of the following best describes your awareness of a CC?</div>
                <div class="column q-gutter-xs q-mb-lg">
                    <q-btn
                        v-for="opt in CC1_OPTIONS" :key="opt.value"
                        no-caps unelevated rounded align="left" :label="opt.label"
                        class="cf-chip cf-chip--wide" :class="cc1 === opt.value ? 'cf-chip--active' : ''"
                        @click="cc1 = opt.value"
                    />
                </div>
                <div v-if="errors.cc1.type" class="text-negative text-caption q-mt-md">{{ errors.cc1.message }}</div>
            </div>

            <!-- step 3: CC2 -->
            <div v-if="step === 3">
                <div class="text-subtitle1 text-weight-bold q-mb-xs">Citizen's Charter visibility</div>
                <div class="text-caption text-grey q-mb-md">If aware of CC, was it visible in the office you transacted with?</div>
                <div v-if="cc1 === '4'" class="text-caption text-grey q-mb-sm">Not applicable — you indicated you never saw this office's CC.</div>
                <div class="row q-gutter-xs q-mb-lg">
                    <q-btn
                        v-for="opt in CC2_OPTIONS" :key="opt.value"
                        no-caps unelevated rounded size="sm" :label="opt.label"
                        :disable="cc1 === '4'"
                        class="cf-chip" :class="cc2 === opt.value ? 'cf-chip--active' : ''"
                        @click="cc2 = opt.value"
                    />
                </div>
                <div v-if="errors.cc2.type" class="text-negative text-caption q-mt-md">{{ errors.cc2.message }}</div>
            </div>

            <!-- step 4: CC3 -->
            <div v-if="step === 4">
                <div class="text-subtitle1 text-weight-bold q-mb-xs">Citizen's Charter usefulness</div>
                <div class="text-caption text-grey q-mb-md">How much did the CC help you in your transaction?</div>
                <div v-if="cc1 === '4'" class="text-caption text-grey q-mb-sm">Not applicable — you indicated you never saw this office's CC.</div>
                <div class="row q-gutter-xs q-mb-lg">
                    <q-btn
                        v-for="opt in CC3_OPTIONS" :key="opt.value"
                        no-caps unelevated rounded size="sm" :label="opt.label"
                        :disable="cc1 === '4'"
                        class="cf-chip" :class="cc3 === opt.value ? 'cf-chip--active' : ''"
                        @click="cc3 = opt.value"
                    />
                </div>
                <div v-if="errors.cc3.type" class="text-negative text-caption q-mt-md">{{ errors.cc3.message }}</div>
            </div>

            <!-- steps 5-13: sqd0-8, one dimension per step -->
            <div v-if="currentSqd">
                <div class="text-subtitle1 text-weight-bold q-mb-xs text-uppercase">{{ currentSqd.key }}</div>
                <div class="text-caption text-grey q-mb-lg">{{ currentSqd.label }}</div>
                <div class="row q-gutter-md items-center">
                    <div v-for="n in 5" :key="n" class="cf-sqd-option" :class="{ 'cf-sqd-option--active': sqd[currentSqd.key] === n }" @click="sqd[currentSqd.key] = n">
                        <q-icon :name="icons[n - 1]" :color="colors[n - 1]" size="42px" />
                        <div class="text-caption q-mt-xs text-center">{{ SQD_SCALE_LABELS[n - 1] }}</div>
                    </div>
                    <div class="cf-sqd-option" :class="{ 'cf-sqd-option--active': sqd[currentSqd.key] === 0 }" @click="sqd[currentSqd.key] = 0">
                        <q-icon name="bi-dash-circle" color="grey" size="42px" />
                        <div class="text-caption q-mt-xs text-center">N/A</div>
                    </div>
                </div>
            </div>

            <!-- step 14: suggestion + submit -->
            <div v-if="step === totalSteps - 1">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Anything else you'd like to share?</div>
                <q-input outlined v-model="suggestion" type="textarea" rows="5" label="Suggestion (optional)" />
            </div>
        </div>

        <div class="row justify-between cf-footer">
            <q-btn rounded v-if="step > 0" flat no-caps label="back" @click="step--" />
            <q-space v-else />
            <q-btn rounded unelevated no-caps color="primary" class="q-px-lg" :label="step === totalSteps - 1 ? 'submit' : 'next'" :loading="feedbackLoading" @click="nextStep" />
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import 'sweetalert2/src/sweetalert2.scss';

const emit = defineEmits(['close', 'created']);

const Toast = Swal.mixin({
    toast: true,
    position: "bottom-start",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

const CLIENT_TYPES = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'business', label: 'Business' },
    { value: 'government', label: 'Government' },
];

const CC1_OPTIONS = [
    { value: '1', label: "I know what a CC is and I saw this office's CC." },
    { value: '2', label: "I know what a CC is but I did NOT see this office's CC." },
    { value: '3', label: "I do not know what a CC is, but I saw this office's CC." },
    { value: '4', label: 'I do not know what a CC is and I did not see one in this office.' },
];
const CC2_OPTIONS = [
    { value: '1', label: 'Easy to see' },
    { value: '2', label: 'Somewhat easy to see' },
    { value: '3', label: 'Difficult to see' },
    { value: '4', label: 'Not visible at all' },
    { value: '5', label: 'Not Applicable' },
];
const CC3_OPTIONS = [
    { value: '1', label: 'Helped very much' },
    { value: '2', label: 'Somewhat helped' },
    { value: '3', label: 'Did not help' },
    { value: '4', label: 'Not Applicable' },
];

const SQD_QUESTIONS = [
    { key: 'sqd0', label: 'I am satisfied with the service that I availed' },
    { key: 'sqd1', label: 'I spent a reasonable amount of time for my transaction' },
    { key: 'sqd2', label: "The office followed the transaction's requirements and steps based on the information provided" },
    { key: 'sqd3', label: 'The steps (including payment) I needed to do for my transaction were easy and simple' },
    { key: 'sqd4', label: 'I easily found information about my transaction from the office or its website' },
    { key: 'sqd5', label: 'I paid a reasonable amount of fees for my transaction' },
    { key: 'sqd6', label: 'I feel the office was fair to everyone, or "walang palakasan" during my transaction' },
    { key: 'sqd7', label: 'I was treated courteously by the staff, and (if ask for help) the staff was helpful' },
    { key: 'sqd8', label: 'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained' },
];
const SQD_SCALE_LABELS = ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'];
const icons = ['bi-emoji-angry', 'bi-emoji-frown', 'bi-emoji-neutral', 'bi-emoji-smile', 'bi-emoji-laughing'];
const colors = ['red', 'amber', 'yellow', 'light-green', 'green'];

// 5 fixed steps (office+date, client info, cc1, cc2, cc3) + one step per SQD dimension + a final
// suggestion/submit step.
const totalSteps = 5 + SQD_QUESTIONS.length + 1;
const step = ref(0);
const feedbackLoading = ref(false);

const currentSqd = computed(() => {
    const idx = step.value - 5;
    return idx >= 0 && idx < SQD_QUESTIONS.length ? SQD_QUESTIONS[idx] : null;
});

/* -------------------- office picker -------------------- */

const offices = ref([]);
const loadingOffices = ref(false);
const officeId = ref(null);

const loadOffices = async () => {
    loadingOffices.value = true;
    try {
        const { data } = await api.get('/preference/office/getOffice');
        offices.value = data || [];
    } catch (error) {
        console.error('Error loading offices:', error);
    } finally {
        loadingOffices.value = false;
    }
};

onMounted(() => {
    loadOffices();
});

/* -------------------- form state -------------------- */

const date = ref(null);
const type = ref('');
const email = ref('');
const sex = ref('');
const age = ref('');
const residence = ref('');
const serviceAvailed = ref('');
const cc1 = ref('');
const cc2 = ref('');
const cc3 = ref('');
const sqd = reactive({ sqd0: 0, sqd1: 0, sqd2: 0, sqd3: 0, sqd4: 0, sqd5: 0, sqd6: 0, sqd7: 0, sqd8: 0 });
const suggestion = ref('');

const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
const dateOptions = (d) => d <= todayStr;

const errors = reactive({
    office: { message: null, type: null },
    date: { message: null, type: null },
    type: { message: null, type: null },
    cc1: { message: null, type: null },
    cc2: { message: null, type: null },
    cc3: { message: null, type: null },
});

// CC1 = 4 means "not aware, never saw a CC" — CC2/CC3 don't apply, so pin them to their N/A value
// rather than forcing the citizen to answer a question about something they never saw.
watch(cc1, (val) => {
    if (val === '4') {
        cc2.value = '5';
        cc3.value = '4';
    } else {
        cc2.value = '';
        cc3.value = '';
    }
});

const validateOfficeAndDate = () => {
    let isError = false;
    if (!officeId.value) {
        errors.office.message = 'Please choose an office';
        errors.office.type = true;
        isError = true;
    } else {
        errors.office.message = null;
        errors.office.type = null;
    }
    if (!date.value) {
        errors.date.message = 'Date is required';
        errors.date.type = true;
        isError = true;
    } else {
        errors.date.message = null;
        errors.date.type = null;
    }
    return isError;
};

const validateClient = () => {
    if (!type.value) {
        errors.type.message = 'Client type is required';
        errors.type.type = true;
        return true;
    }
    errors.type.message = null;
    errors.type.type = null;
    return false;
};

const nextStep = () => {
    if (step.value === 0 && validateOfficeAndDate()) return;
    if (step.value === 1 && validateClient()) return;
    if (step.value === 2) {
        const isError = !cc1.value;
        errors.cc1.type = isError;
        errors.cc1.message = isError ? 'Please select an option' : null;
        if (isError) return;
    }
    if (step.value === 3) {
        const isError = !cc2.value;
        errors.cc2.type = isError;
        errors.cc2.message = isError ? 'Please select an option' : null;
        if (isError) return;
    }
    if (step.value === 4) {
        const isError = !cc3.value;
        errors.cc3.type = isError;
        errors.cc3.message = isError ? 'Please select an option' : null;
        if (isError) return;
    }

    if (step.value < totalSteps - 1) {
        step.value++;
    } else {
        createKioskRating();
    }
};

const createKioskRating = async () => {
    feedbackLoading.value = true;
    try {
        const response = await api.post('/feedback/kiosk', {
            date: date.value,
            email: email.value,
            officeId: officeId.value,
            type: type.value,
            sex: (!sex.value ? 'Others' : sex.value),
            age: age.value,
            residence: residence.value,
            serviceAvailed: serviceAvailed.value,
            cc1: cc1.value,
            cc2: cc2.value,
            cc3: cc3.value,
            ...sqd,
            suggestion: suggestion.value,
        });
        feedbackLoading.value = false;
        Toast.fire({
            icon: "success",
            html: `<div class="text-h6 text-bold text-uppercase">submitted!</div><div class="text-caption text-capitalize;">${response.data.message}<div>`
        });
        emit('created');
    } catch (error) {
        feedbackLoading.value = false;
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">something went wrong</div><div class="text-caption">${error?.response?.data?.message || 'Please try again.'}<div>`
        });
    }
};
</script>

<style scoped>
/* Fills whatever height FeedbackPage.vue's dialog gives it (see the create-feedback
   q-card-section, which is a non-scrolling flex container) — header/progress stay put, the
   step body scrolls on its own, and the Back/Next row is pinned to the bottom of the modal. */
.cf-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 24px;
    box-sizing: border-box;
}
.cf-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.cf-progress {
    flex: 0 0 auto;
}
.cf-step-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.cf-footer {
    flex: 0 0 auto;
    padding-top: 16px;
}
/* Same look as the office/complaint list rail's quick-filter chips (ComplaintPage.vue's
   .cp-chip) — plain white pill, thin border, fills solid primary when selected. */
.cf-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.cf-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.cf-chip.disabled, .cf-chip--active.disabled {
    opacity: 0.6;
}
/* CC1's options are full sentences — one pill per line, stretched to the full width, instead
   of the short wrapped word-pills used for office/client-type/CC2/CC3. */
.cf-chip--wide {
    width: 100%;
    justify-content: flex-start;
    white-space: normal;
    text-align: left;
    padding: 10px 16px;
    min-height: auto;
}
.cf-date {
    width: 100%;
    max-width: 340px;
}
.cf-option-list {
    border-radius: 8px;
}
.cf-sqd-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 96px;
    padding: 12px 4px;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
}
.cf-sqd-option:hover {
    background: #F6F9FC;
}
.cf-sqd-option--active {
    border-color: var(--q-primary);
    background: #F0F6FF;
}
</style>
