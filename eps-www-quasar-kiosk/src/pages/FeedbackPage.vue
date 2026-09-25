<template>
    <q-page class="kf-page">
        <div class="kf-shell">
            <template v-if="!submitted">
                <div class="row items-center q-mb-md">
                    <div>
                        <div class="kx-eyebrow">feedback module</div>
                        <div class="text-h4 text-weight-bold">Give Feedback</div>
                    </div>
                    <q-space />
                    <div class="text-caption text-grey">step {{ step + 1 }} of {{ totalSteps }}</div>
                </div>

                <q-linear-progress :value="(step + 1) / totalSteps" color="primary" rounded class="q-mb-xl" style="height: 8px;" />

                <q-card flat class="kf-card radius-md custom-border q-pa-xl">
                    <!-- step 0: office -->
                    <div v-if="step === 0">
                        <div class="text-h6 text-weight-bold q-mb-md">Which office did you visit today?</div>
                        <div v-if="loadingOffices" class="q-pa-lg text-center">
                            <q-spinner-ios size="2em" />
                        </div>
                        <div v-else class="row q-gutter-sm q-mb-md">
                            <q-btn
                                v-for="o in offices" :key="o.id"
                                no-caps unelevated rounded size="lg" :label="o.name"
                                class="kf-chip" :class="officeId === o.id ? 'kf-chip--active' : ''"
                                @click="officeId = o.id"
                            />
                        </div>
                        <div v-if="errors.office" class="text-negative text-caption">{{ errors.office }}</div>
                    </div>

                    <!-- step 1: client info -->
                    <div v-if="step === 1">
                        <div class="text-h6 text-weight-bold q-mb-md">Tell us about yourself</div>
                        <div class="text-caption text-grey q-mb-xs">Client type</div>
                        <div class="row q-gutter-sm q-mb-lg">
                            <q-btn
                                v-for="opt in CLIENT_TYPES" :key="opt.value"
                                no-caps unelevated rounded size="lg" :label="opt.label"
                                class="kf-chip" :class="type === opt.value ? 'kf-chip--active' : ''"
                                @click="type = opt.value"
                            />
                        </div>
                        <div v-if="errors.type" class="text-negative text-caption q-mb-md">{{ errors.type }}</div>

                        <div class="row q-col-gutter-md">
                            <div class="col-12 col-sm-6">
                                <q-select outlined v-model="sex" :options="['Male', 'Female', 'Others']" label="Sex" input-class="kc-input" />
                            </div>
                            <div class="col-12 col-sm-6">
                                <q-input outlined v-model="age" label="Age" input-class="kc-input" />
                            </div>
                            <div class="col-12 col-sm-6">
                                <q-input outlined v-model="residence" label="Residence / city" input-class="kc-input" />
                            </div>
                            <div class="col-12 col-sm-6">
                                <q-input outlined v-model="email" label="Email (optional)" input-class="kc-input" />
                            </div>
                            <div class="col-12">
                                <q-input outlined v-model="serviceAvailed" label="Service availed" input-class="kc-input" />
                            </div>
                        </div>
                    </div>

                    <!-- step 2: CC1 -->
                    <div v-if="step === 2">
                        <div class="text-h6 text-weight-bold q-mb-xs">Citizen's Charter awareness</div>
                        <div class="text-body2 text-grey q-mb-md">Which of the following best describes your awareness of a CC?</div>
                        <div class="column q-gutter-sm">
                            <q-btn
                                v-for="opt in CC1_OPTIONS" :key="opt.value"
                                no-caps unelevated align="left" :label="opt.label" size="lg"
                                class="kf-chip kf-chip--wide" :class="cc1 === opt.value ? 'kf-chip--active' : ''"
                                @click="cc1 = opt.value"
                            />
                        </div>
                        <div v-if="errors.cc1" class="text-negative text-caption q-mt-md">{{ errors.cc1 }}</div>
                    </div>

                    <!-- step 3: CC2 -->
                    <div v-if="step === 3">
                        <div class="text-h6 text-weight-bold q-mb-xs">Citizen's Charter visibility</div>
                        <div class="text-body2 text-grey q-mb-md">If aware of CC, was it visible in the office you transacted with?</div>
                        <div v-if="cc1 === '4'" class="text-caption text-grey q-mb-sm">Not applicable — you indicated you never saw this office's CC.</div>
                        <div class="row q-gutter-sm">
                            <q-btn
                                v-for="opt in CC2_OPTIONS" :key="opt.value"
                                no-caps unelevated rounded size="lg" :label="opt.label"
                                :disable="cc1 === '4'"
                                class="kf-chip" :class="cc2 === opt.value ? 'kf-chip--active' : ''"
                                @click="cc2 = opt.value"
                            />
                        </div>
                        <div v-if="errors.cc2" class="text-negative text-caption q-mt-md">{{ errors.cc2 }}</div>
                    </div>

                    <!-- step 4: CC3 -->
                    <div v-if="step === 4">
                        <div class="text-h6 text-weight-bold q-mb-xs">Citizen's Charter usefulness</div>
                        <div class="text-body2 text-grey q-mb-md">How much did the CC help you in your transaction?</div>
                        <div v-if="cc1 === '4'" class="text-caption text-grey q-mb-sm">Not applicable — you indicated you never saw this office's CC.</div>
                        <div class="row q-gutter-sm">
                            <q-btn
                                v-for="opt in CC3_OPTIONS" :key="opt.value"
                                no-caps unelevated rounded size="lg" :label="opt.label"
                                :disable="cc1 === '4'"
                                class="kf-chip" :class="cc3 === opt.value ? 'kf-chip--active' : ''"
                                @click="cc3 = opt.value"
                            />
                        </div>
                        <div v-if="errors.cc3" class="text-negative text-caption q-mt-md">{{ errors.cc3 }}</div>
                    </div>

                    <!-- steps 5-13: sqd0-8, one dimension per step -->
                    <div v-if="currentSqd" class="text-center">
                        <div class="text-h6 text-weight-bold text-uppercase q-mb-xs">{{ currentSqd.key }}</div>
                        <div class="text-body1 text-grey q-mb-xl">{{ currentSqd.label }}</div>
                        <div class="row justify-center q-gutter-lg items-start">
                            <div v-for="n in 5" :key="n" class="kf-sqd-option" :class="{ 'kf-sqd-option--active': sqd[currentSqd.key] === n }" @click="sqd[currentSqd.key] = n">
                                <q-icon :name="icons[n - 1]" :color="colors[n - 1]" size="56px" />
                                <div class="text-caption q-mt-sm text-center">{{ SQD_SCALE_LABELS[n - 1] }}</div>
                            </div>
                            <div class="kf-sqd-option" :class="{ 'kf-sqd-option--active': sqd[currentSqd.key] === 0 }" @click="sqd[currentSqd.key] = 0">
                                <q-icon name="bi-dash-circle" color="grey" size="56px" />
                                <div class="text-caption q-mt-sm text-center">N/A</div>
                            </div>
                        </div>
                    </div>

                    <!-- last step: suggestion -->
                    <div v-if="step === totalSteps - 1">
                        <div class="text-h6 text-weight-bold q-mb-md">Anything else you'd like to share?</div>
                        <q-input outlined v-model="suggestion" type="textarea" rows="5" label="Suggestion (optional)" input-class="kc-input" />
                    </div>

                    <div class="row justify-between kf-footer">
                        <q-btn rounded v-if="step > 0" flat no-caps size="lg" label="back" @click="step--" />
                        <q-space v-else />
                        <q-btn rounded unelevated no-caps size="lg" color="primary" :label="step === totalSteps - 1 ? 'submit' : 'next'" :loading="loading" @click="nextStep" />
                    </div>
                </q-card>
            </template>

            <template v-else>
                <q-card flat class="kf-card kf-success radius-md custom-border q-pa-xl text-center">
                    <q-icon name="bi-check-circle-fill" color="positive" size="72px" class="q-mb-md" />
                    <div class="text-h5 text-weight-bold q-mb-sm">Thank You!</div>
                    <div class="text-body1 text-grey q-mb-lg">Your feedback helps us improve our service.</div>
                    <div class="text-caption text-grey q-mb-lg">Returning to home in {{ countdown }}s&hellip;</div>
                    <q-btn unelevated color="primary" size="lg" class="full-width" label="done" to="/" />
                </q-card>
            </template>
        </div>
    </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from 'src/boot/axios';

const router = useRouter();

const CLIENT_TYPES = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'business', label: 'Business' },
    { value: 'government', label: 'Government' },
];

const CC1_OPTIONS = [
    { value: '1', label: "I know what a CC is and I saw this office's CC." },
    { value: '2', label: "I know what a CC is but I did NOT see this office's CC." },
    { value: '3', label: 'I do not know what a CC is, but I saw this office\'s CC.' },
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

// 5 fixed steps (office, client info, cc1, cc2, cc3) + one step per SQD dimension + a final
// suggestion/submit step. No separate date step — the kiosk rating is always "right now" (the
// backend ignores any submitted date for entryFrom:'kiosk' and stamps the current time itself).
const totalSteps = 5 + SQD_QUESTIONS.length + 1;
const step = ref(0);
const loading = ref(false);
const submitted = ref(false);

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

const errors = reactive({ office: '', type: '', cc1: '', cc2: '', cc3: '' });

// CC1 = 4 means "not aware, never saw a CC" — CC2/CC3 don't apply, so pin them to their N/A
// value rather than forcing the citizen to answer a question about something they never saw.
const pinNotApplicable = () => {
    if (cc1.value === '4') {
        cc2.value = '5';
        cc3.value = '4';
    } else {
        cc2.value = '';
        cc3.value = '';
    }
};

const nextStep = () => {
    if (step.value === 0) {
        errors.office = officeId.value ? '' : 'Please choose an office.';
        if (errors.office) return;
    }
    if (step.value === 1) {
        errors.type = type.value ? '' : 'Please choose a client type.';
        if (errors.type) return;
    }
    if (step.value === 2) {
        errors.cc1 = cc1.value ? '' : 'Please select an option.';
        if (errors.cc1) return;
        pinNotApplicable();
    }
    if (step.value === 3) {
        errors.cc2 = cc2.value ? '' : 'Please select an option.';
        if (errors.cc2) return;
    }
    if (step.value === 4) {
        errors.cc3 = cc3.value ? '' : 'Please select an option.';
        if (errors.cc3) return;
    }

    if (step.value < totalSteps - 1) {
        step.value++;
    } else {
        submit();
    }
};

let countdownTimer = null;
const countdown = ref(15);

const submit = async () => {
    loading.value = true;
    try {
        await api.post('/rating/kiosk', {
            email: email.value,
            officeId: officeId.value,
            type: type.value,
            sex: sex.value || 'Others',
            age: age.value,
            residence: residence.value,
            serviceAvailed: serviceAvailed.value,
            cc1: cc1.value,
            cc2: cc2.value,
            cc3: cc3.value,
            ...sqd,
            suggestion: suggestion.value,
        });
        submitted.value = true;
        countdownTimer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
                clearInterval(countdownTimer);
                router.push('/');
            }
        }, 1000);
    } catch (error) {
        console.error('Error submitting kiosk rating:', error);
    } finally {
        loading.value = false;
    }
};

onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style scoped>
.kf-page {
    padding: 32px;
    display: flex;
    justify-content: center;
}
.kf-shell {
    width: 100%;
    max-width: 820px;
}
.kx-eyebrow {
    font-size: 13px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 4px;
}
.kf-card {
    background: #FFFFFF;
    min-height: 420px;
    display: flex;
    flex-direction: column;
}
.kf-footer {
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 24px;
}
.kf-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    padding: 0 20px;
    font-size: 15px;
}
.kf-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.kf-chip--wide {
    width: 100%;
    justify-content: flex-start;
    white-space: normal;
    text-align: left;
    padding: 16px 20px;
}
.kf-sqd-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 112px;
    padding: 16px 6px;
    border-radius: 12px;
    border: 2px solid transparent;
    cursor: pointer;
}
.kf-sqd-option:hover {
    background: #F6F9FC;
}
.kf-sqd-option--active {
    border-color: var(--q-primary);
    background: #F0F6FF;
}
</style>
