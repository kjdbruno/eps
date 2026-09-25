<template>
    <div>
        <div class="hp-shell">
        <div class="hp-main">
        <!-- Hero / welcome -->
        <q-card flat class="hp-hero radius-sm q-pa-lg q-mb-lg">
            <div class="row items-center q-gutter-lg no-wrap">
                <q-avatar size="64px" class="hp-avatar">
                    <img :src="avatarUrl" @error="onAvatarError">
                    <q-icon v-if="avatarFailed" name="bi-person-fill" size="32px" color="white" />
                </q-avatar>
                <div class="col">
                    <div class="hp-eyebrow">{{ greeting }} &middot; {{ todayLabel }}</div>
                    <div class="text-h5 text-white">{{ fullName }}</div>
                    <div class="text-caption hp-subtext">
                        {{ roleLabel }}<template v-if="officeLabel"> &middot; {{ officeLabel }}</template>
                    </div>
                </div>
                <q-space />
                <!--
                    Notifications/Messages already live as icon buttons at the bottom of the
                    sidebar (MainLayout.vue) — no need to duplicate that navigation here too, so
                    this corner is free for something Home-specific instead: current weather for
                    the viewer's OWN current location (geolocation, with San Fernando City as the
                    fallback), since a lot of what this dashboard tracks (kiosk footfall, field
                    complaints) is weather-sensitive.
                -->
                <div class="hp-weather">
                    <template v-if="weatherLoading">
                        <q-spinner color="white" size="20px" />
                    </template>
                    <template v-else-if="weather">
                        <q-icon :name="weather.icon" size="28px" color="white" />
                        <div>
                            <div class="hp-weather-temp">{{ weather.tempC }}&deg;C</div>
                            <div class="hp-weather-label">{{ weather.label }}</div>
                        </div>
                    </template>
                    <div class="hp-weather-city">
                        <q-icon name="bi-geo-alt-fill"/>
                        {{ weatherCity }}
                    </div>
                </div>
            </div>
        </q-card>

        <!-- System overview — combines Complaint/Feedback/Discussion/Poll into one dashboard -->
        <div class="row items-center justify-between q-mb-sm">
            <div class="text-caption text-uppercase text-grey">
                system overview<template v-if="overviewScopeLabel"> &middot; {{ overviewScopeLabel }}</template>
                <template v-if="overviewRangeLabel"> &middot; {{ overviewRangeLabel }}</template>
            </div>
            <div class="row items-center q-gutter-sm">
                <q-btn
                    v-if="isSupervisor"
                    no-caps unelevated rounded size="sm" color="primary" icon="bi-stars" label="Analyze Data"
                    class="hp-analyze-btn" @click="analysisModalOpen = true"
                >
                    <q-tooltip>AI recommendations for the city and each office, for the selected year and period</q-tooltip>
                </q-btn>
                <div class="hp-year-group">
                    <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                        <q-tooltip>Previous year</q-tooltip>
                    </q-btn>
                    <div class="hp-year-value">{{ overviewYear }}</div>
                    <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="overviewYear >= currentYear" @click="stepYear(1)">
                        <q-tooltip>Next year</q-tooltip>
                    </q-btn>
                </div>
                <div class="hp-period-group">
                    <q-btn no-caps unelevated size="sm" label="Week" class="hp-period-btn" :class="overviewPeriod === 'week' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('week')" />
                    <q-btn no-caps unelevated size="sm" label="Month" class="hp-period-btn" :class="overviewPeriod === 'month' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('month')" />
                    <q-btn no-caps unelevated size="sm" label="Year" class="hp-period-btn" :class="overviewPeriod === 'year' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('year')" />
                </div>
                <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="overviewLoading" @click="loadOverview">
                    <q-tooltip>Refresh</q-tooltip>
                </q-btn>
            </div>
        </div>

        <div class="hp-stat-grid q-mb-lg">
            <q-card flat class="hp-stat radius-xs bg-primary">
                <div class="hp-stat-value text-white">{{ overallSatisfactionLabel }}</div>
                <div class="hp-stat-label text-white">overall satisfaction</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ complaintData.kpis.totalComplaints ?? 0 }}</div>
                <div class="hp-stat-label text-grey">feedback filed</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ feedbackData.kpis.totalFeedback ?? 0 }}</div>
                <div class="hp-stat-label text-grey">CSM reports collected</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ discussionTotals.topics }}</div>
                <div class="hp-stat-label text-grey">discussions opened</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ pollTotals.polls }}</div>
                <div class="hp-stat-label text-grey">polls created</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ totalTouchpoints }}</div>
                <div class="hp-stat-label text-grey">total citizen touchpoints</div>
            </q-card>
            <q-card flat class="hp-stat radius-xs custom-border">
                <div class="hp-stat-value text-primary">{{ approvalLagLabel }}</div>
                <div class="hp-stat-label text-grey">
                    avg. office-completion &rarr; feedback-completion
                    <q-tooltip>Average time between every assigned office marking its own part done and a supervisor actually finalizing the feedback.</q-tooltip>
                </div>
            </q-card>
        </div>

        <div class="hp-panel-grid q-mb-lg">
            <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">filings by channel per {{ bucketUnitLabel }}</div>
                <apexchart type="area" height="240" :options="filingsChartOptions" :series="filingsChartSeries" />
            </q-card>

            <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">engagement by channel per {{ bucketUnitLabel }}</div>
                <div class="text-caption text-grey q-mb-sm">discussion comments &amp; poll votes over time</div>
                <apexchart type="line" height="240" :options="engagementChartOptions" :series="engagementChartSeries" />
            </q-card>

            <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">satisfaction &middot; feedback vs. CSM report</div>
                <apexchart type="bar" height="200" :options="satisfactionChartOptions" :series="satisfactionChartSeries" />
            </q-card>

            <!-- Same "label · count (percent%) · bar" idiom as the citizen-facing poll results
                 (PollVote.vue) — asked for by name over the pie this used to be: with 7 possible
                 statuses several bars are always going to be thin, but unlike pie slices a thin
                 bar never loses its label or collides with its neighbor. -->
            <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                <div class="row items-center justify-between q-mb-sm">
                    <div class="text-caption text-uppercase text-grey">feedback status breakdown</div>
                    <div class="text-caption text-grey">{{ statusBreakdownTotal }} feedback(s)</div>
                </div>
                <div v-for="s in statusBreakdownRows" :key="s.status" class="q-mb-sm">
                    <div class="row items-center q-mb-xs">
                        <div class="text-body2 text-capitalize">{{ s.status }}</div>
                        <q-space />
                        <div class="text-caption text-grey">{{ s.count }} ({{ s.percent }}%)</div>
                    </div>
                    <q-linear-progress :value="(s.percent || 0) / 100" color="primary" track-color="grey-3" size="10px" rounded />
                </div>
                <div class="text-caption text-grey" v-if="!statusBreakdownRows.length">No feedback in this period.</div>
            </q-card>

            <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">engagement share this period</div>
                <apexchart type="pie" height="280" :options="shareChartOptions" :series="shareChartSeries" />
            </q-card>
        </div>

        <!-- Client / citizen-base snapshot — super/admin/monitoring only (system-wide, not office-scoped) -->
        <template v-if="canViewAll">
            <div class="text-caption text-uppercase text-grey q-mb-sm">clients &middot; citizen base</div>
            <div class="hp-panel-grid q-mb-lg">
                <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                    <div class="hp-client-tiles">
                        <div>
                            <div class="hp-stat-value text-primary">{{ clientData.totalRegistered ?? 0 }}</div>
                            <div class="hp-stat-label text-grey">registered citizens</div>
                        </div>
                        <div>
                            <div class="hp-stat-value text-primary">{{ clientData.newRegistrations ?? 0 }}</div>
                            <div class="hp-stat-label text-grey">new this period</div>
                        </div>
                        <div>
                            <div class="hp-stat-value" :class="verifiedRateClass">{{ clientData.verifiedRate != null ? clientData.verifiedRate + '%' : '—' }}</div>
                            <div class="hp-stat-label text-grey">
                                email-verified
                                <q-tooltip>Share of all registered citizen accounts that completed email verification.</q-tooltip>
                            </div>
                        </div>
                        <div>
                            <div class="hp-stat-value text-primary">{{ clientData.avgVerifyMinutes != null ? formatVerifyTime(clientData.avgVerifyMinutes) : '—' }}</div>
                            <div class="hp-stat-label text-grey">
                                avg. time to verify
                                <q-tooltip>Average gap between registering and confirming the email, for accounts verified this period.</q-tooltip>
                            </div>
                        </div>
                        <div>
                            <div class="hp-stat-value" :class="clientData.repeatFilerRate > 40 ? 'text-negative' : 'text-primary'">{{ clientData.repeatFilerRate != null ? clientData.repeatFilerRate + '%' : '—' }}</div>
                            <div class="hp-stat-label text-grey">
                                repeat filers
                                <q-tooltip>Share of this period's distinct citizens who filed feedback more than once — high can mean unresolved issues or a few heavy users.</q-tooltip>
                            </div>
                        </div>
                    </div>
                </q-card>

                <q-card flat class="hp-panel custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">how feedback arrives this period</div>
                    <apexchart type="pie" height="280" :options="channelChartOptions" :series="channelChartSeries" />
                </q-card>
            </div>
        </template>

        <!-- Needs-attention snapshot, reusing the same counts the left-nav badges show -->
        <div class="text-caption text-uppercase text-grey q-mb-sm">needs your attention</div>
        <div class="hp-kpi-grid q-mb-lg">
            <q-card
                v-for="kpi in kpis" :key="kpi.key" flat clickable
                class="hp-kpi radius-xs custom-border" @click="router.push({ name: kpi.route })"
            >
                <div class="hp-kpi-value" :class="kpi.count > 0 ? 'text-negative' : 'text-primary'">{{ kpi.count }}</div>
                <div class="hp-kpi-label text-grey">{{ kpi.label }}</div>
            </q-card>
        </div>

        <!-- Quick access to every module -->
        <div class="text-caption text-uppercase text-grey q-mb-sm">quick access</div>
        <div class="hp-module-grid q-mb-lg">
            <q-card
                v-for="mod in modules" :key="mod.route" flat clickable
                class="hp-module radius-xs custom-border" @click="router.push({ name: mod.route })"
            >
                <div class="row items-center justify-between no-wrap q-mb-sm">
                    <q-icon :name="mod.icon" size="26px" color="primary" />
                    <q-badge v-if="mod.badgeKey && navBadges[mod.badgeKey] > 0" color="negative" rounded>{{ navBadges[mod.badgeKey] }}</q-badge>
                </div>
                <div class="text-subtitle1 text-capitalize text-weight-bold">{{ mod.label }}</div>
                <div class="text-caption text-grey">{{ mod.description }}</div>
            </q-card>
        </div>
        </div>

        <!-- Team roster — pinned to the right, same rail placement AND rail-list styling as the
             Feedback/Complaint office rails (colored severity border, bold-caps + stat header row,
             pill badge) — just online/offline instead of a rating band. Live status via the
             socket-pushed 'loadLogs' the app already keeps in AuthStore.loggedUsers. Clicking a
             row opens the right-aligned account/messaging panel (TeamMemberModal.vue). -->
        <div class="hp-rail">
        <q-card flat class="hp-team-card">
            <div class="hp-team-head">
                <div class="row items-center justify-between no-wrap q-mb-sm">
                    <div class="row items-baseline q-gutter-xs">
                        <div class="text-h6 text-capitalize">team</div>
                        <div class="text-caption text-grey">{{ filteredTeam.length }} of {{ team.length }} &middot; {{ onlineCount }} online</div>
                    </div>
                </div>
                <q-input outlined dense v-model="teamSearch" placeholder="Search team..." class="hp-team-search">
                    <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                </q-input>
            </div>
            <q-separator />
            <div class="hp-team-list" ref="railListRef" @scroll="onRailScroll">
                <div
                    v-for="member in filteredTeam" :key="member.id"
                    class="hp-team-item" :class="[member.isOnline ? 'sev-good' : 'sev-flat', member.unreadCount > 0 ? 'hp-team-item--unread' : '']"
                    @click="openMember(member)"
                >
                    <div class="row items-center justify-between no-wrap">
                        <div class="row items-center q-gutter-xs">
                            <div class="text-caption text-weight-bold text-uppercase">{{ member.firstname }} {{ member.lastname }}</div>
                            <q-badge v-if="member.unreadCount > 0" color="negative" rounded>{{ member.unreadCount }}</q-badge>
                        </div>
                        <div class="text-caption text-grey">{{ member.office || '—' }}</div>
                    </div>
                    <div class="text-body2 q-mt-xs text-capitalize">{{ ROLE_LABELS[member.role] || member.role }}</div>
                    <div class="row items-center q-mt-xs q-gutter-xs">
                        <span class="hp-team-pill" :style="member.isOnline ? { background: '#E4F5E9', color: '#1C8A3B' } : { background: '#F6F9FC', color: '#8493AC' }">
                            {{ member.isOnline ? 'online' : 'offline' }}
                        </span>
                        <span v-if="member.unreadCount > 0" class="hp-team-pill hp-team-pill--unread">
                            <q-icon name="bi-envelope-fill" size="10px" class="q-mr-xs" />{{ member.unreadCount }} new
                        </span>
                    </div>
                </div>
                <div v-if="!filteredTeam.length" class="hp-team-empty">
                    <div class="text-caption text-uppercase">no staff found</div>
                </div>
            </div>
            <q-btn
                v-if="showBackToTop"
                round unelevated color="primary" icon="bi-arrow-up" size="sm"
                class="hp-back-to-top" @click="scrollRailToTop"
            >
                <q-tooltip>Back to top</q-tooltip>
            </q-btn>
        </q-card>
        </div>
        </div>

        <TeamMemberModal v-model="memberDialog" :member="selectedMember" @force-logout="loadTeam" />
        <DataAnalysisModal
            v-if="isSupervisor"
            v-model="analysisModalOpen"
            :period="overviewPeriod"
            :year="overviewYear"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { socket } from 'src/boot/socket';
import { useAuthStore } from 'src/stores/auth-store';
import Apexchart from 'vue3-apexcharts';
import TeamMemberModal from 'src/components/TeamMemberModal.vue';
import DataAnalysisModal from 'src/components/DataAnalysisModal.vue';

const router = useRouter();
const AuthStore = useAuthStore();

// "Analyze Data" — super/admin only, opens the AI recommendations modal for the current
// overview period/year (see DataAnalysisModal.vue + GET /report/prescriptions).
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const analysisModalOpen = ref(false);

// System-wide oversight roles — same set that gates the read-only panels on Feedback/Complaint/
// Discussion/Poll. Drives the "Clients · citizen base" section.
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const clientData = ref({});
const verifiedRateClass = computed(() => {
    const r = clientData.value.verifiedRate;
    if (r == null) return 'text-grey';
    return r >= 60 ? 'text-primary' : 'text-negative';
});
const formatVerifyTime = (minutes) => {
    if (minutes == null) return '—';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = minutes / 60;
    return h < 24 ? `${h.toFixed(1)}h` : `${Math.round(h / 24)}d`;
};

// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (5 distinct, repeated 3x below to match the array length every
// multi-item chart on this page already expects), just randomized which color lands where.
// Multi-item charts (donuts, multi-series area/line) still pass the whole array — Apex assigns
// one color per slice/series positionally. nextChartColor() hands single-series charts one color
// each, in round-robin order through the shuffled set, so two single-series charts on this page
// never coincidentally land on the same color.
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

/* -------------------- hero -------------------- */

const avatarFailed = ref(false);
const onAvatarError = () => { avatarFailed.value = true; };
const avatarUrl = computed(() => `${process.env.VUE_APP_BACKEND_URL}${AuthStore.user?.avatar || ''}`);

const fullName = computed(() => {
    const u = AuthStore.user;
    return u ? `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.username : '';
});

const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const roleLabel = computed(() => ROLE_LABELS[AuthStore.user?.role] || AuthStore.user?.role || '');
const officeLabel = computed(() => AuthStore.user?.staff?.office?.alias || AuthStore.user?.staff?.office?.name || null);

const greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
});
const todayLabel = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));

/* -------------------- needs-attention + quick access -------------------- */
// Reuses the same lightweight /nav-badges endpoint the left-nav already calls for its badge
// counts — feedback/discussion/poll are "new since you last opened that section", complaint is
// a live count of offices still holding an unreceived complaint (see NavBadgeController).

const navBadges = ref({ feedback: 0, complaint: 0, discussion: 0, poll: 0 });

const loadNavBadges = async () => {
    try {
        const { data } = await api.get('/nav-badges');
        navBadges.value = data.data || navBadges.value;
    } catch (error) {
        console.error('Error loading nav badges:', error);
    }
};

const kpis = computed(() => ([
    { key: 'complaint', label: 'unreceived feedback', count: navBadges.value.complaint, route: 'complaint' },
    { key: 'feedback', label: 'new CSM reports', count: navBadges.value.feedback, route: 'feedback' },
    { key: 'discussion', label: 'new discussion comments', count: navBadges.value.discussion, route: 'discussion' },
    { key: 'poll', label: 'new poll votes', count: navBadges.value.poll, route: 'poll' },
]));

const modules = [
    { label: 'feedback', route: 'complaint', icon: 'bi-chat-quote', badgeKey: 'complaint', description: 'Receive and address public feedback.' },
    { label: 'CSM report', route: 'feedback', icon: 'bi-emoji-expressionless', badgeKey: 'feedback', description: 'Review kiosk ratings and citizen CSM reports.' },
    { label: 'discussion', route: 'discussion', icon: 'bi-people', badgeKey: 'discussion', description: 'Open and moderate public discussion topics.' },
    { label: 'poll', route: 'poll', icon: 'bi-bar-chart-line', badgeKey: 'poll', description: 'Run public opinion polls and view results.' },
    { label: 'preference', route: 'preference', icon: 'bi-sliders', badgeKey: null, description: 'Customize your account settings.' },
];

/* -------------------- weather (hero corner) -------------------- */
// Open-Meteo — free, keyless, no CORS issues from the browser. Coordinates come from the
// viewer's OWN current location (navigator.geolocation) when granted; San Fernando City,
// Pampanga is only the fallback — for a browser that doesn't support geolocation, a denied/
// dismissed permission prompt, or a timeout — not the default target. WMO weather codes mapped to
// a small icon/label set covering what's realistically seen here (no snow codes bothered with).
const SFC_LAT = 15.0286;
const SFC_LON = 120.6898;

// Wraps the callback-based Geolocation API in a Promise. maximumAge lets the browser hand back a
// recent cached fix instead of re-acquiring GPS/network location every single dashboard load;
// timeout keeps a slow/stuck location prompt from hanging the weather card indefinitely.
const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported by this browser.')); return; }
    navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 8000, maximumAge: 15 * 60 * 1000 }
    );
});

// BigDataCloud's client-side reverse-geocode endpoint — free, keyless, same "no CORS issues"
// convention as Open-Meteo above. Best-effort: a failed lookup still shows the weather itself,
// just with a generic "Your location" label instead of a named city.
const reverseGeocodeCity = async (lat, lon) => {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!response.ok) throw new Error(`Reverse geocode returned ${response.status}`);
        const data = await response.json();
        return data.city || data.locality || data.principalSubdivision || null;
    } catch (error) {
        console.error('Error reverse-geocoding current location:', error);
        return null;
    }
};
const WEATHER_CODE_MAP = {
    0: { icon: 'bi-sun', label: 'Clear sky' },
    1: { icon: 'bi-brightness-high', label: 'Mostly clear' },
    2: { icon: 'bi-cloud-sun', label: 'Partly cloudy' },
    3: { icon: 'bi-cloud', label: 'Overcast' },
    45: { icon: 'bi-cloud-fog2', label: 'Foggy' },
    48: { icon: 'bi-cloud-fog2', label: 'Foggy' },
    51: { icon: 'bi-cloud-drizzle', label: 'Light drizzle' },
    53: { icon: 'bi-cloud-drizzle', label: 'Drizzle' },
    55: { icon: 'bi-cloud-drizzle', label: 'Heavy drizzle' },
    61: { icon: 'bi-cloud-rain', label: 'Light rain' },
    63: { icon: 'bi-cloud-rain', label: 'Rain' },
    65: { icon: 'bi-cloud-rain-heavy', label: 'Heavy rain' },
    80: { icon: 'bi-cloud-rain', label: 'Rain showers' },
    81: { icon: 'bi-cloud-rain-heavy', label: 'Rain showers' },
    82: { icon: 'bi-cloud-rain-heavy', label: 'Violent showers' },
    95: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm' },
    96: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm w/ hail' },
    99: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm w/ hail' },
};

const weather = ref(null); // { tempC, icon, label }
const weatherLoading = ref(true);
const weatherCity = ref('San Fernando City'); // updated once geolocation/reverse-geocode resolve

const loadWeather = async () => {
    weatherLoading.value = true;
    let lat = SFC_LAT;
    let lon = SFC_LON;
    try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lon = pos.lon;
        weatherCity.value = (await reverseGeocodeCity(lat, lon)) || 'Your location';
    } catch (geoError) {
        // Not supported, permission denied/dismissed, or timed out — fall back to San Fernando
        // City's own coordinates rather than failing the whole weather card outright.
        console.warn('Falling back to San Fernando City for weather — geolocation unavailable:', geoError.message);
        weatherCity.value = 'San Fernando City';
    }

    try {
        // timezone=auto rather than a hardcoded Asia/Manila — matters once this is actually the
        // viewer's own location instead of always San Fernando City.
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
        const data = await response.json();
        const code = data?.current?.weather_code;
        const match = WEATHER_CODE_MAP[code] || { icon: 'bi-cloud', label: 'Weather' };
        weather.value = {
            tempC: Math.round(data?.current?.temperature_2m),
            icon: match.icon,
            label: match.label,
        };
    } catch (error) {
        console.error('Error loading weather:', error);
        weather.value = null;
    } finally {
        weatherLoading.value = false;
    }
};

/* -------------------- system overview (Complaint + Feedback + Discussion + Poll) -------------------- */
// Pulls each module's own already-built, already-scoped analytics endpoint (Complaint/Feedback's
// /analytics, Discussion/Poll's period-filtered list+stats) and blends them into one cross-module
// dashboard — same period/year windowing convention used on every other analytics page in this
// app, so "Month" here means exactly what "Month" means on the Complaint page.

const currentYear = moment().year();
const overviewPeriod = ref('year'); // 'week' | 'month' | 'year'
const overviewYear = ref(currentYear);
const overviewLoading = ref(false);
const overviewScopeLabel = ref('');
const overviewRangeLabel = ref('');

const bucketUnitLabel = computed(() => overviewPeriod.value === 'week' ? 'day' : overviewPeriod.value === 'month' ? 'week' : 'month');

const complaintData = ref({ kpis: {}, statusBreakdown: [], volumeTrend: [], satisfaction: {} });
const feedbackData = ref({ kpis: {}, volumeTrend: [] });
const discussionsRaw = ref([]);
const pollsRaw = ref([]);

const discussionTotals = computed(() => ({
    topics: discussionsRaw.value.length,
    comments: discussionsRaw.value.reduce((sum, d) => sum + (d.commentCount || 0), 0)
}));
const pollTotals = computed(() => ({
    polls: pollsRaw.value.length,
    votes: pollsRaw.value.reduce((sum, p) => sum + (p.totalVotes || 0), 0)
}));

// How long, on average, a complaint sat "ready" (every assigned office already marked its own
// part done) before a supervisor actually finalized it — see avgApprovalLagHours in
// ComplaintController.getAnalytics. This is exactly what the AI completion-suggestion banner
// (ComplaintPage.vue's status tab) exists to shrink; a rising trend here is a real signal
// supervisors are sitting on ready-to-close complaints.
const approvalLagLabel = computed(() => {
    const hours = complaintData.value.kpis.avgApprovalLagHours;
    if (hours == null) return '—';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
});

const totalTouchpoints = computed(() => (
    (complaintData.value.kpis.totalComplaints || 0) +
    (feedbackData.value.kpis.totalFeedback || 0) +
    discussionTotals.value.comments +
    pollTotals.value.votes
));

// Complaint satisfaction is a 1-5 star average; feedback satisfaction is already a 0-100%
// average — normalized onto the same 0-100 scale here so they can be blended into one headline
// number (weighted by how many ratings/responses back each side, so a channel with barely any
// ratings can't swing the blend as much as one with hundreds).
const complaintSatisfactionPct = computed(() => {
    const avg = complaintData.value.kpis.avgSatisfaction;
    return avg != null ? avg / 5 * 100 : null;
});
const complaintSatisfactionN = computed(() => complaintData.value.satisfaction?.totalRatings || 0);
const feedbackSatisfactionPct = computed(() => feedbackData.value.kpis.avgSatisfaction ?? null);
const feedbackSatisfactionN = computed(() => feedbackData.value.kpis.totalFeedback || 0);

const overallSatisfaction = computed(() => {
    const parts = [];
    if (complaintSatisfactionPct.value != null && complaintSatisfactionN.value > 0) {
        parts.push({ pct: complaintSatisfactionPct.value, n: complaintSatisfactionN.value });
    }
    if (feedbackSatisfactionPct.value != null && feedbackSatisfactionN.value > 0) {
        parts.push({ pct: feedbackSatisfactionPct.value, n: feedbackSatisfactionN.value });
    }
    if (!parts.length) return null;
    const totalN = parts.reduce((s, p) => s + p.n, 0);
    return +(parts.reduce((s, p) => s + p.pct * p.n, 0) / totalN).toFixed(1);
});
const overallSatisfactionLabel = computed(() => overallSatisfaction.value != null ? `${Math.round(overallSatisfaction.value)}%` : '—');

/* charts */

const filingsChartSeries = ref([]);
const filingsChartOptions = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: CHART_PALETTE,
    grid: { strokeDashArray: 4 },
    legend: { position: 'top', fontSize: '11px' },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const engagementChartSeries = ref([]);
const engagementChartOptions = ref({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: [nextChartColor(), nextChartColor()],
    legend: { position: 'top', fontSize: '11px' },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const satisfactionChartSeries = ref([{ name: 'Satisfaction', data: [] }]);
const satisfactionChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '50%' } },
    dataLabels: { enabled: true, formatter: (v) => v != null ? `${v}%` : 'n/a' },
    colors: [nextChartColor()],
    xaxis: { categories: ['Feedback', 'CSM Report'], max: 100 },
});

// Status breakdown bars — count/percent per status, read straight off
// complaintData.value.statusBreakdown by applyOverviewCharts (no chart-options object to keep in
// sync, unlike the apexchart panels around it).
const statusBreakdownRows = computed(() => {
    const rows = complaintData.value.statusBreakdown || [];
    const total = rows.reduce((sum, r) => sum + (r.count || 0), 0);
    return rows.map(r => ({
        status: r.status,
        count: r.count || 0,
        percent: total ? +(r.count / total * 100).toFixed(1) : 0,
    }));
});
const statusBreakdownTotal = computed(() => statusBreakdownRows.value.reduce((sum, r) => sum + r.count, 0));

const shareChartSeries = ref([]);
const shareChartOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

// Intake channel mix for the "Clients" section — registered account vs. guest OTP vs. staff walk-in.
const channelChartSeries = ref([]);
const channelChartOptions = ref({
    chart: { type: 'pie' },
    labels: ['Registered account', 'Guest (OTP)', 'Staff-filed'],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

// Adaptive bucketing, same convention as Complaint/Feedback's server-side trend charts and
// Discussion/Poll's own client-side one — daily across a week, weekly across a month, monthly
// across a year — used here to bucket Discussion/Poll (which have no server-side trend endpoint
// of their own) onto the same timeline as Complaint/Feedback's already-bucketed volumeTrend.
const buildBucketDefs = () => {
    const ref_ = overviewYear.value === currentYear ? moment() : moment(`${overviewYear.value}-12-31`, 'YYYY-MM-DD').endOf('day');
    if (overviewPeriod.value === 'week') {
        const start = moment(ref_).startOf('isoWeek');
        return Array.from({ length: 7 }, (_, i) => {
            const day = moment(start).add(i, 'days');
            return { label: day.format('ddd D'), start: moment(day).startOf('day'), end: moment(day).endOf('day') };
        });
    }
    if (overviewPeriod.value === 'year') {
        const start = moment(ref_).startOf('year');
        return Array.from({ length: 12 }, (_, i) => {
            const m = moment(start).add(i, 'months');
            return { label: m.format('MMM'), start: moment(m).startOf('month'), end: moment(m).endOf('month') };
        });
    }
    const start = moment(ref_).startOf('month');
    const weekSpan = Math.max(1, Math.ceil(moment(ref_).diff(start, 'days') / 7) + 1);
    return Array.from({ length: weekSpan }, (_, i) => {
        const w = moment(start).add(i, 'weeks');
        return { label: w.format('MMM D'), start: moment(w).startOf('day'), end: moment(w).add(6, 'days').endOf('day') };
    });
};

const applyOverviewCharts = () => {
    const bucketDefs = buildBucketDefs();
    const categories = bucketDefs.map(b => b.label);

    const discussionCounts = bucketDefs.map(() => 0);
    const commentCounts = bucketDefs.map(() => 0);
    discussionsRaw.value.forEach(d => {
        const created = moment(d.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            discussionCounts[idx]++;
            commentCounts[idx] += (d.commentCount || 0);
        }
    });

    const pollCounts = bucketDefs.map(() => 0);
    const voteCounts = bucketDefs.map(() => 0);
    pollsRaw.value.forEach(p => {
        const created = moment(p.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            pollCounts[idx]++;
            voteCounts[idx] += (p.totalVotes || 0);
        }
    });

    // Complaint/Feedback already come back bucketed from the server using the identical
    // period/year windowing convention — fall back to a flat zero series (matching this chart's
    // own bucket count) only if that data hasn't loaded yet, rather than mixing mismatched labels.
    const complaintCounts = complaintData.value.volumeTrend?.length === bucketDefs.length
        ? complaintData.value.volumeTrend.map(b => b.count)
        : bucketDefs.map(() => 0);
    const feedbackCounts = feedbackData.value.volumeTrend?.length === bucketDefs.length
        ? feedbackData.value.volumeTrend.map(b => b.count)
        : bucketDefs.map(() => 0);

    filingsChartSeries.value = [
        { name: 'Feedback', data: complaintCounts },
        { name: 'CSM Report', data: feedbackCounts },
        { name: 'Discussions', data: discussionCounts },
        { name: 'Polls', data: pollCounts },
    ];
    filingsChartOptions.value = { ...filingsChartOptions.value, xaxis: { ...filingsChartOptions.value.xaxis, categories } };

    engagementChartSeries.value = [
        { name: 'Discussion comments', data: commentCounts },
        { name: 'Poll votes', data: voteCounts },
    ];
    engagementChartOptions.value = { ...engagementChartOptions.value, xaxis: { ...engagementChartOptions.value.xaxis, categories } };

    satisfactionChartSeries.value = [{
        name: 'Satisfaction %',
        data: [
            complaintSatisfactionPct.value != null ? +complaintSatisfactionPct.value.toFixed(1) : null,
            feedbackSatisfactionPct.value != null ? +feedbackSatisfactionPct.value.toFixed(1) : null,
        ]
    }];

    // statusBreakdownRows/statusBreakdownTotal (the bars above) are computed straight off
    // complaintData.value.statusBreakdown — nothing to push into them here.

    shareChartSeries.value = [
        complaintData.value.kpis.totalComplaints || 0,
        feedbackData.value.kpis.totalFeedback || 0,
        discussionTotals.value.comments,
        pollTotals.value.votes,
    ];
    shareChartOptions.value = { ...shareChartOptions.value, labels: ['Feedback', 'CSM Report', 'Discussion comments', 'Poll votes'] };

    const ch = clientData.value.complaintsByChannel || {};
    channelChartSeries.value = [ch.account || 0, ch.otp || 0, ch.staff || 0];
};

const loadOverview = async () => {
    overviewLoading.value = true;
    try {
        const params = { period: overviewPeriod.value, year: overviewYear.value };
        const requests = [
            api.get('/complaint/analytics', { params }),
            api.get('/feedback/analytics', { params }),
            api.get('/discussion', { params }),
            api.get('/poll', { params }),
        ];
        // Client tiles are system-wide oversight data — only fetched for the roles that show them.
        if (canViewAll.value) requests.push(api.get('/report/client-overview', { params }));

        const [complaintRes, feedbackRes, discussionRes, pollRes, clientRes] = await Promise.all(requests);
        complaintData.value = complaintRes.data.data || { kpis: {}, statusBreakdown: [], volumeTrend: [], satisfaction: {} };
        feedbackData.value = feedbackRes.data.data || { kpis: {}, volumeTrend: [] };
        discussionsRaw.value = discussionRes.data.data || [];
        pollsRaw.value = pollRes.data.data || [];
        clientData.value = clientRes?.data.data || {};
        overviewScopeLabel.value = complaintData.value.scope?.label || feedbackData.value.scope?.label || '';
        overviewRangeLabel.value = complaintData.value.range?.label || '';
        applyOverviewCharts();
    } catch (error) {
        console.error('Error loading system overview:', error);
    } finally {
        overviewLoading.value = false;
    }
};

const setOverviewPeriod = (period) => {
    if (overviewPeriod.value === period) return;
    overviewPeriod.value = period;
    loadOverview();
};

const stepYear = (delta) => {
    const next = overviewYear.value + delta;
    if (next > currentYear) return;
    overviewYear.value = next;
    loadOverview();
};

/* -------------------- team roster -------------------- */
// GET /team/directory is the full roster (online AND offline) — AuthStore.loggedUsers is the
// live-updating "who's online right now" set the socket boot file already keeps current (see
// sockets/index.js's 'loadLogs' push), cross-referenced here rather than re-polled.

const teamRoster = ref([]); // [{ id, firstname, lastname, username, role, avatar, office, isOnline }]
const memberDialog = ref(false);
const selectedMemberId = ref(null);

const formatAvatar = (u) => `${process.env.VUE_APP_BACKEND_URL}${u.avatar || ''}`;

const onlineUserIds = computed(() => new Set((AuthStore.loggedUsers || []).map(l => l.userId)));

// Online members first, then alphabetical — same as any other "who's active" roster.
const team = computed(() => teamRoster.value
    .map(m => ({ ...m, isOnline: onlineUserIds.value.has(m.id) }))
    .sort((a, b) => (b.isOnline - a.isOnline) || (a.firstname || '').localeCompare(b.firstname || '')));
const onlineCount = computed(() => team.value.filter(m => m.isOnline).length);

const teamSearch = ref('');
const filteredTeam = computed(() => {
    const term = teamSearch.value.trim().toLowerCase();
    if (!term) return team.value;
    return team.value.filter(m =>
        `${m.firstname || ''} ${m.lastname || ''}`.toLowerCase().includes(term) ||
        (m.office || '').toLowerCase().includes(term) ||
        (m.role || '').toLowerCase().includes(term)
    );
});

// A live lookup into `team`, not a snapshot taken at click time — so if the open modal's member
// goes online/offline mid-conversation, its header badge follows along instead of freezing.
const selectedMember = computed(() => team.value.find(m => m.id === selectedMemberId.value) || null);

// Floating "back to top" for the team rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadTeam = async () => {
    try {
        const { data } = await api.get('/team/directory');
        teamRoster.value = data.data || [];
    } catch (error) {
        console.error('Error loading team directory:', error);
    }
};

const openMember = (member) => {
    selectedMemberId.value = member.id;
    memberDialog.value = true;
    // Optimistic — the actual mark-as-read happens server-side inside TeamMemberModal's
    // GET /messages/:userId (see MessageController.getConversation), this just clears the badge
    // immediately instead of waiting on that request to come back.
    const roster = teamRoster.value.find(m => m.id === member.id);
    if (roster) roster.unreadCount = 0;
};

// Bumps the sender's row badge the moment a message arrives, without a full directory reload —
// EXCEPT while that sender's own thread is the one currently open (memberDialog), since
// TeamMemberModal is already live-appending it there and it's being read as it arrives, not
// piling up unread.
const onIncomingMessage = (message) => {
    if (memberDialog.value && selectedMemberId.value === message.senderId) return;
    const roster = teamRoster.value.find(m => m.id === message.senderId);
    if (roster) roster.unreadCount = (roster.unreadCount || 0) + 1;
};

onMounted(() => {
    loadNavBadges();
    loadOverview();
    loadWeather();
    loadTeam();
    socket.on('message:new', onIncomingMessage);
});
onUnmounted(() => {
    socket.off('message:new', onIncomingMessage);
});
</script>

<style scoped>
/* Same rail+main split as the Feedback/Complaint pages (.fp-shell/.fp-main/.fp-rail) — a grid
   column reserves the 380px on the right (even though the rail card inside it goes position:fixed
   below, taking it out of flow — the grid still keeps that space blank so .hp-main's content never
   slides under it), collapsing to a single stacked column below the same 1200px breakpoint. */
.hp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .hp-shell {
        grid-template-columns: 1fr;
    }
}
.hp-main {
    min-width: 0;
}
.hp-rail {
    min-width: 0;
}
/* Same rail-list idiom as the Feedback/Complaint office rails (.fp-rail-card etc.) — colored
   left border by state, bold-caps + right-aligned stat header row, pill badge — AND now the same
   placement: pinned to the right edge, scrolling independently of the rest of the dashboard. */
.hp-team-card {
    background: #FFFFFF;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.hp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .hp-team-card {
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
.hp-team-head {
    padding: 16px;
    flex-shrink: 0;
}
.hp-team-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.hp-team-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.hp-team-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.hp-team-item:hover {
    background: #F6F9FC;
}
.hp-team-item.sev-good {
    border-left-color: var(--q-positive);
}
.hp-team-item.sev-flat {
    border-left-color: #E0E0E0;
}
/* An unread message is a stronger signal than plain online/offline — tints the whole row rather
   than fighting the online/offline border color for attention. */
.hp-team-item--unread {
    background: #FBE9EA;
}
.hp-team-item--unread:hover {
    background: #F7DCDE;
}
.hp-team-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.hp-team-pill--unread {
    background: #FBE6E8;
    color: #B3121F;
    display: inline-flex;
    align-items: center;
}
.hp-team-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.hp-hero {
    background: linear-gradient(135deg, var(--q-primary) 0%, #004ea8 100%);
}
.hp-avatar {
    background: rgba(255, 255, 255, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.6);
}
.hp-eyebrow {
    color: rgba(255, 255, 255, 0.85);
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
}
.hp-subtext {
    color: rgba(255, 255, 255, 0.8);
}

.hp-weather {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    position: relative;
    min-height: 44px;
}
.hp-weather-temp {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.1;
}
.hp-weather-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
}
.hp-weather-city {
    position: absolute;
    bottom: -18px;
    right: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.65);
    white-space: nowrap;
}

.hp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
.hp-kpi {
    padding: 16px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hp-kpi:hover {
    transform: translateY(-2px);
}
.hp-kpi-value {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
}
.hp-kpi-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.hp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.hp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.hp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.hp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.hp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.hp-analyze-btn {
    padding: 0 14px;
    min-height: 30px;
    position: relative;
    animation: hp-analyze-pulse 1.8s ease-in-out infinite;
}
.hp-analyze-btn :deep(.q-icon) {
    animation: hp-analyze-twinkle 1.8s ease-in-out infinite;
}
@keyframes hp-analyze-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 78, 168, 0.55); }
    50%      { box-shadow: 0 0 0 7px rgba(0, 78, 168, 0); }
}
@keyframes hp-analyze-twinkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(1.25); }
}
@media (prefers-reduced-motion: reduce) {
    .hp-analyze-btn,
    .hp-analyze-btn :deep(.q-icon) { animation: none; }
}

.hp-client-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: 16px 12px;
    text-align: center;
}

.hp-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
}
.hp-stat {
    width: 100%;
    min-height: 84px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.hp-stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.2;
}
.hp-stat-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-top: 2px;
}

.hp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 12px;
}
.hp-panel {
    min-width: 0;
}

.hp-module-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}
.hp-module {
    padding: 18px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hp-module:hover {
    transform: translateY(-2px);
}

@media (max-width: 900px) {
    .hp-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .hp-stat-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
