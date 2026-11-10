<template>
    <div class="kx-center">
        <template v-if="!submitted">
            <div class="kx-head">
                <span class="kx-head-ico"><q-icon name="bi-emoji-smile" /></span>
                <div>
                    <div class="kx-head-t">Give feedback</div>
                    <div class="kx-head-s">Rate the service you just received — it takes about a minute.</div>
                </div>
            </div>

            <!-- where you are -->
            <div class="kx-progress">
                <div class="kx-progress-top">
                    <span class="kx-progress-phase">{{ PHASES[phaseIndex] }}</span>
                    <span class="kx-progress-n">step {{ step + 1 }} of {{ totalSteps }}</span>
                </div>
                <div class="kx-bar"><span :style="{ width: ((step + 1) / totalSteps * 100) + '%' }" /></div>
                <div class="kx-phases">
                    <span v-for="(ph, i) in PHASES" :key="ph" class="kx-phase" :class="{ 'kx-phase--on': i === phaseIndex, 'kx-phase--done': i < phaseIndex }">{{ ph }}</span>
                </div>
            </div>

            <div class="kx-card kx-form-card kx-stage">
                <!-- step 0: office -->
                <div v-if="step === 0">
                    <div class="kx-question">Which office did you visit today?</div>
                    <div class="kx-question-sub">Tap the one you just transacted with.</div>
                    <div v-if="loadingOffices" class="q-pa-lg text-center"><q-spinner-oval size="2.4em" color="primary" /></div>
                    <div v-else class="kx-choices">
                        <button v-for="o in offices" :key="o.id" type="button" class="kx-choice" :class="{ 'kx-choice--on': officeId === o.id }" @click="officeId = o.id">
                            <span class="dot"><i /></span><span>{{ o.name }}</span>
                        </button>
                    </div>
                    <div v-if="errors.office" class="kx-err q-mt-md">{{ errors.office }}</div>
                </div>

                <!-- step 1: client info -->
                <div v-if="step === 1">
                    <div class="kx-question">Tell us about yourself</div>
                    <div class="kx-question-sub">This helps us understand who we are serving.</div>

                    <div class="kx-label" :class="{ 'kx-label--err': errors.type }">Client type <i>required</i></div>
                    <div class="kx-choices q-mb-lg">
                        <button v-for="opt in CLIENT_TYPES" :key="opt.value" type="button" class="kx-choice" :class="{ 'kx-choice--on': type === opt.value }" @click="type = opt.value">
                            <span class="dot"><i /></span><span>{{ opt.label }}</span>
                        </button>
                    </div>
                    <div v-if="errors.type" class="kx-err q-mb-md">{{ errors.type }}</div>

                    <div class="kx-label">Sex</div>
                    <div class="kx-choices q-mb-lg">
                        <button v-for="o in SEX_OPTIONS" :key="o" type="button" class="kx-choice" :class="{ 'kx-choice--on': sex === o }" @click="sex = o">
                            <span class="dot"><i /></span><span>{{ o }}</span>
                        </button>
                    </div>

                    <div class="kx-grid">
                        <div>
                            <div class="kx-label">Age</div>
                            <q-input v-model="age" outlined class="kx-field" inputmode="numeric" placeholder="e.g. 34" />
                        </div>
                        <div>
                            <div class="kx-label">Residence / city</div>
                            <q-input v-model="residence" outlined class="kx-field" placeholder="e.g. San Fernando City" />
                        </div>
                        <div>
                            <div class="kx-label">Email <i>optional</i></div>
                            <q-input v-model="email" type="email" outlined class="kx-field" placeholder="you@example.com" />
                        </div>
                        <div>
                            <div class="kx-label">Service availed</div>
                            <q-input v-model="serviceAvailed" outlined class="kx-field" placeholder="e.g. Business permit" />
                        </div>
                    </div>
                </div>

                <!-- step 2: CC1 -->
                <div v-if="step === 2">
                    <div class="kx-question">Citizen's Charter awareness</div>
                    <div class="kx-question-sub">Which of the following best describes your awareness of a CC?</div>
                    <div class="kx-choices kx-choices--one">
                        <button v-for="opt in CC1_OPTIONS" :key="opt.value" type="button" class="kx-choice" :class="{ 'kx-choice--on': cc1 === opt.value }" @click="cc1 = opt.value">
                            <span class="dot"><i /></span><span>{{ opt.label }}</span>
                        </button>
                    </div>
                    <div v-if="errors.cc1" class="kx-err q-mt-md">{{ errors.cc1 }}</div>
                </div>

                <!-- step 3: CC2 -->
                <div v-if="step === 3">
                    <div class="kx-question">Citizen's Charter visibility</div>
                    <div class="kx-question-sub">If aware of CC, was it visible in the office you transacted with?</div>
                    <div v-if="cc1 === '4'" class="kx-note q-mb-md"><q-icon name="bi-info-circle" size="20px" /><span>Not applicable — you indicated you never saw this office's CC.</span></div>
                    <div class="kx-choices">
                        <button v-for="opt in CC2_OPTIONS" :key="opt.value" type="button" class="kx-choice" :class="{ 'kx-choice--on': cc2 === opt.value }" :disabled="cc1 === '4'" @click="cc2 = opt.value">
                            <span class="dot"><i /></span><span>{{ opt.label }}</span>
                        </button>
                    </div>
                    <div v-if="errors.cc2" class="kx-err q-mt-md">{{ errors.cc2 }}</div>
                </div>

                <!-- step 4: CC3 -->
                <div v-if="step === 4">
                    <div class="kx-question">Citizen's Charter usefulness</div>
                    <div class="kx-question-sub">How much did the CC help you in your transaction?</div>
                    <div v-if="cc1 === '4'" class="kx-note q-mb-md"><q-icon name="bi-info-circle" size="20px" /><span>Not applicable — you indicated you never saw this office's CC.</span></div>
                    <div class="kx-choices">
                        <button v-for="opt in CC3_OPTIONS" :key="opt.value" type="button" class="kx-choice" :class="{ 'kx-choice--on': cc3 === opt.value }" :disabled="cc1 === '4'" @click="cc3 = opt.value">
                            <span class="dot"><i /></span><span>{{ opt.label }}</span>
                        </button>
                    </div>
                    <div v-if="errors.cc3" class="kx-err q-mt-md">{{ errors.cc3 }}</div>
                </div>

                <!-- steps 5-13: sqd0-8, one statement per step -->
                <div v-if="currentSqd" class="text-center">
                    <div class="kx-eyebrow">statement {{ step - 4 }} of {{ SQD_QUESTIONS.length }}</div>
                    <div class="kx-question q-mt-sm">{{ currentSqd.label }}</div>
                    <div class="kx-question-sub">How much do you agree?</div>
                    <div class="kx-faces">
                        <button v-for="n in 5" :key="n" type="button" class="kx-face" :class="{ 'kx-face--on': sqd[currentSqd.key] === n }" @click="sqd[currentSqd.key] = n">
                            <q-icon :name="icons[n - 1]" :color="colors[n - 1]" />
                            <small>{{ SQD_SCALE_LABELS[n - 1] }}</small>
                        </button>
                        <button type="button" class="kx-face" :class="{ 'kx-face--on': sqd[currentSqd.key] === 0 }" @click="sqd[currentSqd.key] = 0">
                            <q-icon name="bi-dash-circle" color="grey" />
                            <small>Not applicable</small>
                        </button>
                    </div>
                </div>

                <!-- last step: suggestion -->
                <div v-if="step === totalSteps - 1">
                    <div class="kx-question">Anything else you'd like to share?</div>
                    <div class="kx-question-sub">A suggestion, a compliment, or a concern — it is optional.</div>
                    <q-input v-model="suggestion" type="textarea" rows="6" outlined class="kx-field" placeholder="Type your suggestion here..." />
                </div>
            </div>

            <div class="kx-actions q-mb-lg">
                <q-btn v-if="step > 0" flat rounded no-caps color="primary" class="kx-btn" icon="bi-arrow-left" label="Back" @click="step--" />
                <q-btn v-else flat rounded no-caps color="primary" class="kx-btn" icon="bi-x-lg" label="Cancel" to="/" />
                <q-btn unelevated rounded no-caps color="primary" class="kx-btn" :icon-right="step === totalSteps - 1 ? 'bi-send' : 'bi-arrow-right'" :label="step === totalSteps - 1 ? 'Submit' : 'Next'" :loading="loading" @click="nextStep" />
            </div>
        </template>

        <template v-else>
            <div class="kx-card kx-done">
                <div class="kx-done-ico"><q-icon name="bi-heart-fill" /></div>
                <div class="kx-done-t">Thank you!</div>
                <div class="kx-done-s">Your feedback helps us improve our service.</div>
                <div class="kx-count">Returning to home in {{ countdown }}s&hellip;</div>
                <q-btn unelevated rounded no-caps color="primary" class="kx-btn full-width" icon="bi-house-fill" label="Done" to="/" />
            </div>
        </template>
    </div>
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

const SEX_OPTIONS = ['Male', 'Female', 'Others'];

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

// the five stages shown above the question: office, about you, the charter (3 steps), the service
// rating (9 steps), and the last word
const PHASES = ['Office', 'About you', 'Charter', 'Service', 'Finish'];
const phaseIndex = computed(() => (step.value === 0 ? 0 : step.value === 1 ? 1 : step.value <= 4 ? 2 : step.value < totalSteps - 1 ? 3 : 4));

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
