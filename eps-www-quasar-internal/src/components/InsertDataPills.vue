<template>
    <div v-if="items.length" class="cm">
        <div class="rc-cap">insert <span class="text-lowercase">&middot; tap to add at the cursor</span></div>
        <div class="rc-codes">
            <button v-for="m in items" :key="m.key" type="button" class="rc-codepill rc-codepill--text" @click="emit('pick', m.value)">
                <span>{{ m.label }}</span>
                <q-tooltip max-width="320px">{{ m.value }}</q-tooltip>
            </button>
        </div>
    </div>
</template>

<script setup>
// The feedback's own data (the citizen's first name, the reference number, the deadline...) as pills above a reply box: picking
// one puts its value in the message where the cursor is (see insertAtCursor in ComplaintPage.vue).
//   items  [{ key, label, value }]  only those that have a value
defineProps({ items: { type: Array, default: () => [] } });
const emit = defineEmits(['pick']);
</script>
