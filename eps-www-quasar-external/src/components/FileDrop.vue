<template>
    <div class="fd">
        <q-file
            ref="picker" :model-value="multiple ? files : (files[0] || null)" :multiple="multiple" :accept="accept" :max-files="multiple ? max : undefined"
            borderless dense style="display: none;" @update:model-value="onPicked" @rejected="onRejected"
        />
        <div
            class="fd-zone" :class="{ 'fd-zone--over': over, 'fd-zone--busy': loading || disable }" role="button" tabindex="0"
            @click="open" @keydown.enter.prevent="open" @keydown.space.prevent="open"
            @dragover.prevent="over = true" @dragleave.prevent="over = false" @drop.prevent="onDrop"
        >
            <q-spinner-ios v-if="loading" size="30px" color="primary" />
            <q-icon v-else :name="icon" size="34px" />
            <div class="fd-title">{{ title }}</div>
            <div class="fd-sub">or <span class="fd-link">browse your files</span><template v-if="hint"> &middot; {{ hint }}</template></div>
        </div>
        <div v-if="error" class="fd-error"><q-icon name="bi-exclamation-circle" size="13px" /> {{ error }}</div>
        <div v-if="showList && files.length" class="fd-files">
            <div v-for="(f, i) in files" :key="f.name + i" class="fd-file">
                <q-icon :name="isImage(f) ? 'bi-image' : 'bi-file-earmark-pdf'" size="20px" color="primary" />
                <div class="col" style="min-width: 0;">
                    <div class="fd-file-name">{{ f.name }}</div>
                    <div class="fd-file-size">{{ sizeLabel(f.size) }}</div>
                </div>
                <q-btn round flat dense size="sm" icon="bi-trash3" color="grey-7" @click="remove(i)"><q-tooltip>Remove</q-tooltip></q-btn>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// How every upload looks in the app: a dashed drop zone (drag files onto it, or press it to browse), and under it the files
// picked, each with its size and a remove button. One component so a photo, a PDF or a profile picture is added the same way.
//   v-model    the files picked: an array of File (also for a single one: it holds at most one)
//   multiple   several files, up to `max`; false = one file that replaces the last
//   accept     'image/*', 'image/*,application/pdf'...
//   showList   list the picked files under the zone (a profile photo shows its own preview instead)
//   loading    a spinner in the zone while the file goes up
// Files that are too many, or of a kind that is not accepted, are left out with a short message under the zone.
const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    multiple: { type: Boolean, default: true },
    max: { type: Number, default: 5 },
    accept: { type: String, default: 'image/*' },
    title: { type: String, default: 'Drag & drop photos here' },
    hint: { type: String, default: '' },
    icon: { type: String, default: 'bi-cloud-arrow-up' },
    showList: { type: Boolean, default: true },
    loading: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'picked']);

const picker = ref(null);
const over = ref(false);
const error = ref('');
const files = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : (props.modelValue ? [props.modelValue] : [])));

const isImage = (f) => String(f.type || '').startsWith('image/');
const sizeLabel = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const accepts = (f) => props.accept.split(',').map(a => a.trim()).filter(Boolean)
    .some(a => (a.endsWith('/*') ? String(f.type || '').startsWith(a.slice(0, -1)) : (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : f.type === a)));

const open = () => { if (!props.loading && !props.disable) picker.value?.pickFiles(); };

// the files that came in (from the browse dialog or a drop), added to the ones already there
const take = (incoming) => {
    error.value = '';
    const list = Array.from(incoming || []);
    const ok = list.filter(accepts);
    if (ok.length < list.length) error.value = 'Only ' + (props.accept.includes('pdf') ? 'photos and PDFs' : 'photos') + ' can be added here.';
    if (!ok.length) return;
    let next;
    if (props.multiple) {
        next = [...files.value, ...ok];
        if (next.length > props.max) { error.value = `Up to ${props.max} files only.`; next = next.slice(0, props.max); }
    } else {
        next = [ok[0]];
    }
    emit('update:modelValue', next);
    emit('picked', props.multiple ? next : next[0]);
};
const onPicked = (value) => take(Array.isArray(value) ? value.filter(f => !files.value.includes(f)) : (value ? [value] : []));
const onRejected = () => { error.value = 'That file could not be added.'; };
const onDrop = (event) => {
    over.value = false;
    if (props.loading || props.disable) return;
    take(event.dataTransfer?.files);
};
const remove = (i) => {
    const next = files.value.filter((_, idx) => idx !== i);
    emit('update:modelValue', next);
};
</script>

<style scoped>
.fd-zone { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 20px 16px; border: 2px dashed #C9D4E5; border-radius: 12px; background: #F6F9FC; color: #8493AC; text-align: center; cursor: pointer; transition: border-color .15s, background .15s, color .15s; outline: none; }
.fd-zone:hover, .fd-zone:focus-visible, .fd-zone--over { border-color: var(--q-primary); background: #E5EEFC; color: var(--q-primary); }
.fd-zone--busy { opacity: .7; cursor: progress; }
.fd-title { font-size: 13.5px; font-weight: 700; color: #16233A; }
.fd-sub { font-size: 12.5px; }
.fd-link { color: var(--q-primary); font-weight: 600; text-decoration: underline; }
.fd-error { margin-top: 6px; font-size: 12px; color: #C0392B; }
.fd-files { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.fd-file { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #E6ECF5; border-radius: 10px; background: #fff; }
.fd-file-name { font-size: 13px; font-weight: 600; color: #16233A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fd-file-size { font-size: 11.5px; color: #8493AC; }
</style>
