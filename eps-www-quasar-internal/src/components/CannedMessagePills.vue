<template>
    <div v-if="items.length" class="cm">
        <div class="rc-cap">quick messages <span class="text-lowercase">&middot; tap to use</span></div>
        <div class="rc-codes">
            <button
                v-for="m in items" :key="m.id" type="button" class="rc-codepill rc-codepill--text"
                :class="{ 'rc-codepill--on': isOn(m) }" @click="emit('pick', m)"
            >
                <q-icon v-if="isOn(m)" name="bi-check-lg" size="13px" />
                <span>{{ m.title }}</span>
                <q-tooltip max-width="320px">{{ m.text }}</q-tooltip>
            </button>
        </div>
    </div>
</template>

<script setup>
// The canned messages (Preference > Canned messages) as pills above a reply box. A pill is lit while its message is in the
// box; the parent decides what picking one does to the text (see withCanned in ComplaintPage.vue).
//   items    [{ id, title, text }]  the text already has the office filled in
//   current  what is in the box now
const props = defineProps({
    items: { type: Array, default: () => [] },
    current: { type: String, default: '' },
});
const emit = defineEmits(['pick']);

const isOn = (m) => !!m.text && (props.current || '').includes(m.text);
</script>

<style scoped>
.cm { margin-bottom: 12px; }
</style>
