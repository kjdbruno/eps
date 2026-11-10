<template>
    <q-dialog persistent :model-value="modelValue" class="dialog dialog--wide" @update:model-value="v => emit('update:modelValue', v)" @before-show="emit('before-show')">
        <q-card>
            <q-card-section class="row items-center no-wrap">
                <div>
                    <div class="text-caption">{{ eyebrow }}</div>
                    <div class="text-h5 text-uppercase">{{ title }}</div>
                    <div class="rc-hero-badges">
                        <span v-for="p in pills" :key="p.label" class="rc-hero-pill" :class="{ 'rc-hero-pill--on': p.on }">{{ p.label }}</span>
                    </div>
                </div>
                <q-space />
                <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
            </q-card-section>

            <q-card-section class="col rc-split">
                <!-- the pages: while creating, one opens only when the ones before it are complete -->
                <aside class="rc-side">
                    <template v-for="(n, i) in pages" :key="n.key">
                        <div v-if="i === 0" class="rc-side-title">{{ isEdit ? 'Editing' : 'Creating' }}</div>
                        <button
                            type="button" class="rc-side-item" :class="{ 'rc-side-item--on': page === n.key, 'rc-side-item--locked': !n.open }"
                            :disabled="!n.open" @click="emit('go', n.key)"
                        >
                            <q-icon :name="n.icon" />
                            <span>{{ n.label }}</span>
                            <q-icon v-if="!n.open" name="bi-lock-fill" size="12px" class="pd-state" />
                            <q-icon v-else-if="n.state === 'bad'" name="bi-exclamation-circle-fill" size="14px" class="pd-state pd-state--bad" />
                            <q-icon v-else-if="n.state === 'ok'" name="bi-check-circle-fill" size="14px" class="pd-state pd-state--ok" />
                        </button>
                    </template>
                    <!-- what sits at the bottom of the pages: Stop modifying, while an existing record is being changed -->
                    <div v-if="$slots['side-foot']" class="rc-side-foot"><slot name="side-foot" /></div>
                </aside>

                <div class="rc-main">
                    <div class="rc-page rc-page--form">
                        <div class="rc-pg-head">
                            <div class="wz-action" :style="{ '--wz-bg': info.bg, '--wz-fg': info.fg }">
                                <div class="wz-action-icon"><q-icon :name="info.icon" size="24px" /></div>
                                <div class="col" style="min-width: 0;">
                                    <div class="wz-action-eyebrow">{{ isEdit ? 'editing' : 'step ' + (pageIndex + 1) + ' of ' + pages.length }}</div>
                                    <div class="wz-action-title">{{ info.title }}</div>
                                    <div class="wz-action-hint">{{ info.hint }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="rc-pg-main"><slot /></div>

                        <div class="rc-pg-foot">
                            <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" :disable="pageIndex === 0" @click="emit('step', -1)"><q-tooltip>Previous step</q-tooltip></q-btn>
                            <span v-if="lockHint" class="cc-foot-hint"><q-icon name="bi-lock" size="13px" /> Complete this step to open the next one</span>
                            <q-btn v-if="pageIndex < pages.length - 1" flat round size="sm" color="grey-8" icon="bi-arrow-right" @click="emit('step', 1)"><q-tooltip>Next step</q-tooltip></q-btn>
                        </div>

                        <!-- the rail: what is still missing, anything that acts on the record, and the button that saves -->
                        <div class="rc-pg-side">
                            <div class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <slot name="rail" />
                                        <!-- looking at an existing record: nothing to validate or save yet (see the readonly-rail slot) -->
                                        <slot v-if="readonly" name="readonly-rail" />
                                        <template v-else>
                                            <div class="rc-cap">{{ isEdit ? 'before you save' : 'before it can be created' }}<span class="rc-count">{{ checks.filter(c => c.ok).length }} / {{ checks.length }}</span></div>
                                            <ValidationCards :pages="pages" :checks="checks" :page="page" @go="key => emit('go', key)" />
                                        </template>
                                    </div>
                                    <div v-if="!readonly && problems.length" class="rc-problems">
                                        <div v-for="p in problems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        v-if="!readonly" no-caps unelevated color="primary" :icon="isEdit ? 'bi-check2' : 'bi-plus-circle'" :label="submitLabel"
                                        class="rc-send rc-reply-send" :disable="submitDisabled" :loading="loading" @click="emit('submit')"
                                    >
                                        <q-tooltip v-if="submitDisabled && submitHint">{{ submitHint }}</q-tooltip>
                                    </q-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>

            <q-inner-loading :showing="loading">
                <q-spinner-ios color="primary" size="md" />
            </q-inner-loading>
        </q-card>
    </q-dialog>
</template>

<script setup>
import ValidationCards from 'src/components/ValidationCards.vue';
import { computed } from 'vue';

// The shell of every Preference dialog (office, user, holiday): the wide modal with the side stepper, the page header,
// the page itself (default slot), the arrows between pages, and the right-hand panel with the checklist, an optional
// slot for whatever acts on the record (#rail) and the save button. It owns no data: the section passes in the
// pages, the checks and what to do on submit.
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    eyebrow: { type: String, default: '' },
    title: { type: String, default: '' },
    // [{ label, on }] shown in the header band
    pills: { type: Array, default: () => [] },
    // [{ key, icon, label, open, state: '' | 'ok' | 'bad' }]
    pages: { type: Array, default: () => [] },
    page: { type: String, default: '' },
    // { icon, bg, fg, title, hint } of the page being shown
    info: { type: Object, default: () => ({}) },
    // [{ key, page, required, ok, title, detail }]
    checks: { type: Array, default: () => [] },
    problems: { type: Array, default: () => [] },
    isEdit: { type: Boolean, default: false },
    // an existing record that is only being looked at: the panel on the right shows the readonly-rail slot instead of the checklist and the save button
    readonly: { type: Boolean, default: false },
    lockHint: { type: Boolean, default: false },
    submitLabel: { type: String, default: 'save' },
    submitDisabled: { type: Boolean, default: false },
    submitHint: { type: String, default: '' },
    loading: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'before-show', 'go', 'step', 'submit']);

const pageIndex = computed(() => Math.max(0, props.pages.findIndex(p => p.key === props.page)));
</script>

<style scoped>
.pd-state { color: #8493AC; }
.pd-state--ok { color: #1C8A3B; }
.pd-state--bad { color: #C0392B; }
</style>
