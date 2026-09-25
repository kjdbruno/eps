<template>
    <div class="cc-shell">
    <div class="cc-body">
        <div class="text-caption text-grey q-mb-md">
            <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
            <template v-if="isEdit">
                Editing staff-filed feedback. Content, citizen info, and evidence can all be corrected here —
                changing the citizen's email/contact updates their account, which may be shared with other feedback.
            </template>
            <template v-else>
                For a walk-in or phone report. Filed this way, the feedback skips citizen OTP verification
                (you're vouching for it directly) and goes straight to auto-assignment.
            </template>
        </div>

        <div class="row q-col-gutter-xs q-mb-md">
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">firstname</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="firstname" label="Enter Firstname" :error="FormErrors.firstname.type" no-error-icon />
            </div>
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">lastname</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="lastname" label="Enter Lastname" :error="FormErrors.lastname.type" no-error-icon />
            </div>
        </div>
        <div class="row q-col-gutter-xs">
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">email</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                </div>
                <q-input outlined v-model="email" label="Enter Email" :error="FormErrors.email.type" no-error-icon />
                <div class="text-caption text-grey q-mt-xs" v-if="email && !isEdit">
                    <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                    Progress updates go to this email. The citizen can link this feedback to their account later using its reference number.
                </div>
            </div>
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">contact no.</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">optional</span>
                </div>
                <q-input outlined v-model="contactNo" label="Enter Contact No." :error="FormErrors.contactNo.type" no-error-icon />
            </div>
        </div>

        <q-separator class="q-my-lg" />

        <div class="q-mb-md">
            <div class="row q-mb-xs">
                <span class="text-caption text-uppercase text-grey">summary of feedback</span>
                <q-space />
                <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
            </div>
            <q-input outlined v-model="complaintContent" label="Enter Feedback" type="textarea" :error="FormErrors.complaint.type" no-error-icon />
            <div class="text-caption text-grey q-mt-xs" v-if="!isEdit">
                <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                This will be routed to the right department automatically based on what's described here.
            </div>
        </div>

        <div class="row q-col-gutter-sm">
            <div class="col-12" v-if="isEdit && existingFiles.length">
                <div class="text-caption text-uppercase text-grey q-mb-xs">current evidence</div>
                <div class="row q-gutter-sm q-mb-md">
                    <div v-for="f in existingFiles" :key="f.id" class="cc-evidence-thumb-wrap">
                        <q-img v-if="!isPdf(f)" :src="f.file" class="cc-evidence-thumb radius-xs" fit="cover" />
                        <div v-else class="cc-evidence-thumb cc-evidence-thumb--pdf radius-xs">
                            <q-icon name="bi-file-earmark-pdf" size="24px" color="primary" />
                        </div>
                        <q-btn
                            round dense flat icon="bi-x-circle-fill" size="sm" color="negative"
                            class="cc-evidence-remove"
                            @click="toggleRemoveFile(f.id)"
                        >
                            <q-tooltip>Remove</q-tooltip>
                        </q-btn>
                        <div v-if="removedFileIds.includes(f.id)" class="cc-evidence-removed-overlay">removed</div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6">
                <div class="row q-mb-xs">
                    <span class="text-caption text-uppercase text-grey">{{ isEdit ? 'add evidence' : 'evidence' }}</span>
                    <q-space />
                    <span class="text-caption text-uppercase text-grey q-mr-lg">optional</span>
                </div>
                <q-file outlined v-model="file" counter use-chips :counter-label="counterLabelFn" max-files="5" accept="image/*" multiple label="Upload Evidence (up to 5 photos)">
                    <template v-slot:prepend>
                        <q-icon name="bi-paperclip" />
                    </template>
                </q-file>
            </div>
        </div>
    </div>

    <div class="cc-footer row justify-start">
        <q-btn no-caps rounded unelevated color="primary" :label="isEdit ? 'save changes' : 'file feedback'" :loading="loading" @click="submit" />
    </div>

    <q-inner-loading :showing="loading">
        <q-spinner-ios color="primary" size="md" />
        <div class="text-caption text-uppercase text-grey">we're working on it</div>
    </q-inner-loading>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { api } from 'src/boot/axios';
import { Toast } from 'src/boot/sweetalert';

// When `complaint` is passed, the component runs in edit mode: pre-filled from it, submitting a
// PATCH instead of a POST. Only ever passed a complaint with via === 'staff' — see the "Edit"
// button's own v-if on ComplaintPage.vue.
const props = defineProps({
    complaint: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.complaint);
const existingUser = computed(() => props.complaint?.complaintDetail?.user || null);
const existingFiles = computed(() => props.complaint?.complaintFiles || []);

const firstname = ref(existingUser.value?.firstname || '');
const lastname = ref(existingUser.value?.lastname || '');
const email = ref(existingUser.value?.citizen?.email || '');
const contactNo = ref(existingUser.value?.citizen?.phoneNo || '');
const complaintContent = ref(props.complaint?.content || '');
const file = ref([]);
const loading = ref(false);
const removedFileIds = ref([]);

const isPdf = (f) => f?.file?.startsWith('data:application/pdf') || /\.pdf$/i.test(f?.filename || '');
const toggleRemoveFile = (id) => {
    const idx = removedFileIds.value.indexOf(id);
    if (idx >= 0) removedFileIds.value.splice(idx, 1);
    else removedFileIds.value.push(id);
};

const FormErrors = reactive({
    firstname: { type: null, msg: '' },
    lastname: { type: null, msg: '' },
    email: { type: null, msg: '' },
    contactNo: { type: null, msg: '' },
    complaint: { type: null, msg: '' },
});

const validate = () => {
    let isError = false;
    Object.keys(FormErrors).forEach(key => { FormErrors[key] = { type: null, msg: '' }; });

    if (!firstname.value) {
        FormErrors.firstname = { type: true, msg: 'Firstname is required.' };
        isError = true;
    }
    if (!lastname.value) {
        FormErrors.lastname = { type: true, msg: 'Lastname is required.' };
        isError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value) {
        FormErrors.email = { type: true, msg: 'Email is required.' };
        isError = true;
    } else if (!emailRegex.test(email.value)) {
        FormErrors.email = { type: true, msg: 'Invalid email format.' };
        isError = true;
    }

    if (contactNo.value) {
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(contactNo.value)) {
            FormErrors.contactNo = { type: true, msg: 'Invalid contact no. format.' };
            isError = true;
        }
    }

    if (!complaintContent.value) {
        FormErrors.complaint = { type: true, msg: 'Feedback content is required.' };
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
        form.append('firstname', firstname.value);
        form.append('lastname', lastname.value);
        form.append('email', email.value);
        form.append('contactNo', contactNo.value);
        form.append('content', complaintContent.value);
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

        Toast.fire({
            icon: "success",
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
/* Fills whatever height the dialog's own q-card-section gives it (see ComplaintPage.vue's
   create/edit-complaint dialogs, both non-scrolling flex containers) — the form scrolls on its
   own in the middle, and the submit button stays pinned to the bottom of the modal regardless
   of how long the form is, instead of scrolling away with the fields. */
.cc-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.cc-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.cc-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
.cc-evidence-thumb-wrap {
    position: relative;
    width: 84px;
    height: 84px;
}
.cc-evidence-thumb {
    width: 84px;
    height: 84px;
}
.cc-evidence-thumb--pdf {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
}
.cc-evidence-remove {
    position: absolute;
    top: -8px;
    right: -8px;
    background: white;
}
.cc-evidence-removed-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: .04em;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}
</style>
