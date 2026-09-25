<template>
    <div class="fp-office-shell">
        <div class="row items-center justify-between fp-office-header">
            <div>
                <div class="fp-office-eyebrow">citizen CSM report &middot; office detail</div>
                <div class="text-h5">{{ FeedbackStore.details?.alias }}</div>
                <div class="text-caption text-grey">{{ FeedbackStore.details?.name }}</div>
            </div>
            <q-btn icon="bi-x-circle" flat round dense v-close-popup />
        </div>

        <div class="fp-office-body">
        <div class="fp-office-main">

            <div class="row q-col-gutter-sm q-mb-md">
                <div class="col-6 col-sm-3">
                    <q-card flat class="fp-office-kpi radius-xs bg-primary">
                        <div class="fp-office-kpi-value text-white">{{ formatNumber(totalFeedback) }}</div>
                        <div class="fp-office-kpi-label text-white">total CSM reports</div>
                    </q-card>
                </div>
                <div class="col-6 col-sm-3">
                    <q-card flat class="fp-office-kpi radius-xs bg-primary">
                        <div class="fp-office-kpi-value text-white">{{ formatPercentage(totalRating) }}</div>
                        <div class="fp-office-kpi-label text-white">satisfactory rating</div>
                    </q-card>
                </div>
                <div class="col-6 col-sm-3">
                    <q-card flat class="fp-office-kpi radius-xs custom-border">
                        <div class="fp-office-kpi-value text-primary">{{ kioskCount }}</div>
                        <div class="fp-office-kpi-label text-grey">kiosk entries</div>
                    </q-card>
                </div>
                <div class="col-6 col-sm-3">
                    <q-card flat class="fp-office-kpi radius-xs custom-border">
                        <div class="fp-office-kpi-value text-primary">{{ manualCount }}</div>
                        <div class="fp-office-kpi-label text-grey">manual entries</div>
                    </q-card>
                </div>
            </div>

            <div class="fp-office-panel-grid">
                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md fp-office-panel--wide">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">CSM reports filed per period</div>
                    <apexchart type="area" height="220" :options="chartOptions1" :series="series1" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md fp-office-panel--wide">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">satisfaction trend</div>
                    <div class="text-caption text-grey q-mb-sm">avg. rating per month, not just volume</div>
                    <apexchart type="line" height="220" :options="chartOptionsTrend" :series="seriesTrend" />
                </q-card>

                <!-- Same-height content (donut, ~4-6 slices each) so this row never stretches
                     one panel to match a much taller neighbor — see the SQD panel below, which
                     is deliberately kept out of this grid for exactly that reason. -->
                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">by client type</div>
                    <apexchart type="pie" height="280" :options="chartOptions2" :series="series2" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">by sex</div>
                    <apexchart type="pie" height="280" :options="chartOptions3" :series="series3" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">by age</div>
                    <apexchart type="pie" height="280" :options="chartOptions4" :series="series4" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">by entry method</div>
                    <apexchart type="pie" height="280" :options="chartOptions5" :series="series5" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">satisfaction distribution</div>
                    <div class="text-caption text-grey q-mb-sm">spread of ratings, not just the average</div>
                    <apexchart type="pie" height="280" :options="ratingDistributionOptions" :series="ratingDistributionSeries" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">CC1 &middot; charter awareness</div>
                    <apexchart type="pie" height="280" :options="chartOptions6" :series="series6" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">CC2 &middot; charter visibility</div>
                    <apexchart type="pie" height="280" :options="chartOptions7" :series="series7" />
                </q-card>

                <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">CC3 &middot; charter usefulness</div>
                    <apexchart type="pie" height="280" :options="chartOptions8" :series="series8" />
                </q-card>
            </div>

            <!-- Full-width, outside the auto-fit grid — its bar chart + 9-row list run far taller
                 than any donut panel, so sharing a grid row with one used to stretch it to match.
                 Chart on the left, itemized SQD0-8 breakdown on the right. -->
            <q-card flat class="fp-office-panel custom-border radius-xs q-pa-md q-mt-md fp-office-sqd-panel">
                <div class="fp-office-sqd-chart-col">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">service quality dimensions</div>
                    <div class="text-caption text-grey q-mb-sm">SQD0-8, lower bars need attention first</div>
                    <apexchart type="bar" height="380" :options="chartOptionsSqdBar" :series="seriesSqdBar" />
                </div>
                <q-separator vertical class="fp-office-sqd-divider" />
                <div class="fp-office-sqd-list-col">
                    <div v-for="dim in sqdDimensions" :key="dim.key" class="fp-office-sqd-item">
                        <div>
                            <div class="text-caption text-weight-bold text-uppercase">{{ dim.key }}</div>
                            <div class="text-caption text-grey">{{ dim.label }}</div>
                        </div>
                        <q-icon v-if="dim.value !== 0" :name="icons[dim.value - 1]" :color="colors[dim.value - 1]" size="md" />
                        <span v-else class="text-caption text-uppercase text-grey">N/A</span>
                    </div>
                </div>
            </q-card>

            <q-card flat class="fp-office-panel custom-border radius-xs q-mt-md">
                <q-card-section>
                    <div class="row items-center no-wrap">
                        <div class="col text-caption text-uppercase text-grey">list of CSM reports</div>
                        <div class="col-auto text-caption text-grey text-uppercase">{{ ratings.length }} this year</div>
                    </div>
                </q-card-section>
                <q-separator />
                <div class="fp-office-rating-list">
                    <div
                        v-for="(dt, index) in ratings" :key="index"
                        class="fp-office-rating-row" :class="ratingSeverity(dt)"
                        @click="generatePDF(dt.id)"
                    >
                        <q-icon :name="dt.entryFrom === 'manual' ? 'bi-file-earmark' : 'bi-tv'" :color="dt.entryFrom === 'manual' ? 'primary' : 'positive'" size="xs" class="q-mr-sm" />
                        <div class="col">
                            <div class="text-caption text-weight-bold text-uppercase">{{ formatDate(dt.date) }}</div>
                            <div class="text-caption text-grey">{{ dt.entryFrom === 'manual' ? 'manual entry' : formatTime(dt.date) }}</div>
                        </div>
                        <span class="fp-office-pill" :style="{ background: ratingPillColor(dt).bg, color: ratingPillColor(dt).text }">
                            {{ formatPercentage(dt.averageSqdPercentage) }}
                        </span>
                        <q-inner-loading :showing="dt.id == id ? rateLoading : null">
                            <q-spinner-ios size="1.2em" />
                        </q-inner-loading>
                    </div>
                    <div v-if="!ratings.length" class="fp-office-list-empty">
                        <div class="text-caption text-uppercase">no CSM reports this year</div>
                    </div>
                </div>
            </q-card>
        </div>
        </div>


        <q-dialog v-model="ratingDialog" full-height full-width>
            <q-card>
                <q-btn icon="close" class="fixed bg-white" round dense v-close-popup style="top: 25px; right: 10px; transform: translateY(-50%); z-index: 999;" />
                <q-card-section class="q-pa-none">
                    <div v-if="file" class="myIframe">
                        <iframe :src="file" height="100%" width="100%"></iframe>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import Apexchart from "vue3-apexcharts";

import { useFeedbackStore } from '../stores/feedback-store';

const FeedbackStore = useFeedbackStore();

//
const totalFeedback = ref(0);

//
const totalRating = ref(0);

// frequency — same gradient-area treatment as FeedbackPage.vue's system-wide volume chart
// Shuffled fresh on every load so charts don't render in the exact same color order every visit
// — same 10-color theme (5 distinct, repeated 3x below to match the array length every donut
// here expects), just randomized which color lands where. Donuts still pass the whole array —
// Apex assigns one color per slice positionally. nextChartColor() hands single-series charts
// (series1, seriesTrend, seriesSqdBar) one color each, in round-robin order through the shuffled
// set, so they never coincidentally land on the same color as each other.
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

const series1 = ref([]);
const chartOptions1 = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [nextChartColor()],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

// satisfaction trend — avg. rating per month, distinct from the raw filing volume above
const seriesTrend = ref([]);
const chartOptionsTrend = ref({
    chart: {
        type: 'line',
        toolbar: { show: false },
    },
    stroke: {
        curve: 'smooth',
        width: 2,
    },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: [nextChartColor()],
    xaxis: {
        categories: []
    },
    yaxis: {
        max: 100,
        labels: {
            formatter: (v) => Math.round(v) + '%'
        }
    }
});

// Shared donut/pie look — same recipe as FeedbackPage.vue's system-wide mix charts (bottom
// legend, value labels on, the shared app palette instead of ApexCharts' default theme colors).
const pieOptions = () => ({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

// client type
const series2 = ref([]);
const chartOptions2 = ref(pieOptions());

// sex
const series3 = ref([]);
const chartOptions3 = ref(pieOptions());

// age
const series4 = ref([]);
const chartOptions4 = ref(pieOptions());

// entry
const series5 = ref([]);
const chartOptions5 = ref(pieOptions());

// satisfaction distribution — spread of this office's own ratings, not just the average
const ratingDistributionSeries = ref([]);
const ratingDistributionOptions = ref(pieOptions());

// cc1
const series6 = ref([]);
const chartOptions6 = ref(pieOptions());

// cc2
const series7 = ref([]);
const chartOptions7 = ref(pieOptions());

// cc3
const series8 = ref([]);
const chartOptions8 = ref(pieOptions());

// sqd bar — at-a-glance version of the emoji list below it
const seriesSqdBar = ref([{ name: 'Avg.', data: [] }]);
const chartOptionsSqdBar = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: ['SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8'], max: 5 },
});

const ratings = ref([]);
const meta = ref({});
// No pagination anymore — every rating for the selected office+year in one request. Realistic
// per-office annual volume stays well under this, so a single page is safe.
const limit = 1000;
const ratingDialog = ref(false);

const file = ref(null);
const id = ref(null);
const rateLoading = ref(false);

const sqd0 = ref(0);
const sqd1 = ref(0);
const sqd2 = ref(0);
const sqd3 = ref(0);
const sqd4 = ref(0);
const sqd5 = ref(0);
const sqd6 = ref(0);
const sqd7 = ref(0);
const sqd8 = ref(0);

// Same emoji/color scale as the create-feedback wizard (CreateFeedbackComponent.vue) — 1-5,
// worst to best.
const icons = ['bi-emoji-angry', 'bi-emoji-frown', 'bi-emoji-neutral', 'bi-emoji-smile', 'bi-emoji-laughing'];
const colors = ['red', 'amber', 'yellow', 'light-green', 'green'];

const SQD_LABELS = [
    'I am satisfied with the service that I availed',
    'I spent a reasonable amount of time for my transaction',
    "The office followed the transaction's requirements and steps based on the information provided",
    'The steps (including payment) I needed to do for my transaction were easy and simple',
    'I easily found information about my transaction from the office or its website',
    'I paid a reasonable amount of fees for my transaction',
    'I feel the office was fair to everyone, or "walang palakasan" during my transaction',
    'I was treated courteously by the staff, and (if ask for help) the staff was helpful',
    'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained',
];
const sqdValues = [sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8];
const sqdDimensions = computed(() => SQD_LABELS.map((label, i) => ({ key: `sqd${i}`, label, value: sqdValues[i].value })));

// Entry-method KPI split — same "kiosk vs manual" pair as FeedbackPage.vue's system-wide tiles.
const kioskCount = computed(() => ratings.value.filter(r => r.entryFrom !== 'manual').length);
const manualCount = computed(() => ratings.value.filter(r => r.entryFrom === 'manual').length);

// Same 3-state severity language as FeedbackPage.vue's office rail (green/amber/red by rating).
const ratingSeverity = (dt) => {
    if (dt.averageSqdPercentage == null) return 'sev-flat';
    if (dt.averageSqdPercentage >= 85) return 'sev-good';
    if (dt.averageSqdPercentage >= 70) return 'sev-warn';
    return 'sev-bad';
};
const ratingPillColor = (dt) => {
    const sev = ratingSeverity(dt);
    if (sev === 'sev-good') return { bg: '#E4F5E9', text: '#1C8A3B' };
    if (sev === 'sev-warn') return { bg: '#FBF1D9', text: '#9A6B00' };
    if (sev === 'sev-bad') return { bg: '#FBE6E8', text: '#B3121F' };
    return { bg: '#F6F9FC', text: '#8493AC' };
};

const getAllRatings = async () => {
    try {
        const response = await api.get(`/feedback/${FeedbackStore.details.id}/${FeedbackStore.year}`, {
            params: {
                page: 1,
                limit
            }
        });
        const data = response.data;

        totalFeedback.value = data.ratings?.meta.TotalItems;
        totalRating.value = data.averagePercentage;

        ratings.value = data.ratings?.data;
        meta.value = data.ratings?.meta;

        /**
         *
         * FREQUENCY DATA
         *
         */
        const frequenciesData = Array.isArray(data.frequencies) ? data.frequencies : [];

        const FrequencyCounts = frequenciesData.map(item => item.count);
        const FrequencyCategories = frequenciesData.map(item => item.label);

        series1.value = [{
            name: 'CSM Report Frequency',
            data: FrequencyCounts
        }];

        chartOptions1.value = {
            ...chartOptions1.value,
            xaxis: {
                ...chartOptions1.value.xaxis,
                categories: FrequencyCategories
            }
        };

        /**
         *
         * SATISFACTION TREND
         *
         */
        const trendData = Array.isArray(data.satisfactionTrend) ? data.satisfactionTrend : [];

        seriesTrend.value = [{
            name: 'Avg. satisfaction',
            data: trendData.map(item => item.avgPercentage)
        }];

        chartOptionsTrend.value = {
            ...chartOptionsTrend.value,
            xaxis: {
                ...chartOptionsTrend.value.xaxis,
                categories: trendData.map(item => item.label.slice(0, 3))
            }
        };

        /**
         *
         *
         * CLIENT TYPE DATA
         *
         */
        const TypeCounts = [];
        const TypeCLabels = [];

        Object.values(data.types).forEach(item => {
            TypeCLabels.push(item.label);
            TypeCounts.push(item.count);
        });

        series2.value = TypeCounts;

        chartOptions2.value = {
            ...chartOptions2.value,
            labels: TypeCLabels,
        };

        /**
         *
         *
         * SEX
         *
         */
        const SexCounts = [];
        const SexLabels = [];

        Object.values(data.sexes).forEach(item => {
            SexLabels.push(item.label);
            SexCounts.push(item.count);
        });

        series3.value = SexCounts;

        chartOptions3.value = {
            ...chartOptions3.value,
            labels: SexLabels,
        };

        /**
         *
         *
         * AGE BRACKET
         *
         */
        const AgeCounts = [];
        const AgeLabels = [];

        Object.values(data.ages).forEach(item => {
            AgeLabels.push(item.label);
            AgeCounts.push(item.count);
        });

        series4.value = AgeCounts;

        chartOptions4.value = {
            ...chartOptions4.value,
            labels: AgeLabels,
        };

        /**
         *
         * ENTRY FROM
         *
         */
        const EntryCounts = [];
        const EntryLabels = [];

        Object.values(data.entry).forEach(item => {
            EntryLabels.push(item.label);
            EntryCounts.push(item.count);
        });

        series5.value = EntryCounts;

        chartOptions5.value = {
            ...chartOptions5.value,
            labels: EntryLabels,
        };

        /**
         *
         * SATISFACTION DISTRIBUTION
         *
         */
        const distribution = Array.isArray(data.ratingDistribution) ? data.ratingDistribution : [];
        ratingDistributionSeries.value = distribution.map(item => item.count);
        ratingDistributionOptions.value = {
            ...ratingDistributionOptions.value,
            labels: distribution.map(item => item.label),
        };

        /**
         *
         * CC1
         *
         */
        const CC1Counts = [];
        const CC1Labels = [];

        Object.values(data.cc1).forEach(item => {
            CC1Labels.push(item.label);
            CC1Counts.push(item.count);
        });

        series6.value = CC1Counts;

        chartOptions6.value = {
            ...chartOptions6.value,
            labels: CC1Labels,
        };

        /**
         *
         * CC2
         *
         */
        const CC2Counts = [];
        const CC2Labels = [];

        Object.values(data.cc2).forEach(item => {
            CC2Labels.push(item.label);
            CC2Counts.push(item.count);
        });

        series7.value = CC2Counts;

        chartOptions7.value = {
            ...chartOptions7.value,
            labels: CC2Labels,
        };

        /**
         *
         * CC2
         *
         */
        const CC3Counts = [];
        const CC3Labels = [];

        Object.values(data.cc3).forEach(item => {
            CC3Labels.push(item.label);
            CC3Counts.push(item.count);
        });

        series8.value = CC3Counts;

        chartOptions8.value = {
            ...chartOptions8.value,
            labels: CC3Labels,
        };

        /**
         *
         * SQD
         *
         */
        sqd0.value = data.sqd[0].avgSqd0;
        sqd1.value = data.sqd[0].avgSqd1;
        sqd2.value = data.sqd[0].avgSqd2;
        sqd3.value = data.sqd[0].avgSqd3;
        sqd4.value = data.sqd[0].avgSqd4;
        sqd5.value = data.sqd[0].avgSqd5;
        sqd6.value = data.sqd[0].avgSqd6;
        sqd7.value = data.sqd[0].avgSqd7;
        sqd8.value = data.sqd[0].avgSqd8;

        seriesSqdBar.value = [{
            name: 'Avg.',
            data: [sqd0.value, sqd1.value, sqd2.value, sqd3.value, sqd4.value, sqd5.value, sqd6.value, sqd7.value, sqd8.value]
        }];

    } catch (error) {
        console.error("Error fetching ratings or frequencies:", error);
    }
}

const formatPercentage = (value) => {
    return (value == null ? `0%` : `${value.toFixed(2)}%`);
}

const formatDate = (timestamp) => {
    return moment(timestamp).format('MMM DD, YYYY');
};

const formatTime = (timestamp) => {
    return moment(timestamp, 'HH:mm:ss').format('h:mm A');
};

const formatNumber = (value) => {
    return value.toLocaleString('en-US');
};

const generatePDF = async (rateId) => {
    id.value = rateId;
    rateLoading.value = true;
    try {
        const res = await api.get(`/feedback/pdf/rating/${rateId}`, {
            responseType: 'arraybuffer',
        })
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const pdfurl = window.URL.createObjectURL(blob) + "#view=FitW";
        file.value = pdfurl
        ratingDialog.value = true;
        rateLoading.value = false;
    } catch (error) {
        rateLoading.value = false;
        console.error("Error generating PDF:", error);
    }
}

onMounted(() => {
    getAllRatings();
});

</script>

<style scoped>
/* Mirrors FeedbackPage.vue / ComplaintPage.vue's design language (fp-/cp- prefixed classes) so
   the office detail modal reads as part of the same system rather than an older, separate style.
   The header stays fixed at the top of the modal — only .fp-office-body scrolls — so the office
   name/close button never scroll out of view (see FeedbackPage.vue's office dialog, whose own
   q-card-section is a plain non-scrolling flex container so this component controls its own
   height/scrolling). */
.fp-office-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.fp-office-header {
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 8px;
    padding: 24px 24px 16px 24px;
}
.fp-office-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 24px 24px 24px;
}
.fp-office-main {
    min-width: 0;
}
.fp-office-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.fp-office-kpi {
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
.fp-office-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.fp-office-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.fp-office-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.fp-office-panel {
    min-width: 0;
}
.fp-office-panel--wide {
    grid-column: span 2;
}
@media (max-width: 900px) {
    .fp-office-panel--wide {
        grid-column: span 1;
    }
}
.fp-office-rating-list {
    max-height: 420px;
    overflow-y: auto;
}
.fp-office-rating-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
    position: relative;
}
.fp-office-rating-row:hover {
    background: #F6F9FC;
}
.fp-office-rating-row.sev-bad {
    border-left-color: var(--q-negative);
}
.fp-office-rating-row.sev-warn {
    border-left-color: var(--q-warning);
}
.fp-office-rating-row.sev-good {
    border-left-color: var(--q-positive);
}
.fp-office-rating-row.sev-flat {
    border-left-color: #E0E0E0;
}
.fp-office-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.fp-office-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
/* Chart on the left, itemized SQD0-8 breakdown on the right — collapses to a stacked column
   below 900px so the list doesn't get squeezed unreadably narrow. */
.fp-office-sqd-panel {
    display: flex;
    align-items: stretch;
    gap: 16px;
}
.fp-office-sqd-chart-col {
    flex: 1 1 50%;
    min-width: 0;
}
.fp-office-sqd-list-col {
    flex: 1 1 50%;
    min-width: 0;
    overflow-y: auto;
}
.fp-office-sqd-divider {
    flex: 0 0 auto;
}
@media (max-width: 900px) {
    .fp-office-sqd-panel {
        flex-direction: column;
    }
    .fp-office-sqd-divider {
        display: none;
    }
}
.fp-office-sqd-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.myIframe {
    position: relative;
    padding-bottom: 65.25%;
    padding-top: 30px;
    height: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
}

.myIframe iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.4s ease;
}
.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(10px);
}
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>
