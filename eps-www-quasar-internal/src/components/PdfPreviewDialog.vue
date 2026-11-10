<template>
    <!-- A print preview (CSM report, generated report PDF) in the standard dialog: the hero
         header, the PDF in the body (the viewer scrolls it), and no footer. Same component as the
         revapp apps' PdfPreviewDialog. -->
    <q-dialog :model-value="modelValue" class="dialog" @update:model-value="value => emit('update:modelValue', value)">
        <q-card>
            <q-card-section class="row items-center no-wrap">
                <div>
                    <div class="text-caption">{{ caption }}</div>
                    <div class="text-h5 text-uppercase">{{ title }}</div>
                </div>
                <q-space />
                <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
            </q-card-section>
            <div class="col scroll bg-accent pdp-body">
                <q-inner-loading :showing="loading && !src">
                    <q-spinner-oval size="lg" />
                </q-inner-loading>
                <iframe v-if="src" :src="src" class="pdp-frame" />
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
defineProps({
    modelValue: { type: Boolean, default: false },
    // blob URL of the PDF
    src: { type: String, default: null },
    caption: { type: String, default: '' },
    title: { type: String, default: 'print preview' },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
.pdp-body { position: relative; overflow: hidden; }
.pdp-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
</style>
