<template>
    <div class="vc">
        <section
            v-for="p in cards" :key="p.key" class="vc-card"
            :class="{ 'vc-card--on': p.key === page, 'vc-card--bad': p.missing > 0, 'vc-card--ok': !p.missing && p.done === p.rules.length }"
        >
            <button type="button" class="vc-head" @click="emit('go', p.key)">
                <q-icon :name="p.icon" size="16px" class="vc-ico" />
                <span class="vc-title">{{ p.label }}</span>
                <span class="vc-count">{{ p.done }} / {{ p.rules.length }}</span>
                <q-icon v-if="p.locked" name="bi-lock-fill" size="12px" class="vc-lock" />
                <q-icon v-else-if="p.missing" name="bi-x-circle-fill" size="15px" class="vc-state vc-state--bad" />
                <q-icon v-else-if="p.done === p.rules.length" name="bi-check-circle-fill" size="15px" class="vc-state vc-state--ok" />
                <q-icon v-else name="bi-dash-circle" size="15px" class="vc-state" />
            </button>
            <button
                v-for="c in p.rules" :key="c.key" type="button" class="vc-rule"
                :class="c.ok ? 'vc-rule--ok' : (c.required ? 'vc-rule--bad' : 'vc-rule--opt')" @click="emit('go', p.key)"
            >
                <q-icon :name="c.ok ? 'bi-check-circle-fill' : (c.required ? 'bi-x-circle-fill' : 'bi-dash-circle')" size="16px" />
                <span class="col">
                    <span class="vc-rule-t">{{ c.title }}</span>
                    <span class="vc-rule-d">{{ c.detail }}</span>
                </span>
            </button>
        </section>
    </div>
</template>

<script setup>
import { computed } from 'vue';

// The checklist on the right of a dialog that goes page by page: ONE CARD PER PAGE, and inside each card the rules that page
// has to meet. The page being shown is outlined, a page with a rule still missing is red, a page whose rules are all met is
// green. Pressing a card or a rule goes to that page. Pages with no rules (the review) get no card.
//   pages  [{ key, label, icon, open }]            the pages, in order
//   checks [{ key, page, required, ok, title, detail }]
//   page   the page being shown
const props = defineProps({
    pages: { type: Array, default: () => [] },
    checks: { type: Array, default: () => [] },
    page: { type: String, default: '' },
});
const emit = defineEmits(['go']);

const cards = computed(() => props.pages
    .map(p => {
        const rules = props.checks.filter(c => c.page === p.key);
        return {
            key: p.key,
            label: p.label,
            icon: p.icon || 'bi-circle',
            locked: p.open === false,
            rules,
            done: rules.filter(c => c.ok).length,
            missing: rules.filter(c => c.required && !c.ok).length,
        };
    })
    .filter(p => p.rules.length));
</script>

<style scoped>
.vc { display: flex; flex-direction: column; gap: 10px; }
.vc-card { border: 1px solid #E6ECF5; border-radius: 12px; background: #fff; overflow: hidden; }
.vc-card--on { border-color: var(--q-primary); box-shadow: 0 0 0 1px var(--q-primary) inset; }
.vc-card--bad:not(.vc-card--on) { border-color: #F3CFD2; }
.vc-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; border: 0; background: #F6F9FC; font: inherit; text-align: left; cursor: pointer; }
.vc-card--bad .vc-head { background: #FFF3F3; }
.vc-card--ok .vc-head { background: #F1FAF4; }
.vc-ico { color: #4C5C79; }
.vc-title { flex: 1; font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: #16233A; }
.vc-count { font-size: 11px; font-weight: 700; color: #6B7A99; }
.vc-lock { color: #8493AC; }
.vc-state { color: #A9B4C7; }
.vc-state--ok { color: #1C8A3B; }
.vc-state--bad { color: #C0392B; }
.vc-rule { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 8px 12px; border: 0; border-top: 1px solid #EEF2F8; background: #fff; text-align: left; font: inherit; cursor: pointer; }
.vc-rule:hover { background: #F8FAFD; }
.vc-rule > .q-icon { margin-top: 1px; }
.vc-rule-t { display: block; font-size: 13px; font-weight: 700; color: #16233A; }
.vc-rule-d { display: block; margin-top: 1px; font-size: 12px; color: #6B7A99; word-break: break-word; }
.vc-rule--ok > .q-icon { color: #1C8A3B; }
.vc-rule--bad > .q-icon { color: #C0392B; }
.vc-rule--bad { background: #FFF8F8; }
.vc-rule--opt > .q-icon { color: #A9B4C7; }
</style>
