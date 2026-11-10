<template>
    <div class="ma">
        <div class="wz-title">{{ title }}</div>
        <div class="wz-sub">{{ sub }}</div>
        <div class="wz-types">
            <div
                v-for="a in actions" :key="a.key" class="wz-type" :class="{ 'wz-type--disabled': a.disabled }"
                role="button" :tabindex="a.disabled ? -1 : 0" @click="pick(a)" @keydown.enter.prevent="pick(a)"
            >
                <div class="wz-type-icon" :style="{ background: a.bg, color: a.color }"><q-icon :name="a.icon" size="20px" /></div>
                <div class="col">
                    <div class="wz-type-title">{{ a.label }}</div>
                    <div class="wz-type-hint">{{ a.disabled && a.disabledHint ? a.disabledHint : a.hint }}</div>
                </div>
            </div>
        </div>
        <div class="ma-more"><slot /></div>
    </div>
</template>

<script setup>
// What the Manage page of every dialog looks like (the Feedback desk's own Manage, copied): "What would you like to do with this...?",
// then a card for each thing that can be done, each with its icon, its name and a line on what it does. A card that cannot be used
// right now is greyed and says why. Pressing one emits 'pick' with its key.
//   actions  [{ key, label, hint, icon, bg, color, disabled, disabledHint }]
//   (slot)   anything to show under the cards (the sign-in details of an account)
const props = defineProps({
    title: { type: String, default: 'What would you like to do?' },
    sub: { type: String, default: 'Pick one. Nothing changes until you confirm it.' },
    actions: { type: Array, default: () => [] },
});
const emit = defineEmits(['pick']);
const pick = (a) => { if (!a.disabled) emit('pick', a.key); };
void props;
</script>

<style scoped>
.ma-more { margin-top: 20px; }
.ma-more:empty { display: none; }
.ma .wz-type:focus-visible { outline: 2px solid var(--q-primary); outline-offset: 2px; }
</style>
