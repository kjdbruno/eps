<template>
    <q-dialog persistent :model-value="modelValue" class="dialog dialog--wide" @update:model-value="v => emit('update:modelValue', v)" @before-show="init">
        <q-card>
            <q-card-section class="row items-center no-wrap">
                <div>
                    <div class="text-caption">{{ isEdit ? 'staff-filed feedback' : 'walk-in or phone report' }}</div>
                    <div class="text-h5 text-uppercase">{{ isEdit ? (complaint?.referenceNo || 'edit feedback') : 'file feedback' }}</div>
                    <div class="rc-hero-badges">
                        <template v-if="isEdit">
                            <span class="rc-hero-pill rc-hero-pill--on">{{ complaint?.status }}</span>
                            <span v-for="co in (complaint?.complaintOffices || []).filter(o => o.isActive)" :key="co.id" class="rc-hero-pill">{{ co.office?.alias || co.office?.name }}</span>
                            <span class="rc-hero-pill">editing</span>
                        </template>
                        <template v-else>
                            <span class="rc-hero-pill rc-hero-pill--on">new</span>
                            <span class="rc-hero-pill">account + email sent</span>
                            <span class="rc-hero-pill">routed automatically</span>
                        </template>
                    </div>
                </div>
                <q-space />
                <q-btn unelevated round flat icon="bi-x-circle" @click="() => emit('update:modelValue', false)" />
            </q-card-section>

            <q-card-section class="col rc-split">
                <!-- the pages of the form -->
                <aside class="rc-side">
                    <template v-for="(n, i) in pages" :key="n.key">
                        <div v-if="i === 0" class="rc-side-title">{{ isEdit ? 'Editing' : 'Filing' }}</div>
                        <button
                            type="button" class="rc-side-item" :class="{ 'rc-side-item--on': page === n.key, 'rc-side-item--locked': !n.open }"
                            :disabled="!n.open" @click="go(n.key)"
                        >
                            <q-icon :name="n.icon" />
                            <span>{{ n.label }}</span>
                            <q-icon v-if="!n.open" name="bi-lock-fill" size="12px" class="cc-state" />
                            <q-icon v-else-if="n.state === 'bad'" name="bi-exclamation-circle-fill" size="14px" class="cc-state cc-state--bad" />
                            <q-icon v-else-if="n.state === 'ok'" name="bi-check-circle-fill" size="14px" class="cc-state cc-state--ok" />
                            <b v-else-if="n.count">{{ n.count }}</b>
                        </button>
                    </template>
                </aside>

                <div class="rc-main">
                    <div class="rc-page rc-page--form">
                        <div class="rc-pg-head">
                            <div class="wz-action" :style="{ '--wz-bg': current.bg, '--wz-fg': current.fg }">
                                <div class="wz-action-icon"><q-icon :name="current.icon" size="24px" /></div>
                                <div class="col" style="min-width: 0;">
                                    <div class="wz-action-eyebrow">{{ isEdit ? 'editing' : 'step ' + (pageIndex + 1) + ' of ' + pages.length }}</div>
                                    <div class="wz-action-title">{{ current.title }}</div>
                                    <div class="wz-action-hint">{{ current.hint }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="rc-pg-main">
                            <!-- ============================== citizen ============================== -->
                            <div v-show="page === 'citizen'" class="rc-block">
                                <div class="rc-block-title">who is it for</div>
                                <div class="cc-grid">
                                    <div>
                                        <div class="rc-cap" :class="{ 'rc-cap--bad': FormErrors.firstname.type }">{{ FormErrors.firstname.type ? FormErrors.firstname.msg : 'firstname' }}</div>
                                        <q-input v-model="firstname" outlined placeholder="Firstname" :error="FormErrors.firstname.type" no-error-icon hide-bottom-space />
                                    </div>
                                    <div>
                                        <div class="rc-cap" :class="{ 'rc-cap--bad': FormErrors.lastname.type }">{{ FormErrors.lastname.type ? FormErrors.lastname.msg : 'lastname' }}</div>
                                        <q-input v-model="lastname" outlined placeholder="Lastname" :error="FormErrors.lastname.type" no-error-icon hide-bottom-space />
                                    </div>
                                    <div>
                                        <div class="rc-cap" :class="{ 'rc-cap--bad': FormErrors.email.type }">{{ FormErrors.email.type ? FormErrors.email.msg : 'email' }}</div>
                                        <q-input v-model="email" outlined placeholder="name@example.com" :error="FormErrors.email.type" no-error-icon hide-bottom-space />
                                    </div>
                                    <div>
                                        <div class="rc-cap" :class="{ 'rc-cap--bad': FormErrors.contactNo.type }">{{ FormErrors.contactNo.type ? FormErrors.contactNo.msg : 'contact no. (optional)' }}</div>
                                        <q-input v-model="contactNo" outlined placeholder="09XXXXXXXXX" :error="FormErrors.contactNo.type" no-error-icon hide-bottom-space />
                                    </div>
                                </div>
                                <div class="cc-note">
                                    <q-icon name="bi-info-circle" size="16px" />
                                    <span v-if="isEdit">Changing the email or contact number updates the citizen's account, which may be shared with other feedback.</span>
                                    <span v-else>The citizen gets a temporary account here (unless they already have one), and this email receives the feedback's details, the sign-in details with the default password, a verification code, and the steps to follow its status.</span>
                                </div>
                            </div>

                            <!-- ============================== feedback ============================== -->
                            <div v-show="page === 'feedback'" class="rc-block cc-fill">
                                <div class="rc-block-title">what happened</div>
                                <div class="rc-cap" :class="{ 'rc-cap--bad': FormErrors.complaint.type }">{{ FormErrors.complaint.type ? FormErrors.complaint.msg : 'summary of the feedback' }}</div>
                                <q-input
                                    v-model="complaintContent" type="textarea" outlined hide-bottom-space class="cc-textarea"
                                    placeholder="Describe the concern in the citizen's own words: what, where and since when..." :error="FormErrors.complaint.type" no-error-icon
                                />
                                <div class="rc-field-foot">
                                    <span>{{ isEdit ? 'The offices see this exactly as written.' : 'The system reads this and sends it to the right office, so be specific.' }}</span>
                                    <span>{{ complaintContent.trim().length }}</span>
                                </div>
                            </div>

                            <!-- ============================== evidence ============================== -->
                            <div v-show="page === 'evidence'" class="rc-block">
                                <div class="rc-block-title">photos<span class="rc-count">{{ keptFiles.length + (file?.length || 0) }}</span></div>
                                <template v-if="isEdit && existingFiles.length">
                                    <div class="rc-cap">on file now</div>
                                    <div class="rc-photos q-mb-md">
                                        <div v-for="f in existingFiles" :key="f.id" class="cc-thumb" :class="{ 'cc-thumb--gone': removedFileIds.includes(f.id) }">
                                            <img v-if="!isPdf(f)" :src="fileSrc(f)" :alt="f.filename || 'photo'" />
                                            <div v-else class="cc-thumb-pdf"><q-icon name="bi-file-earmark-pdf" size="28px" color="primary" /></div>
                                            <q-btn round dense unelevated size="sm" :icon="removedFileIds.includes(f.id) ? 'bi-arrow-counterclockwise' : 'bi-trash3'" :color="removedFileIds.includes(f.id) ? 'primary' : 'negative'" class="cc-thumb-x" @click="toggleRemoveFile(f.id)">
                                                <q-tooltip>{{ removedFileIds.includes(f.id) ? 'Keep it' : 'Remove it' }}</q-tooltip>
                                            </q-btn>
                                            <span v-if="removedFileIds.includes(f.id)" class="cc-thumb-flag">will be removed</span>
                                        </div>
                                    </div>
                                </template>

                                <div class="rc-cap">{{ isEdit ? 'add photos' : 'add photos (optional)' }}</div>
                                <FileDrop v-model="file" :max="5" hint="up to 5 images" />
                            </div>

                            <!-- ============================== review ============================== -->
                            <div v-if="!isEdit && page === 'review'" class="rc-block">
                                <div class="rc-block-title">about to be filed</div>
                                <div class="rc-facts">
                                    <div v-for="row in reviewFacts" :key="row.label" class="rc-fact" :class="{ 'rc-fact--top': row.wrap }">
                                        <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                        <span class="rc-fact-text">
                                            <span class="rc-fact-label">{{ row.label }}</span>
                                            <span class="rc-fact-value" :class="{ 'rc-fact-value--wrap': row.wrap }">{{ row.value || 'Not given' }}</span>
                                        </span>
                                        <q-space />
                                        <q-btn flat no-caps rounded size="sm" color="primary" label="Change" @click="go(row.page)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="rc-pg-foot">
                            <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" :disable="pageIndex === 0" @click="step(-1)"><q-tooltip>Previous step</q-tooltip></q-btn>
                            <span v-if="!isEdit && !stepDone(page) && page !== 'review'" class="cc-foot-hint"><q-icon name="bi-lock" size="13px" /> Complete this step to open the next one</span>
                            <q-btn v-if="pageIndex < pages.length - 1" flat round size="sm" color="grey-8" icon="bi-arrow-right" @click="step(1)"><q-tooltip>Next step</q-tooltip></q-btn>
                        </div>

                        <!-- the rail: what is still missing, and the button that saves -->
                        <div class="rc-pg-side">
                            <div class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">{{ isEdit ? 'before you save' : 'before it can be filed' }}<span class="rc-count">{{ checks.filter(c => c.ok).length }} / {{ checks.length }}</span></div>
                                        <ValidationCards :pages="pages" :checks="checks" :page="page" @go="go" />
                                        <div v-if="isEdit && removedFileIds.length" class="cc-note q-mt-md">
                                            <q-icon name="bi-trash3" size="16px" />
                                            <span>{{ removedFileIds.length }} photo(s) will be removed when you save.</span>
                                        </div>
                                    </div>
                                    <div v-if="problems.length" class="rc-problems">
                                        <div v-for="p in problems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        no-caps unelevated color="primary" :icon="isEdit ? 'bi-check2' : 'bi-send'" :label="isEdit ? 'save changes' : 'file feedback'"
                                        class="rc-send rc-reply-send" :disable="!isEdit && page !== 'review'" :loading="loading" @click="submit"
                                    >
                                        <q-tooltip v-if="!isEdit && page !== 'review'">Go through the steps first: it is filed from the review.</q-tooltip>
                                    </q-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>

            <q-inner-loading :showing="loading">
                <q-spinner-ios color="primary" size="md" />
                <div class="text-caption text-uppercase text-grey">we're working on it</div>
            </q-inner-loading>
        </q-card>
    </q-dialog>
</template>

<script setup>
import ValidationCards from 'src/components/ValidationCards.vue';
import FileDrop from 'src/components/FileDrop.vue';
import { ref, reactive, computed, watch } from 'vue';
import { api } from 'src/boot/axios';
import { Toast } from 'src/boot/sweetalert';

// One dialog for both filing and editing. When `complaint` is passed it runs in edit mode:
// pre-filled from it, submitting a PATCH instead of a POST. Only ever passed a complaint with
// via === 'staff' — see the "Edit" card of ComplaintPage.vue. The form is re-seeded every time the
// dialog opens, so it always starts from the complaint (or empty) it was opened for.
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    complaint: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'saved']);

const isEdit = computed(() => !!props.complaint);
const existingUser = computed(() => props.complaint?.complaintDetail?.user || null);
const existingFiles = computed(() => props.complaint?.complaintFiles || []);

const firstname = ref('');
const lastname = ref('');
const email = ref('');
const contactNo = ref('');
const complaintContent = ref('');
const file = ref([]);
const loading = ref(false);
const removedFileIds = ref([]);
const page = ref('citizen');

const FormErrors = reactive({
    firstname: { type: null, msg: '' },
    lastname: { type: null, msg: '' },
    email: { type: null, msg: '' },
    contactNo: { type: null, msg: '' },
    complaint: { type: null, msg: '' },
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(09|\+639)\d{9}$/;

// ------------------------------------------------------------------ what is complete
const nameOk = computed(() => !!firstname.value.trim() && !!lastname.value.trim());
const emailOk = computed(() => emailRegex.test(email.value.trim()));
const phoneOk = computed(() => !contactNo.value || phoneRegex.test(contactNo.value));
const feedbackOk = computed(() => complaintContent.value.trim().length > 0);
const keptFiles = computed(() => existingFiles.value.filter(f => !removedFileIds.value.includes(f.id)));

const checks = computed(() => [
    { key: 'name', page: 'citizen', required: true, ok: nameOk.value, title: 'Who it is for', detail: nameOk.value ? `${firstname.value.trim()} ${lastname.value.trim()}` : 'A firstname and a lastname.' },
    { key: 'email', page: 'citizen', required: true, ok: emailOk.value, title: 'An email to send updates to', detail: emailOk.value ? email.value.trim() : (email.value ? 'That does not look like an email.' : 'Required.') },
    { key: 'phone', page: 'citizen', required: false, ok: !!contactNo.value && phoneOk.value, title: 'A contact number', detail: !contactNo.value ? 'Optional.' : (phoneOk.value ? contactNo.value : 'Use 09XXXXXXXXX or +639XXXXXXXXX.') },
    { key: 'feedback', page: 'feedback', required: true, ok: feedbackOk.value, title: 'What happened', detail: feedbackOk.value ? `${complaintContent.value.trim().length} characters written.` : 'Describe the concern.' },
    { key: 'photos', page: 'evidence', required: false, ok: keptFiles.value.length + (file.value?.length || 0) > 0, title: 'Photos', detail: `${keptFiles.value.length + (file.value?.length || 0)} attached. Optional.` },
]);
// a bad contact number is wrong even though it is optional
const problems = computed(() => {
    const out = [];
    if (!nameOk.value) out.push('Add the citizen\'s firstname and lastname.');
    if (!emailOk.value) out.push(email.value ? 'Fix the email address.' : 'Add the citizen\'s email.');
    if (!phoneOk.value) out.push('Fix the contact number.');
    if (!feedbackOk.value) out.push('Describe the feedback.');
    return out;
});

// A step is complete when what it requires is filled in. Filing goes step by step: a step opens only once every step
// before it is complete (editing starts from a complete record, so it is free to move around).
const stepDone = (key) => {
    if (key === 'citizen') return nameOk.value && emailOk.value && phoneOk.value;
    if (key === 'feedback') return feedbackOk.value;
    return true;
};
const ORDER = ['citizen', 'feedback', 'evidence', 'review'];
const isOpen = (key) => isEdit.value || ORDER.slice(0, ORDER.indexOf(key)).every(stepDone);

const pages = computed(() => {
    const base = [
        { key: 'citizen', open: isOpen('citizen'), icon: 'bi-person', label: 'citizen', state: pageState(['firstname', 'lastname', 'email', 'contactNo'], nameOk.value && emailOk.value && phoneOk.value) },
        { key: 'feedback', open: isOpen('feedback'), icon: 'bi-chat-quote', label: 'feedback', state: pageState(['complaint'], feedbackOk.value) },
        { key: 'evidence', open: isOpen('evidence'), icon: 'bi-image', label: 'evidence', count: keptFiles.value.length + (file.value?.length || 0) },
    ];
    if (!isEdit.value) base.push({ key: 'review', open: isOpen('review'), icon: 'bi-clipboard-check', label: 'review' });
    return base;
});
const pageState = (errorKeys, complete) => {
    if (errorKeys.some(k => FormErrors[k].type)) return 'bad';
    return complete ? 'ok' : '';
};
const pageIndex = computed(() => Math.max(0, pages.value.findIndex(p => p.key === page.value)));
const go = (key) => {
    if (isOpen(key)) page.value = key;
};
const step = (dir) => {
    const next = pages.value[pageIndex.value + dir];
    if (!next) return;
    // going forward asks the step you are on to be complete: what is missing is marked, and you stay
    if (dir > 0 && !isEdit.value && !stepDone(page.value)) {
        applyErrors();
        return;
    }
    page.value = next.key;
};

const PAGE_INFO = {
    citizen: { icon: 'bi-person', bg: '#E5EEFC', fg: '#204888', title: 'Who is it for', hint: 'The citizen who reported it, and where to send the updates.' },
    feedback: { icon: 'bi-chat-quote', bg: '#E4F6EA', fg: '#1C8A3B', title: 'What happened', hint: 'The concern, in the citizen\'s own words.' },
    evidence: { icon: 'bi-image', bg: '#FFF1D6', fg: '#9A6B00', title: 'Photos', hint: 'Anything that shows it. Up to 5 images.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then file it.' },
};
const current = computed(() => PAGE_INFO[page.value] || PAGE_INFO.citizen);

const reviewFacts = computed(() => [
    { label: 'Citizen', value: `${firstname.value} ${lastname.value}`.trim(), icon: 'bi-person', tone: 'purple', page: 'citizen' },
    { label: 'Email', value: email.value, icon: 'bi-envelope', tone: 'red', page: 'citizen' },
    ...(isEdit.value ? [] : [{ label: 'Account', value: 'A temporary account is made and its details are emailed', icon: 'bi-person-check', tone: 'blue', page: 'citizen' }]),
    { label: 'Contact no.', value: contactNo.value, icon: 'bi-telephone', tone: 'teal', page: 'citizen' },
    { label: 'Feedback', value: complaintContent.value, icon: 'bi-chat-quote', tone: 'blue', page: 'feedback', wrap: true },
    { label: 'Photos', value: (file.value || []).length ? (file.value || []).map(f => f.name).join(', ') : '', icon: 'bi-image', tone: 'amber', page: 'evidence' },
]);

const init = () => {
    page.value = 'citizen';
    firstname.value = existingUser.value?.firstname || '';
    lastname.value = existingUser.value?.lastname || '';
    email.value = existingUser.value?.citizen?.email || props.complaint?.complaintDetail?.guestEmail || '';
    contactNo.value = existingUser.value?.citizen?.phoneNo || props.complaint?.complaintDetail?.guestPhone || '';
    complaintContent.value = props.complaint?.content || '';
    file.value = [];
    removedFileIds.value = [];
    Object.keys(FormErrors).forEach(key => { FormErrors[key] = { type: null, msg: '' }; });
};

// ------------------------------------------------------------------ photos
const isPdf = (f) => f?.file?.startsWith('data:application/pdf') || /\.pdf$/i.test(f?.filename || '');
const fileSrc = (f) => (/^(data:|https?:)/.test(f.file || '') ? f.file : `${process.env.VUE_APP_BACKEND_URL}${f.file}`);
const toggleRemoveFile = (id) => {
    const idx = removedFileIds.value.indexOf(id);
    if (idx >= 0) removedFileIds.value.splice(idx, 1);
    else removedFileIds.value.push(id);
};

// ------------------------------------------------------------------ checking and saving
const applyErrors = () => {
    let isError = false;
    Object.keys(FormErrors).forEach(key => { FormErrors[key] = { type: null, msg: '' }; });

    if (!firstname.value.trim()) {
        FormErrors.firstname = { type: true, msg: 'Firstname is required.' };
        isError = true;
    }
    if (!lastname.value.trim()) {
        FormErrors.lastname = { type: true, msg: 'Lastname is required.' };
        isError = true;
    }
    if (!email.value.trim()) {
        FormErrors.email = { type: true, msg: 'Email is required.' };
        isError = true;
    } else if (!emailRegex.test(email.value.trim())) {
        FormErrors.email = { type: true, msg: 'Invalid email format.' };
        isError = true;
    }
    if (contactNo.value && !phoneRegex.test(contactNo.value)) {
        FormErrors.contactNo = { type: true, msg: 'Invalid contact no. format.' };
        isError = true;
    }
    if (!complaintContent.value.trim()) {
        FormErrors.complaint = { type: true, msg: 'Feedback content is required.' };
        isError = true;
    }

    return isError;
};

const validate = () => {
    const isError = applyErrors();
    if (isError) {
        // take the person to the first page with something wrong
        page.value = (FormErrors.firstname.type || FormErrors.lastname.type || FormErrors.email.type || FormErrors.contactNo.type) ? 'citizen' : 'feedback';
    }
    return !isError;
};

// once something was marked wrong, the marks follow what is typed: they clear as it gets fixed
watch([firstname, lastname, email, contactNo, complaintContent], () => {
    if (Object.values(FormErrors).some(e => e.type)) applyErrors();
});

const submit = async () => {
    if (!validate()) return;
    loading.value = true;
    try {
        const form = new FormData();
        form.append('firstname', firstname.value.trim());
        form.append('lastname', lastname.value.trim());
        form.append('email', email.value.trim());
        form.append('contactNo', contactNo.value);
        form.append('content', complaintContent.value.trim());
        if (file.value && file.value.length > 0) {
            for (let i = 0; i < file.value.length; i++) {
                form.append('files', file.value[i]);
            }
        }

        let response;
        if (isEdit.value) {
            removedFileIds.value.forEach(id => form.append('removeFileIds', id));
            response = await api.patch(`/complaint/${props.complaint.id}/edit`, form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } else {
            response = await api.post('/complaint/staff', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }

        // filed, but the citizen's email did not go out: say so, since they hold the only copy of the sign-in details
        const notEmailed = !isEdit.value && response.data.account && !response.data.account.emailed;
        Toast.fire({
            icon: notEmailed ? "warning" : "success",
            html: `<div class="text-h6 text-bold text-uppercase">${isEdit.value ? 'saved!' : 'filed!'}</div><div class="text-caption;">${response.data.message}<div>`
        });
        emit('saved');
    } catch (error) {
        console.error('Error saving complaint:', error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">something went wrong</div><div class="text-caption">${error?.response?.data?.message || 'Unable to save this feedback.'}<div>`
        });
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.cc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
@media (max-width: 760px) { .cc-grid { grid-template-columns: minmax(0, 1fr); } }
.cc-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; padding: 10px 12px; border-radius: 10px; background: #F6F9FC; font-size: 12.5px; color: #6B7A99; }
.cc-note .q-icon { margin-top: 2px; color: #8493AC; }
.cc-fill :deep(.cc-textarea) { display: flex; }
.cc-fill :deep(.cc-textarea .q-field__control) { height: auto; }
.cc-fill :deep(.cc-textarea textarea) { min-height: 280px; resize: vertical; padding: 12px 14px; }

.cc-state--ok { color: #1C8A3B; }
.cc-state--bad { color: #C0392B; }

.cc-thumb { position: relative; aspect-ratio: 4 / 3; border: 1px solid #E6ECF5; border-radius: 12px; overflow: hidden; background: #F6F9FC; }
.cc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cc-thumb-pdf { height: 100%; display: flex; align-items: center; justify-content: center; }
.cc-thumb-x { position: absolute; top: 6px; right: 6px; }
.cc-thumb--gone img { opacity: .35; filter: grayscale(1); }
.cc-thumb-flag { position: absolute; left: 6px; bottom: 6px; padding: 2px 8px; border-radius: 8px; background: rgba(179, 18, 31, .88); color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }

.cc-checks { display: flex; flex-direction: column; gap: 8px; }
.cc-check { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid #E6ECF5; border-radius: 10px; background: #fff; text-align: left; font: inherit; cursor: pointer; transition: border-color .15s; }
.cc-check:hover { border-color: var(--q-primary); }
.cc-check > .q-icon { margin-top: 1px; }
.cc-check-t { display: block; font-size: 13px; font-weight: 700; color: #16233A; }
.cc-check-d { display: block; margin-top: 1px; font-size: 12px; color: #6B7A99; word-break: break-word; }
.cc-check--ok > .q-icon { color: #1C8A3B; }
.cc-check--bad { border-color: #F3CFD2; background: #FFF8F8; }
.cc-check--bad > .q-icon { color: #C0392B; }
.cc-check--opt > .q-icon { color: #A9B4C7; }
</style>
