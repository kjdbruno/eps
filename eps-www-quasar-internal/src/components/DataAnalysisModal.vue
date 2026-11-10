<template>
    <q-dialog
        :model-value="modelValue"
        class="dialog"
        @update:model-value="$emit('update:modelValue', $event)"
        @show="onShow"
    >
        <q-card>
            <q-card-section class="row items-center no-wrap">
                <div>
                    <div class="text-caption">data analysis &middot; ai recommendations</div>
                    <div class="text-h5 text-uppercase">Analyze Data</div>
                    <div class="rc-hero-badges">
                        <template v-if="result?.range?.label">
                            <span class="rc-hero-pill">{{ result.range.label }}</span>
                            <span class="rc-hero-pill" v-if="result.generatedAt">generated {{ formatWhen(result.generatedAt) }}</span>
                        </template>
                        <span class="rc-hero-pill" v-else>{{ periodLabel }} &middot; {{ year }}</span>
                    </div>
                </div>
                <q-space />
                <q-btn
                    v-if="result && !loading"
                    outline no-caps rounded size="sm" icon="bi-arrow-clockwise" label="re-run"
                    class="q-mr-sm" @click="run"
                />
                <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
            </q-card-section>

            <q-card-section class="col scroll bg-accent">
                <!-- loading -->
                <div v-if="loading" class="rc-block column items-center justify-center q-pa-xl text-grey">
                    <q-spinner-ios size="2.5em" color="primary" />
                    <div class="text-subtitle2 q-mt-md">Analyzing {{ periodLabel.toLowerCase() }} data for {{ year }}…</div>
                    <div class="text-caption q-mt-xs">Reviewing feedback, CSM reports, and engagement across every office.</div>
                </div>

                <!-- error -->
                <div v-else-if="error" class="rc-block column items-center justify-center q-pa-xl text-center">
                    <q-icon name="bi-exclamation-triangle" size="2.5em" color="negative" />
                    <div class="text-subtitle2 q-mt-md text-negative">{{ error }}</div>
                    <q-btn no-caps rounded unelevated color="primary" label="try again" class="q-mt-md" @click="run" />
                </div>

                <!-- result -->
                <template v-else-if="result">
                    <!-- city -->
                    <div class="rc-block">
                        <div class="da-section-title">
                            <q-icon name="bi-buildings" size="1.1em" class="q-mr-sm" />
                            City-Wide
                        </div>
                        <div class="da-headline" v-if="result.city?.headline">{{ result.city.headline }}</div>
                        <div
                            v-for="(rec, i) in (result.city?.recommendations || [])" :key="'c' + i"
                            class="da-rec"
                        >
                            <div class="da-rec-head">
                                <span class="da-priority" :class="'da-priority--' + (rec.priority || 'medium')">{{ rec.priority || 'medium' }}</span>
                                <span class="da-area">{{ rec.area }}</span>
                            </div>
                            <div class="da-rec-body">{{ rec.recommendation }}</div>
                            <div class="da-rec-why" v-if="rec.rationale">
                                <q-icon name="bi-bar-chart-line" size="xs" class="q-mr-xs" />{{ rec.rationale }}
                            </div>
                        </div>
                        <div class="text-caption text-grey" v-if="!(result.city?.recommendations || []).length">
                            No city-wide recommendations for this window.
                        </div>
                    </div>


                    <!-- per office -->
                    <div class="rc-block">
                        <div class="da-section-title">
                            <q-icon name="bi-diagram-3" size="1.1em" class="q-mr-sm" />
                            Per Office
                            <span class="text-caption text-grey q-ml-sm">{{ (result.offices || []).length }} flagged</span>
                        </div>
                        <div class="text-caption text-grey q-mb-md" v-if="!(result.offices || []).length">
                            Nothing stood out per-office for this window — the city-wide notes above cover it.
                        </div>
                        <q-expansion-item
                            v-for="(off, i) in (result.offices || [])" :key="'o' + i"
                            :default-opened="i === 0"
                            class="da-office"
                            header-class="da-office-header"
                        >
                            <template v-slot:header>
                                <div class="col">
                                    <div class="text-weight-bold text-uppercase">{{ off.office }}</div>
                                    <div class="text-caption text-grey">{{ off.assessment }}</div>
                                </div>
                                <q-badge
                                    v-if="topPriority(off)"
                                    :class="'da-priority da-priority--' + topPriority(off)"
                                    class="q-ml-sm self-center"
                                >{{ topPriority(off) }}</q-badge>
                            </template>
                            <div class="q-pa-md q-pt-none">
                                <div
                                    v-for="(rec, j) in (off.recommendations || [])" :key="'or' + j"
                                    class="da-rec"
                                >
                                    <div class="da-rec-head">
                                        <span class="da-priority" :class="'da-priority--' + (rec.priority || 'medium')">{{ rec.priority || 'medium' }}</span>
                                        <span class="da-area">{{ rec.area }}</span>
                                    </div>
                                    <div class="da-rec-body">{{ rec.recommendation }}</div>
                                    <div class="da-rec-why" v-if="rec.rationale">
                                        <q-icon name="bi-bar-chart-line" size="xs" class="q-mr-xs" />{{ rec.rationale }}
                                    </div>
                                </div>
                            </div>
                        </q-expansion-item>
                    </div>


                    <!-- data reviewed -->
                    <div class="rc-block">
                        <q-expansion-item
                            icon="bi-table"
                            label="Data reviewed"
                            caption="The figures this analysis was based on"
                            header-class="text-caption text-uppercase text-grey"
                        >
                            <pre class="da-data">{{ prettyData }}</pre>
                        </q-expansion-item>
                    </div>

                    <div class="da-disclaimer">
                        <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                        AI-generated from this window's figures only. Treat it as a starting point for review, not a directive.
                    </div>
                </template>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    period: { type: String, default: 'year' },   // 'week' | 'month' | 'year'
    year: { type: Number, default: () => new Date().getFullYear() },
});
defineEmits(['update:modelValue']);

const loading = ref(false);
const error = ref('');
const result = ref(null);
// Remember what period/year the current result was for, so re-opening with the same selection
// doesn't pointlessly re-hit the model, but changing the Home period/year does.
const resultKey = ref('');

const periodLabel = computed(() => ({ week: 'Week', month: 'Month', year: 'Year' }[props.period] || 'Year'));
const prettyData = computed(() => result.value?.dataSummary ? JSON.stringify(result.value.dataSummary, null, 2) : '');

const formatWhen = (t) => moment(t).fromNow();

const topPriority = (off) => {
    const order = { high: 3, medium: 2, low: 1 };
    return (off.recommendations || [])
        .map(r => r.priority)
        .sort((a, b) => (order[b] || 0) - (order[a] || 0))[0] || null;
};

const run = async () => {
    loading.value = true;
    error.value = '';
    try {
        const { data } = await api.get('/report/prescriptions', {
            params: { period: props.period, year: props.year },
        });
        result.value = data;
        resultKey.value = `${props.period}:${props.year}`;
    } catch (e) {
        console.error('Data analysis failed:', e);
        error.value = e.response?.data?.message || 'Could not run the analysis right now. Please try again.';
        result.value = null;
    } finally {
        loading.value = false;
    }
};

const onShow = () => {
    // Re-run only when there's nothing to show yet or the Home selection changed since last time.
    if (!result.value || resultKey.value !== `${props.period}:${props.year}`) run();
};
</script>

<style scoped>
.da-section-title {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1E3A5F;
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}
.da-headline {
    font-size: 14px;
    line-height: 1.6;
    color: #33415A;
    background: #F3F6FA;
    border-left: 4px solid var(--q-primary);
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 14px;
}
.da-rec {
    border: 1px solid #E4ECF6;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
}
.da-rec-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}
.da-area {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
    color: #46577A;
}
.da-rec-body {
    font-size: 13px;
    line-height: 1.55;
    color: #1E3A5F;
}
.da-rec-why {
    font-size: 11.5px;
    color: #6B7F9B;
    margin-top: 6px;
    line-height: 1.5;
}
.da-priority {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 999px;
}
.da-priority--high {
    background: #FBEAEA;
    color: #A6383A;
}
.da-priority--medium {
    background: #FFF3DC;
    color: #96631A;
}
.da-priority--low {
    background: #E9F2FB;
    color: #2C5B87;
}
.da-office {
    border: 1px solid #E4ECF6;
    border-radius: 8px;
    margin-bottom: 8px;
    overflow: hidden;
}
:deep(.da-office-header) {
    padding: 12px 14px;
}
.da-data {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #46577A;
    background: #F3F6FA;
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 320px;
    overflow-y: auto;
}
.da-disclaimer {
    font-size: 11px;
    color: #8493AC;
}
</style>
