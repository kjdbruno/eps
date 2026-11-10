<template>
    <ManageActions :title="`What would you like to do with this ${what}?`" :actions="actions" @pick="pick">
        <slot />
    </ManageActions>
</template>

<script setup>
import { computed } from 'vue';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import ManageActions from 'src/components/ManageActions.vue';

// The Manage page of an existing record in a Preference dialog, in the same cards as the Feedback desk's Manage: Modify, and
// Disable or Enable. Looking at a record is read-only: the pages to change it (account, access, details...) only open once Modify is
// pressed. Switching it on or off asks first. More cards can be added (`extra`), and their key comes back as the 'action' event.
//   what        'account', 'office', 'holiday', 'message': what it is called in the sentences
//   isActive    whether it is switched on
//   modifyText  what Modify lets you change
//   extra       [{ key, label, hint, icon, bg, color, disabled, disabledHint }] more things to do with it
//   (slot)      more blocks under the cards (the sign-in details of an account)
const props = defineProps({
    what: { type: String, default: 'record' },
    isActive: { type: Boolean, default: true },
    modifyText: { type: String, default: 'Change its details. The pages to change them open once you press Modify.' },
    extra: { type: Array, default: () => [] },
});
const emit = defineEmits(['modify', 'disable', 'enable', 'action']);

const actions = computed(() => [
    {
        key: 'modify', label: `Modify the ${props.what}`, hint: props.modifyText, icon: 'bi-pencil-square', bg: '#E5EEFC', color: '#204888',
        disabled: !props.isActive, disabledHint: 'It is switched off: enable it first to change it.',
    },
    ...props.extra,
    props.isActive
        ? { key: 'disable', label: `Disable this ${props.what}`, hint: `Stop using it. It stays on file and can be switched on again.`, icon: 'bi-slash-circle', bg: '#FCE8E6', color: '#C0392B' }
        : { key: 'enable', label: `Enable this ${props.what}`, hint: `Use it again.`, icon: 'bi-check-circle', bg: '#E4F6EA', color: '#1C8A3B' },
]);

const pick = async (key) => {
    if (key === 'modify') return emit('modify');
    if (key === 'disable' || key === 'enable') {
        const on = key === 'enable';
        const result = await Swal.fire({
            title: 'Confirm',
            html: on ? `Enable this ${props.what}? It can be used again.` : `Disable this ${props.what}? It stops being used until it is enabled again.`,
            icon: on ? 'question' : 'warning', showCancelButton: true, confirmButtonText: 'confirm', cancelButtonText: 'cancel', reverseButtons: true,
        });
        if (result.isConfirmed) emit(key);
        return;
    }
    emit('action', key);
};
</script>
