<template>
    <div>
        <div class="fp-shell">
            <div class="fp-main">
                <div class="row items-center justify-between q-mb-md fp-header">
                    <div>
                        <div class="fp-eyebrow">citizen CSM report &middot; operations overview<template v-if="analyticsScopeLabel"> &middot; {{ analyticsScopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="fp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="fp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="fp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="fp-period-btn" :class="analyticsPeriod === 'week' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="fp-period-btn" :class="analyticsPeriod === 'month' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="fp-period-btn" :class="analyticsPeriod === 'year' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="analyticsLoading" @click="loadAnalytics">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <div class="row q-col-gutter-sm q-mb-md">
                    <div class="col-6 col-sm-4 col-md-2">
                        <q-card flat class="fp-kpi radius-xs bg-primary">
                            <div class="fp-kpi-value text-white">{{ analyticsKpis.totalFeedback ?? 0 }}</div>
                            <div class="fp-kpi-label text-white">total CSM reports</div>
                        </q-card>
                    </div>
                    <div class="col-6 col-sm-4 col-md-2">
                        <q-card flat class="fp-kpi radius-xs bg-primary">
                            <div class="fp-kpi-value text-white">{{ analyticsKpis.avgSatisfaction != null ? analyticsKpis.avgSatisfaction + '%' : '—' }}</div>
                            <div class="fp-kpi-label text-white">avg. satisfaction</div>
                        </q-card>
                    </div>
                    <div class="col-6 col-sm-4 col-md-2">
                        <q-card flat class="fp-kpi radius-xs bg-primary">
                            <div class="fp-kpi-value text-white">{{ analyticsKpis.charterAwareRate != null ? analyticsKpis.charterAwareRate + '%' : '—' }}</div>
                            <div class="fp-kpi-label text-white">charter awareness</div>
                        </q-card>
                    </div>
                    <div class="col-6 col-sm-4 col-md-2">
                        <q-card flat class="fp-kpi radius-xs custom-border">
                            <div class="fp-kpi-value text-primary">{{ analyticsKpis.kioskCount ?? 0 }}</div>
                            <div class="fp-kpi-label text-grey">kiosk entries</div>
                        </q-card>
                    </div>
                    <div class="col-6 col-sm-4 col-md-2">
                        <q-card flat class="fp-kpi radius-xs custom-border">
                            <div class="fp-kpi-value text-primary">{{ analyticsKpis.manualCount ?? 0 }}</div>
                            <div class="fp-kpi-label text-grey">manual entries</div>
                        </q-card>
                    </div>
                </div>

                <div class="fp-panel-grid">
                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md fp-panel--wide">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">CSM reports filed per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">avg. rating by office</div>
                        <apexchart type="bar" height="240" :options="ratingByOfficeOptions" :series="ratingByOfficeSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">service quality dimensions</div>
                        <div class="text-caption text-grey q-mb-sm">SQD0-8, lower bars need attention first</div>
                        <apexchart type="bar" height="260" :options="sqdChartOptions" :series="sqdChartSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">by client type</div>
                        <apexchart type="pie" height="280" :options="clientTypeOptions" :series="clientTypeSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">by sex</div>
                        <apexchart type="pie" height="280" :options="sexOptions" :series="sexSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">by entry method</div>
                        <apexchart type="pie" height="280" :options="entryMethodOptions" :series="entryMethodSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">satisfaction distribution</div>
                        <div class="text-caption text-grey q-mb-sm">spread of ratings, not just the average</div>
                        <apexchart type="pie" height="280" :options="ratingDistributionOptions" :series="ratingDistributionSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">citizen's charter awareness</div>
                        <apexchart type="pie" height="280" :options="cc1Options" :series="cc1Series" />
                    </q-card>
                </div>
            </div>

            <div class="fp-rail">
                <q-card flat class="fp-rail-card">
                    <div class="fp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">offices</div>
                                <div class="text-caption text-grey">{{ filteredOffices.length }} of {{ offices.length }}</div>
                            </div>
                            <q-btn v-if="!isMonitoring" unelevated rounded no-caps size="sm" color="primary" label="add" class="fp-add-btn" @click="createFeedbackDialog = true">
                                <q-tooltip>File new CSM report</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense v-model="officeSearch" placeholder="Search office..." class="fp-search">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                    </div>
                    <q-separator />
                    <div class="fp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <div
                            v-for="o in filteredOffices" :key="o.id"
                            class="fp-list-item" :class="officeSeverity(o)"
                            @click="openOffice(o)"
                        >
                            <div class="row items-center justify-between no-wrap">
                                <div class="text-caption text-weight-bold text-uppercase">{{ o.alias }}</div>
                                <div class="text-caption text-grey">{{ o.totalFeedback }} rating{{ o.totalFeedback === 1 ? '' : 's' }}</div>
                            </div>
                            <div class="text-body2 q-mt-xs">{{ o.name }}</div>
                            <div class="row items-center q-mt-xs">
                                <span class="fp-pill" :style="{ background: pillColor(o).bg, color: pillColor(o).text }">
                                    {{ o.averageSqdPercentage != null ? o.averageSqdPercentage.toFixed(1) + '%' : 'no ratings' }}
                                </span>
                            </div>
                        </div>
                        <div v-if="loadingOffices" class="fp-list-empty">
                            <q-spinner-ios size="1.5em" />
                            <div class="text-caption text-uppercase q-mt-sm">loading offices...</div>
                        </div>
                        <div v-if="!loadingOffices && filteredOffices.length === 0" class="fp-list-empty">
                            <div class="text-caption text-uppercase">no offices found</div>
                        </div>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="fp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>

        <q-dialog v-model="officeDialog" full-height persistent>
            <q-card class="fp-modal column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding: 0;">
                    <FeedbackOfficeComponent v-if="officeDialog" class="col" />
                </q-card-section>
            </q-card>
        </q-dialog>

        <q-dialog v-model="createFeedbackDialog" full-height persistent>
            <q-card class="fp-modal column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding: 0;">
                    <CreateFeedbackComponent v-if="createFeedbackDialog" class="col" @close="createFeedbackDialog = false" @created="onFeedbackCreated" />
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { api } from 'src/boot/axios';
import { useFeedbackStore } from '../stores/feedback-store';
import { useAuthStore } from 'src/stores/auth-store';
import FeedbackOfficeComponent from '../components/FeedbackOfficeComponent.vue';
import CreateFeedbackComponent from '../components/CreateFeedbackComponent.vue';
import Apexchart from 'vue3-apexcharts';

const FeedbackStore = useFeedbackStore();
const AuthStore = useAuthStore();

// isSupervisor gates TRANSACTIONS — monitoring excluded on purpose. canViewAll gates
// system-wide READ-ONLY panels — monitoring gets the same visibility a supervisor has.
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const isMonitoring = computed(() => AuthStore.user?.role === 'monitoring');

/* -------------------- office rail -------------------- */

const offices = ref([]);
const loadingOffices = ref(false);
const officeSearch = ref('');

// Floating "back to top" for the office rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const filteredOffices = computed(() => {
    const term = officeSearch.value.trim().toLowerCase();
    if (!term) return offices.value;
    return offices.value.filter(o =>
        (o.alias || '').toLowerCase().includes(term) || (o.name || '').toLowerCase().includes(term)
    );
});

const loadOffices = async () => {
    loadingOffices.value = true;
    try {
        const { data } = await api.get('/feedback', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        offices.value = data.data || [];
    } catch (error) {
        console.error('Error loading offices:', error);
    } finally {
        loadingOffices.value = false;
    }
};

// Same 4-state severity language as the complaint rail — green/amber/red by rating threshold,
// grey for an office with nothing to rate yet this period.
const officeSeverity = (o) => {
    if (o.averageSqdPercentage == null) return 'sev-flat';
    if (o.averageSqdPercentage >= 85) return 'sev-good';
    if (o.averageSqdPercentage >= 70) return 'sev-warn';
    return 'sev-bad';
};
const pillColor = (o) => {
    const sev = officeSeverity(o);
    if (sev === 'sev-good') return { bg: '#E4F5E9', text: '#1C8A3B' };
    if (sev === 'sev-warn') return { bg: '#FBF1D9', text: '#9A6B00' };
    if (sev === 'sev-bad') return { bg: '#FBE6E8', text: '#B3121F' };
    return { bg: '#F6F9FC', text: '#8493AC' };
};

const officeDialog = ref(false);
const openOffice = (o) => {
    FeedbackStore.details = o;
    // Inherit whichever year is currently selected on the dashboard — the modal no longer has
    // its own year control, so it should show the same year you were just looking at.
    FeedbackStore.year = analyticsYear.value;
    officeDialog.value = true;
};

/* -------------------- create feedback -------------------- */

const createFeedbackDialog = ref(false);
const onFeedbackCreated = () => {
    createFeedbackDialog.value = false;
    loadOffices();
    loadAnalytics();
};

/* -------------------- system-wide analytics -------------------- */

const analyticsLoading = ref(false);
const analyticsPeriod = ref('year');
// Which year the dashboard looks at — defaults to the real current year; stepping back lets you
// browse a past year's data (see resolvePeriodRange on the backend for how this interacts with
// the week/month/year period buttons).
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
const analyticsScopeLabel = ref('');
// Matches the trend-bucketing convention in FeedbackController (and the same computed already
// used by DiscussionPage.vue/PollPage.vue): week -> daily buckets, month -> weekly, year ->
// monthly. Drives the "feedback filed per ___" chart title so it actually reflects what's
// plotted instead of always claiming "week".
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');
const analyticsKpis = ref({ totalFeedback: 0, avgSatisfaction: null, kioskCount: 0, manualCount: 0, charterAwareRate: null });

// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (5 distinct, repeated 3x below to match the array length every
// multi-item chart on this page/the office-detail modal/the complaint page expects), just
// randomized which color lands where. Multi-item charts (donuts) still pass the whole array —
// Apex assigns one color per slice positionally. nextChartColor() hands single-series charts one
// color each, in round-robin order through the shuffled set, so two single-series charts on this
// page never coincidentally land on the same color (this is also what replaced the earlier fixed
// CHART_PALETTE[1] pin on the SQD chart below — that was a one-off fix for a collision with
// ratingByOfficeOptions; this generalizes it to every chart, randomized, automatically).
const shuffleColors = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};
const SHUFFLED_COLORS = shuffleColors(['#68AFF1', '#DB812C', '#EEC336', '#004283', '#4CAF7D']);
const CHART_PALETTE = [...SHUFFLED_COLORS, ...SHUFFLED_COLORS, ...SHUFFLED_COLORS];
let _nextColorIdx = 0;
const nextChartColor = () => SHUFFLED_COLORS[_nextColorIdx++ % SHUFFLED_COLORS.length];

const volumeChartSeries = ref([{ name: 'CSM Report', data: [] }]);
const volumeChartOptions = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [nextChartColor()],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const ratingByOfficeSeries = ref([{ name: 'Avg. rating', data: [] }]);
const ratingByOfficeOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true, formatter: (v) => v + '%' },
    colors: [nextChartColor()],
    xaxis: { categories: [], max: 100 },
});

const sqdChartSeries = ref([{ name: 'Avg.', data: [] }]);
const sqdChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [], max: 5 },
});

const clientTypeSeries = ref([]);
const clientTypeOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const sexSeries = ref([]);
const sexOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const entryMethodSeries = ref([]);
const entryMethodOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

// Spread of ratings (needs improvement / fair / good / excellent) — an average alone can hide a
// bimodal split that this surfaces at a glance.
const ratingDistributionSeries = ref([]);
const ratingDistributionOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const cc1Series = ref([]);
const cc1Options = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const applyAnalyticsToCharts = (d) => {
    const volume = d.volumeTrend || [];
    volumeChartSeries.value = [{ name: 'CSM Report', data: volume.map(w => w.count) }];
    volumeChartOptions.value = {
        ...volumeChartOptions.value,
        xaxis: { ...volumeChartOptions.value.xaxis, categories: volume.map(w => w.label) }
    };

    const byOffice = d.ratingByOffice || [];
    ratingByOfficeSeries.value = [{ name: 'Avg. rating', data: byOffice.map(o => o.avgRating) }];
    ratingByOfficeOptions.value = {
        ...ratingByOfficeOptions.value,
        xaxis: { ...ratingByOfficeOptions.value.xaxis, categories: byOffice.map(o => o.label) }
    };

    const sqd = d.sqdAverages || [];
    sqdChartSeries.value = [{ name: 'Avg.', data: sqd.map(s => s.avg ?? 0) }];
    sqdChartOptions.value = {
        ...sqdChartOptions.value,
        xaxis: { ...sqdChartOptions.value.xaxis, categories: sqd.map(s => s.dimension) }
    };

    const clientType = d.clientTypeMix || [];
    clientTypeSeries.value = clientType.map(c => c.count);
    clientTypeOptions.value = { ...clientTypeOptions.value, labels: clientType.map(c => c.label) };

    const sex = d.sexMix || [];
    sexSeries.value = sex.map(s => s.count);
    sexOptions.value = { ...sexOptions.value, labels: sex.map(s => s.label) };

    const entryMethod = d.entryMethodMix || [];
    entryMethodSeries.value = entryMethod.map(e => e.count);
    entryMethodOptions.value = { ...entryMethodOptions.value, labels: entryMethod.map(e => e.label) };

    const ratingDistribution = d.ratingDistribution || [];
    ratingDistributionSeries.value = ratingDistribution.map(r => r.count);
    ratingDistributionOptions.value = { ...ratingDistributionOptions.value, labels: ratingDistribution.map(r => r.label) };

    const cc1 = d.cc1Mix || [];
    cc1Series.value = cc1.map(c => c.count);
    cc1Options.value = { ...cc1Options.value, labels: cc1.map(c => c.label) };
};

const loadAnalytics = async () => {
    analyticsLoading.value = true;
    try {
        const { data } = await api.get('/feedback/analytics', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        analyticsKpis.value = data.data.kpis || {};
        analyticsRangeLabel.value = data.data.range?.label || '';
        analyticsScopeLabel.value = data.data.scope?.label || '';
        applyAnalyticsToCharts(data.data);
    } catch (error) {
        console.error('Error loading feedback analytics:', error);
    } finally {
        analyticsLoading.value = false;
    }
};

const setAnalyticsPeriod = (period) => {
    if (analyticsPeriod.value === period) return;
    analyticsPeriod.value = period;
    loadAnalytics();
    loadOffices();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    loadAnalytics();
    loadOffices();
};

onMounted(() => {
    loadOffices();
    loadAnalytics();
});
</script>

<style scoped>
.fp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .fp-shell {
        grid-template-columns: 1fr;
    }
}
.fp-main {
    min-width: 0;
}
.fp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.fp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.fp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.fp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.fp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.fp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.fp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.fp-kpi {
    width: 100%;
    min-height: 92px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.fp-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.fp-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.fp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.fp-panel {
    min-width: 0;
}
.fp-panel--wide {
    grid-column: span 2;
}
@media (max-width: 900px) {
    .fp-panel--wide {
        grid-column: span 1;
    }
}
.fp-rail {
    min-width: 0;
}
.fp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.fp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .fp-rail-card {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 380px;
        max-height: none;
        border-radius: 0;
        border-left: 1px solid #DCE4F0;
    }
}
.fp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
.fp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.fp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.fp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.fp-list-item:hover {
    background: #F6F9FC;
}
.fp-list-item.sev-bad {
    border-left-color: var(--q-negative);
}
.fp-list-item.sev-warn {
    border-left-color: var(--q-warning);
}
.fp-list-item.sev-good {
    border-left-color: var(--q-positive);
}
.fp-list-item.sev-flat {
    border-left-color: #E0E0E0;
}
.fp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.fp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.fp-modal {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    border-radius: 10px;
}
</style>
