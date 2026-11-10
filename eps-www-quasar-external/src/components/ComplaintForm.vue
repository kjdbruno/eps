<template>
    <div class="cf">
        <!-- ===== who is reporting: always the signed-in citizen; "file anonymously" hides only the person ===== -->
        <section class="cf-sec">
            <label class="cf-anon" :class="{ 'cf-anon--on': isAnonymously }">
                <span class="cf-anon-ico"><q-icon name="bi-incognito" /></span>
                <span class="cf-anon-t">
                    <b>File anonymously</b>
                    <small>Hides only you: your name is not shown to the offices or the staff. What happened, where, and your photos are handled as usual, and you can still follow it from My feedback.</small>
                    <small class="text-grey-6">I-check ang box kung ayaw magpakilala sa reklamo.</small>
                </span>
                <q-toggle v-model="isAnonymously" color="primary" />
            </label>
        </section>

        <!-- ===== what happened ===== -->
        <section class="cf-sec">
            <div class="cf-sec-h"><span>1</span>What happened</div>
            <div class="cf-field">
                <div class="cf-label" :class="{ 'cf-label--err': FormErrors.complaint.type }">Summary of your feedback <i>required</i></div>
                <q-input
                    outlined v-model="complaint" type="textarea" rows="5" counter maxlength="2000"
                    placeholder="Tell us what is wrong, where, and since when..."
                    :error="FormErrors.complaint.type" no-error-icon
                />
            </div>
            <div class="cf-hint">
                <q-icon name="bi-signpost-split" size="18px" />
                <span>No category to pick — we read what you write and send it to the right department automatically.</span>
            </div>
        </section>

        <!-- ===== where ===== -->
        <section class="cf-sec">
            <div class="cf-sec-h"><span>2</span>Where</div>
            <!-- Grabbed automatically as soon as this form loads (see captureLocation/onMounted) — no
                 button to tap first. Only a denied/failed permission needs a manual retry. -->
            <div class="cf-loc" v-if="locationStatus === 'loading'">
                <q-spinner-ios size="1.4em" color="primary" />
                <div><b>Getting your location&hellip;</b><small>Please allow location access when your browser asks.</small></div>
            </div>
            <div class="cf-loc cf-loc--ok" v-else-if="locationStatus === 'granted'">
                <q-icon name="bi-geo-alt-fill" size="1.4em" />
                <div><b>Location captured</b><small>It is attached to your feedback so the office can find the place.</small></div>
            </div>
            <div class="cf-loc cf-loc--bad" v-else>
                <q-icon name="bi-exclamation-triangle-fill" size="1.4em" />
                <div><b>Location access is required</b><small>Please allow it in your browser, then try again.</small></div>
                <q-btn unelevated rounded no-caps size="sm" color="primary" label="Try again" @click="captureLocation" />
            </div>
        </section>

        <!-- ===== evidence ===== -->
        <section class="cf-sec">
            <div class="cf-sec-h"><span>3</span>Evidence <em>optional</em></div>
            <FileDrop v-model="file" :max="5" hint="up to 5 photos" />
        </section>

        <!-- Modal contexts (ComplaintPage.vue's "file feedback" dialog) hide this and put their own
             submit button in the pinned footer instead, calling submit() via a template ref — see
             hideSubmit. a page that is not a modal keeps this in-flow button. -->
        <q-btn v-if="!hideSubmit" class="full-width q-mt-lg" unelevated rounded no-caps color="primary" size="lg" icon-right="bi-send" label="Submit feedback" @click="submit" />

        <q-inner-loading :showing="loading">
            <q-spinner-ios color="primary" size="md"/>
            <div class="text-caption text-uppercase text-grey">we're working on it</div>
        </q-inner-loading>
    </div>
</template>

<script setup>
import FileDrop from 'src/components/FileDrop.vue';
import { ref, reactive, onMounted } from 'vue';
import { api } from 'src/boot/axios';

defineProps({
    hideSubmit: { type: Boolean, default: false },
});

const emit = defineEmits(['submitted']);

const isAnonymously = ref(false);
const complaint = ref('');
const file = ref([]);
const loading = ref(false);

const FormErrors = reactive({
    complaint: { type: null, msg: '' },
    location: { type: null, msg: '' },
});

/* -------------------- location (mandatory) -------------------- */
// Grabbed the moment this form mounts — no "use my location" button to tap first. The backend
// requires both latitude/longitude on every citizen-filed complaint (see
// ComplaintController.createAccountComplaint),
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
        // "File anonymously": the offices and staff do not see who filed it
        form.append('isAnonymous', isAnonymously.value);
        form.append('content', complaint.value);
        form.append('latitude', latitude.value);
        form.append('longitude', longitude.value);
        if (file.value && file.value.length > 0) {
            for (let i = 0; i < file.value.length; i++) {
                form.append('files', file.value[i]);
            }
        }

        const response = await api.post('/complaint/account', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        emit('submitted', { data: response.data });
    } catch (e) {
        console.error(e);
        emit('submitted', { error: e });
    } finally {
        loading.value = false;
    }
};

// So a parent using hideSubmit can drive this form from its own footer button (see
// ComplaintPage.vue's "file a complaint" dialog).
defineExpose({ submit, loading });
</script>

<style scoped>
.cf { position: relative; }
.cf-sec { margin-bottom: 26px; }
.cf-sec-h { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #4C5C79; }
.cf-sec-h > span { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--q-primary); color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; letter-spacing: 0; }
.cf-sec-h::after { content: ''; flex: 1; height: 1px; background: #E4EAF3; order: 1; }
.cf-sec-h em { order: 2; font-style: normal; font-weight: 600; letter-spacing: .04em; text-transform: none; color: #8493AC; }

.cf-grid { display: grid; gap: 14px 16px; grid-template-columns: 1fr; margin-top: 14px; }
@media (min-width: 600px) { .cf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cf-grid:first-of-type { margin-top: 14px; }
.cf-label { margin: 0 0 6px 4px; font-size: 12px; font-weight: 700; color: #4C5C79; }
.cf-label i { font-style: normal; font-weight: 500; color: #8493AC; margin-left: 6px; }
.cf-label--err { color: var(--q-negative); }
.cf-err { margin: 4px 0 0 6px; font-size: 11.5px; color: var(--q-negative); }

/* the anonymous switch: a whole tile you can tap */
.cf-anon { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #DCE4F0; border-radius: 14px; background: #F6F9FC; cursor: pointer; transition: border-color .15s, background .15s; }
.cf-anon--on { border-color: var(--q-primary); background: rgba(32, 72, 136, .06); }
.cf-anon-ico { flex: none; width: 42px; height: 42px; border-radius: 12px; background: #E5EEFC; color: var(--q-primary); display: flex; align-items: center; justify-content: center; font-size: 22px; }
.cf-anon-t { flex: 1; min-width: 0; }
.cf-anon-t b { display: block; font-size: 14px; color: #1E2A44; }
.cf-anon-t small { display: block; margin-top: 2px; font-size: 12px; line-height: 1.45; color: #6B7A99; }

.cf-hint { display: flex; gap: 10px; align-items: flex-start; margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #F2F6FD; border: 1px solid #DCE5F3; font-size: 12.5px; line-height: 1.5; color: #4C5C79; }
.cf-hint .q-icon { flex: none; margin-top: 1px; color: var(--q-primary); }

/* the location, as a status card */
.cf-loc { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: #F6F9FC; border: 1px solid #DCE4F0; color: #4C5C79; }
.cf-loc > div { flex: 1; min-width: 0; }
.cf-loc b { display: block; font-size: 13.5px; color: #1E2A44; }
.cf-loc small { display: block; margin-top: 2px; font-size: 12px; color: #6B7A99; }
.cf-loc--ok { background: #E4F6EA; border-color: #BFE6CC; color: #1C6B35; }
.cf-loc--bad { background: #FCE8E6; border-color: #F3C4BE; color: #A52E22; }

.cf-notice { border: 1px solid #E4EAF3; border-radius: 14px; overflow: hidden; background: #fff; }
.cf-notice :deep(.q-item) { font-size: 13px; font-weight: 600; color: #4C5C79; }
.cf-notice-b { padding: 0 16px 14px; }
</style>
