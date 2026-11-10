<template>
    <q-input
        :model-value="modelValue" outlined :placeholder="placeholder" mask="####-##-##" :error="error" no-error-icon hide-bottom-space
        :clearable="clearable" :disable="disable" @update:model-value="v => emit('update:modelValue', v || '')"
    >
        <template #prepend><q-icon name="bi-calendar-event" size="18px" color="primary" /></template>
        <template #append>
            <q-icon name="bi-calendar3" class="cursor-pointer" size="18px">
                <q-popup-proxy ref="popup" cover transition-show="scale" transition-hide="scale" class="no-shadow radius-sm custom-border">
                    <q-date :model-value="modelValue" mask="YYYY-MM-DD" :options="options" @update:model-value="pick">
                        <div class="row items-center justify-end"><q-btn v-close-popup label="close" color="primary" flat /></div>
                    </q-date>
                </q-popup-proxy>
            </q-icon>
        </template>
    </q-input>
</template>

<script setup>
import { ref } from 'vue';

// A date typed or picked: an input (YYYY-MM-DD) with a calendar that opens from the icon, and closes on the day chosen.
//   v-model  'YYYY-MM-DD' ('' when nothing is picked)
//   options  (date 'YYYY/MM/DD') => boolean: the days that can be picked (q-date's own `options`)
defineProps({
    modelValue: { type: String, default: '' },
    options: { type: [Function, Array], default: undefined },
    placeholder: { type: String, default: 'YYYY-MM-DD' },
    error: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const popup = ref(null);
const pick = (value) => {
    emit('update:modelValue', value || '');
    popup.value?.hide();
};
</script>
