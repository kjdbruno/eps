<template>
    <div class="rp-shell">
        <div class="row items-center justify-between q-mb-md rp-header">
            <div>
                <div class="rp-eyebrow">data-driven governance</div>
                <div class="text-h5">Reports</div>
            </div>
            <div class="row items-center q-gutter-sm">
                <div class="rp-year-group">
                    <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                        <q-tooltip>Previous year</q-tooltip>
                    </q-btn>
                    <div class="rp-year-value">{{ year }}</div>
                    <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="year >= currentYear" @click="stepYear(1)">
                        <q-tooltip>Next year</q-tooltip>
                    </q-btn>
                </div>
                <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="loading" @click="loadActiveTab">
                    <q-tooltip>Refresh</q-tooltip>
                </q-btn>
                <q-btn unelevated no-caps size="sm" color="primary" rounded label="Export PDF" :loading="exporting" @click="exportPdf" />
            </div>
        </div>

        <!-- Same pill-button tab pattern as the Preference page / Complaint detail modal. -->
        <q-card-section class="q-pa-md radius-sm bg-accent q-mb-md">
            <div class="q-gutter-xs">
                <q-btn
                    v-for="t in tabs" :key="t.key"
                    unelevated no-caps rounded size="sm"
                    :class="tab === t.key ? 'bg-primary text-white' : 'bg-accent'"
                    :label="t.label"
                    @click="tab = t.key"
                />
            </div>
        </q-card-section>

        <!-- ============================== SUMMARY ============================== -->
        <div v-if="tab === 'summary'">
            <div class="rp-kpi-grid q-mb-md">
                <q-card flat class="rp-kpi radius-xs bg-primary">
                    <div class="rp-kpi-value text-white">{{ overallSatisfactionLabel }}</div>
                    <div class="rp-kpi-label text-white">overall citizen satisfaction</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ summary.complaint.kpis.totalComplaints ?? 0 }}</div>
                    <div class="rp-kpi-label text-grey">feedback filed</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ summary.feedback.kpis.totalFeedback ?? 0 }}</div>
                    <div class="rp-kpi-label text-grey">CSM reports collected</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ discussionTotals.topics }}</div>
                    <div class="rp-kpi-label text-grey">discussions opened</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ pollTotals.polls }}</div>
                    <div class="rp-kpi-label text-grey">polls created</div>
                </q-card>
            </div>

            <q-card flat class="custom-border radius-xs">
                <q-card-section>
                    <div class="text-caption text-uppercase text-grey q-mb-sm">{{ year }} at a glance, by module</div>
                </q-card-section>
                <!-- List-item pattern, same basis as the Preference pages (OfficePreferenceComponent.vue):
                     q-list separator > q-item with an avatar, a title, and a right-aligned stat cluster —
                     used in place of a table across every report section below. -->
                <q-list separator>
                    <q-item v-for="row in moduleGlance" :key="row.label" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" :icon="row.icon" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ row.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat" v-for="s in row.stats" :key="s.label">
                                    <span class="text-caption text-grey text-uppercase">{{ s.label }}</span>
                                    <span class="text-caption text-weight-bold">{{ s.value }}</span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>
        </div>

        <!-- ===================== OFFICE PERFORMANCE & COMPLIANCE ===================== -->
        <div v-if="tab === 'performance'">
            <div class="rp-kpi-grid q-mb-md">
                <q-card flat class="rp-kpi radius-xs bg-primary">
                    <div class="rp-kpi-value text-white">{{ performance.systemReassignmentRate ?? 0 }}%</div>
                    <div class="rp-kpi-label text-white">system-wide reassignment rate</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ officesMeetingCompliance }}</div>
                    <div class="rp-kpi-label text-grey">offices &ge;80% ARTA-compliant</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ officesNeedingAttention }}</div>
                    <div class="rp-kpi-label text-grey">offices &lt;60% ARTA-compliant</div>
                </q-card>
            </div>

            <q-card flat class="custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-xs">office performance scorecard &middot; {{ year }}</div>
                <div class="text-caption text-grey q-mb-sm">
                    Assigned/received/completed counts, average ack &amp; resolution time, ARTA/EODB compliance rate (resolved within the
                    feedback's own complexity-tier deadline), AI auto-assignment rate, and satisfaction on both citizen channels.
                </div>
                <q-list separator class="rp-office-list">
                    <q-item v-for="o in performanceSorted" :key="o.officeId" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" icon="bi-building" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ o.officeName }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">assigned</span>
                                    <span class="text-caption text-weight-bold">{{ o.totalAssigned }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">received</span>
                                    <span class="text-caption text-weight-bold">{{ o.totalReceived }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">completed</span>
                                    <span class="text-caption text-weight-bold">{{ o.totalCompleted }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">avg ack (h)</span>
                                    <span class="text-caption text-weight-bold">{{ o.avgAcknowledgmentHours ?? '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">avg resolution (h)</span>
                                    <span class="text-caption text-weight-bold">{{ o.avgResolutionHours ?? '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">ARTA compliance</span>
                                    <span class="text-caption text-weight-bold" :class="complianceClass(o)">{{ o.totalCompleted ? (100 - (o.overdueRate ?? 0)).toFixed(1) + '%' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">AI-assigned</span>
                                    <span class="text-caption text-weight-bold">{{ o.aiAssignedRate != null ? o.aiAssignedRate + '%' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">feedback sat.</span>
                                    <span class="text-caption text-weight-bold">{{ o.avgComplaintSatisfaction != null ? o.avgComplaintSatisfaction + ' ★' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">CSM sat.</span>
                                    <span class="text-caption text-weight-bold">{{ o.avgFeedbackSatisfaction != null ? o.avgFeedbackSatisfaction + '%' : '—' }}</span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>
        </div>

        <!-- ===================== ACCOUNT PERFORMANCE ===================== -->
        <div v-if="tab === 'accounts'">
            <div class="rp-kpi-grid q-mb-md">
                <q-card flat class="rp-kpi radius-xs bg-primary">
                    <div class="rp-kpi-value text-white">{{ accountPerformance.data.length }}</div>
                    <div class="rp-kpi-label text-white">admin/workstation accounts</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ systemAvgCorrectionRate != null ? systemAvgCorrectionRate + '%' : '—' }}</div>
                    <div class="rp-kpi-label text-grey">system-wide "done" correction rate</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ accountsWithCorrections }}</div>
                    <div class="rp-kpi-label text-grey">accounts with a corrected "done"</div>
                </q-card>
            </div>

            <q-card flat class="custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-xs">account performance scorecard &middot; {{ year }}</div>
                <div class="text-caption text-grey q-mb-sm">
                    Received/completed/responded counts, average ack &amp; resolution time (per-account, not per-office),
                    citizen satisfaction on their own responses, and how often a supervisor sent their "done" mark back.
                </div>
                <q-list separator class="rp-office-list">
                    <q-item v-for="a in accountsSorted" :key="a.userId" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" icon="bi-person-badge" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ a.name }}</q-item-label>
                            <q-item-label caption class="text-uppercase">
                                {{ a.role }}<template v-if="a.office"> &middot; {{ a.office }}</template>
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">received</span>
                                    <span class="text-caption text-weight-bold">{{ a.totalReceived }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">completed</span>
                                    <span class="text-caption text-weight-bold">{{ a.totalCompleted }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">responses</span>
                                    <span class="text-caption text-weight-bold">{{ a.totalResponses }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">avg ack (h)</span>
                                    <span class="text-caption text-weight-bold">{{ a.avgAcknowledgmentHours ?? '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">avg resolution (h)</span>
                                    <span class="text-caption text-weight-bold">{{ a.avgResolutionHours ?? '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">ARTA compliance</span>
                                    <span class="text-caption text-weight-bold" :class="complianceClass(a)">{{ a.totalCompleted ? accountComplianceRate(a).toFixed(1) + '%' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">satisfaction</span>
                                    <span class="text-caption text-weight-bold">{{ a.avgSatisfaction != null ? a.avgSatisfaction + ' ★' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">"done" corrections</span>
                                    <span class="text-caption text-weight-bold" :class="a.undoneCount ? 'text-negative' : ''">
                                        {{ a.undoneCount }}{{ a.correctionRate != null ? ` (${a.correctionRate}%)` : '' }}
                                    </span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
                <div class="text-caption text-grey q-pa-md" v-if="!accountsSorted.length">
                    No admin/workstation accounts found.
                </div>
            </q-card>
        </div>

        <!-- ========================= CITIZEN SATISFACTION / CSM ========================= -->
        <div v-if="tab === 'csm'">
            <div class="rp-kpi-grid q-mb-md">
                <q-card flat class="rp-kpi radius-xs bg-primary">
                    <div class="rp-kpi-value text-white">{{ systemCsmAverage }}</div>
                    <div class="rp-kpi-label text-white">system-wide CSM score</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ csm.csm.reduce((s, o) => s + o.totalRespondents, 0) }}</div>
                    <div class="rp-kpi-label text-grey">total respondents</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ lowestSqdLabel }}</div>
                    <div class="rp-kpi-label text-grey">lowest-scoring dimension</div>
                </q-card>
            </div>

            <q-card flat class="custom-border radius-xs q-pa-md q-mb-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">Client Satisfaction Measurement (CSM) by office &middot; {{ year }}</div>
                <div class="text-caption text-grey q-mb-sm">The ARTA-mandated 8-dimension CSM survey (SQD0-8), collected via kiosk/manual CSM report entries.</div>
                <q-list separator class="rp-office-list">
                    <q-item v-for="o in csm.csm" :key="o.officeId" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" icon="bi-building" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ o.officeName }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">respondents</span>
                                    <span class="text-caption text-weight-bold">{{ o.totalRespondents }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">overall %</span>
                                    <span class="text-caption text-weight-bold">{{ o.avgSatisfaction != null ? o.avgSatisfaction + '%' : '—' }}</span>
                                </div>
                                <div class="rp-stat" v-for="(v, i) in o.sqdAverages" :key="i">
                                    <span class="text-caption text-grey text-uppercase">
                                        SQD{{ i }}
                                        <q-tooltip>{{ csm.sqdLabels[i] }}</q-tooltip>
                                    </span>
                                    <span class="text-caption text-weight-bold">{{ v ?? '—' }}</span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>

            <q-card flat class="custom-border radius-xs q-pa-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">Feedback vs. CSM report satisfaction &middot; {{ year }}</div>
                <div class="text-caption text-grey q-mb-sm">Two different scales on purpose — feedback responses are rated 1-5 stars by the citizen; CSM reports use the CSM % above.</div>
                <q-list separator class="rp-office-list">
                    <q-item v-for="o in csm.comparison" :key="o.officeId" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" icon="bi-building" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ o.officeName }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">feedback sat.</span>
                                    <span class="text-caption text-weight-bold">{{ o.complaintSatisfaction != null ? o.complaintSatisfaction + ' ★' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">ratings</span>
                                    <span class="text-caption text-weight-bold">{{ o.complaintRatingCount }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">CSM sat.</span>
                                    <span class="text-caption text-weight-bold">{{ o.feedbackSatisfaction != null ? o.feedbackSatisfaction + '%' : '—' }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">responses</span>
                                    <span class="text-caption text-weight-bold">{{ o.feedbackCount }}</span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>
        </div>

        <!-- ============================== CIVIC ENGAGEMENT ============================== -->
        <div v-if="tab === 'engagement'">
            <div class="rp-kpi-grid q-mb-md">
                <q-card flat class="rp-kpi radius-xs bg-primary">
                    <div class="rp-kpi-value text-white">{{ discussionTotals.topics + pollTotals.polls }}</div>
                    <div class="rp-kpi-label text-white">total topics opened</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ discussionTotals.comments + pollTotals.votes }}</div>
                    <div class="rp-kpi-label text-grey">total engagements</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ guestSharePct }}%</div>
                    <div class="rp-kpi-label text-grey">from guests (not signed in)</div>
                </q-card>
                <q-card flat class="rp-kpi radius-xs custom-border">
                    <div class="rp-kpi-value text-primary">{{ combinedReopenRate }}</div>
                    <div class="rp-kpi-label text-grey">reopen rate (discussion / poll)</div>
                </q-card>
            </div>

            <div class="rp-panel-grid">
                <q-card flat class="custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">comment / vote mix &middot; guest vs. registered</div>
                    <apexchart type="pie" height="280" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                </q-card>
                <q-card flat class="custom-border radius-xs q-pa-md">
                    <div class="text-caption text-uppercase text-grey q-mb-sm">most-discussed topics &middot; {{ year }}</div>
                    <apexchart type="bar" height="220" :options="topDiscussedOptions" :series="topDiscussedSeries" />
                </q-card>
            </div>

            <q-card flat class="custom-border radius-xs q-pa-md q-mt-md">
                <div class="text-caption text-uppercase text-grey q-mb-sm">by office &middot; topics assigned</div>
                <q-list separator class="rp-office-list">
                    <q-item v-for="row in engagementByOffice" :key="row.label" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" icon="bi-building" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label class="text-uppercase text-weight-bold">{{ row.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top class="rp-stat-section">
                            <div class="rp-stat-wrap">
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">discussions</span>
                                    <span class="text-caption text-weight-bold">{{ row.discussions }}</span>
                                </div>
                                <div class="rp-stat">
                                    <span class="text-caption text-grey text-uppercase">polls</span>
                                    <span class="text-caption text-weight-bold">{{ row.polls }}</span>
                                </div>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>
        </div>

        <!-- ============================== ACTIVITY LOG ============================== -->
        <div v-if="tab === 'activity'">
            <div class="row items-center justify-between q-mb-sm">
                <div class="row items-baseline q-gutter-xs">
                    <div class="text-h6 text-capitalize">activity log</div>
                    <div class="text-caption text-grey">{{ filteredActivityLog.length }} of {{ activityLog.length }}</div>
                </div>
            </div>
            <div class="text-caption text-grey q-mb-sm">
                Every internal action across the system &middot; {{ year }} — feedback handling (from ComplaintHistory) plus
                Discussion/Poll/Office/User/Holiday/CSM report administration, newest first.
            </div>
            <div class="row items-center q-gutter-sm q-mb-md">
                <q-input outlined dense v-model="activitySearch" placeholder="Search description or staff name..." class="col">
                    <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                </q-input>
                <q-select
                    outlined dense emit-value map-options
                    v-model="activityModule" :options="activityModuleOptions"
                    style="min-width: 180px;"
                />
            </div>

            <q-card flat class="no-shadow custom-border radius-sm">
                <q-list separator v-if="filteredActivityLog.length" class="rp-office-list">
                    <q-item v-for="(row, i) in filteredActivityLog" :key="i" class="q-pa-md">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white" :icon="MODULE_ICONS[row.module] || 'bi-info-circle'" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ row.description }}</q-item-label>
                            <q-item-label caption>{{ row.actorLabel || 'System' }} &middot; {{ formatDateTime(row.createdAt) }}</q-item-label>
                        </q-item-section>
                        <q-item-section side top>
                            <q-badge outline :color="ACTION_COLORS[row.action] || 'grey'" class="text-uppercase q-mb-xs">{{ row.action }}</q-badge>
                            <div class="text-caption text-grey text-uppercase">{{ moduleLabel(row.module) }}</div>
                        </q-item-section>
                    </q-item>
                </q-list>
                <div v-else class="q-pa-xl text-center text-grey">
                    <q-icon name="bi-clock-history" size="2em" class="q-mb-sm" />
                    <div class="text-caption text-uppercase">no activity recorded for {{ year }}</div>
                </div>
            </q-card>
        </div>

        <!-- Preview, not download — same pattern as the Feedback module's rating PDF
             (FeedbackOfficeComponent.vue): fetch as arraybuffer, wrap in a blob URL, show it in
             an iframe inside a full-height/full-width dialog instead of triggering a save-file. -->
        <q-dialog v-model="previewDialog" full-height full-width>
            <q-card>
                <q-btn icon="close" class="fixed bg-white" round dense v-close-popup style="top: 25px; right: 10px; transform: translateY(-50%); z-index: 999;" />
                <q-card-section class="q-pa-none">
                    <div v-if="previewUrl" class="rp-pdf-frame">
                        <iframe :src="previewUrl" height="100%" width="100%" />
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';
import Apexchart from 'vue3-apexcharts';
import { Toast } from 'src/boot/sweetalert';

// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (5 distinct, repeated 3x below to match the array length every
// multi-item chart on this page already expects), just randomized which color lands where.
// Multi-item charts (donuts, multi-series bar) still pass the whole array — Apex assigns one
// color per slice/series positionally. nextChartColor() hands single-series charts one color
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

const currentYear = moment().year();
const year = ref(currentYear);
const loading = ref(false);

const tabs = [
    { key: 'summary', label: 'summary' },
    { key: 'performance', label: 'office performance & compliance' },
    { key: 'accounts', label: 'account performance' },
    { key: 'csm', label: 'citizen satisfaction (CSM)' },
    { key: 'engagement', label: 'civic engagement' },
    { key: 'activity', label: 'activity log' },
];
const tab = ref('summary');

/* -------------------- data stores per tab -------------------- */

const summary = ref({ complaint: { kpis: {} }, feedback: { kpis: {} } });
const performance = ref({ data: [], systemReassignmentRate: 0 });
const accountPerformance = ref({ data: [] });
const csm = ref({ csm: [], comparison: [], sqdLabels: [] });
const discussionsRaw = ref([]);
const discussionStats = ref({ reopenRate: null, commentAuthorMix: [] });
const pollsRaw = ref([]);
const pollStats = ref({ reopenRate: null, voteAuthorMix: [] });

const discussionTotals = computed(() => ({
    topics: discussionsRaw.value.length,
    comments: discussionsRaw.value.reduce((s, d) => s + (d.commentCount || 0), 0),
}));
const pollTotals = computed(() => ({
    polls: pollsRaw.value.length,
    votes: pollsRaw.value.reduce((s, p) => s + (p.totalVotes || 0), 0),
}));

// Drives the "at a glance, by module" list — same {volume, engagement, satisfaction/rate}
// columns the table used to have, just reshaped into per-row stat pairs.
const moduleGlance = computed(() => [
    {
        label: 'Feedback',
        icon: 'bi-chat-quote',
        stats: [
            { label: 'volume', value: `${summary.value.complaint.kpis.totalComplaints ?? 0} filed` },
            { label: 'engagement', value: `${summary.value.complaint.kpis.unassignedCount ?? 0} unassigned` },
            { label: 'satisfaction', value: summary.value.complaint.kpis.avgSatisfaction != null ? summary.value.complaint.kpis.avgSatisfaction + ' ★' : '—' },
        ],
    },
    {
        label: 'CSM Report',
        icon: 'bi-emoji-expressionless',
        stats: [
            { label: 'volume', value: `${summary.value.feedback.kpis.totalFeedback ?? 0} responses` },
            { label: 'engagement', value: `${summary.value.feedback.kpis.kioskCount ?? 0} via kiosk` },
            { label: 'satisfaction', value: summary.value.feedback.kpis.avgSatisfaction != null ? summary.value.feedback.kpis.avgSatisfaction + '%' : '—' },
        ],
    },
    {
        label: 'Discussion',
        icon: 'bi-chat-left-text',
        stats: [
            { label: 'volume', value: `${discussionTotals.value.topics} topics` },
            { label: 'engagement', value: `${discussionTotals.value.comments} comments` },
            { label: 'rate', value: discussionStats.value.reopenRate != null ? discussionStats.value.reopenRate + '% reopened' : '—' },
        ],
    },
    {
        label: 'Poll',
        icon: 'bi-bar-chart-line',
        stats: [
            { label: 'volume', value: `${pollTotals.value.polls} polls` },
            { label: 'engagement', value: `${pollTotals.value.votes} votes` },
            { label: 'rate', value: pollStats.value.reopenRate != null ? pollStats.value.reopenRate + '% reopened' : '—' },
        ],
    },
]);

/* -------------------- summary tab -------------------- */

const overallSatisfaction = computed(() => {
    const cPct = summary.value.complaint.kpis.avgSatisfaction != null ? summary.value.complaint.kpis.avgSatisfaction / 5 * 100 : null;
    const cN = summary.value.complaint.satisfaction?.totalRatings || 0;
    const fPct = summary.value.feedback.kpis.avgSatisfaction ?? null;
    const fN = summary.value.feedback.kpis.totalFeedback || 0;
    const parts = [];
    if (cPct != null && cN > 0) parts.push({ pct: cPct, n: cN });
    if (fPct != null && fN > 0) parts.push({ pct: fPct, n: fN });
    if (!parts.length) return null;
    const totalN = parts.reduce((s, p) => s + p.n, 0);
    return +(parts.reduce((s, p) => s + p.pct * p.n, 0) / totalN).toFixed(1);
});
const overallSatisfactionLabel = computed(() => overallSatisfaction.value != null ? `${Math.round(overallSatisfaction.value)}%` : '—');

const loadSummary = async () => {
    const params = { period: 'year', year: year.value };
    const [complaintRes, feedbackRes] = await Promise.all([
        api.get('/complaint/analytics', { params }),
        api.get('/feedback/analytics', { params }),
    ]);
    summary.value = {
        complaint: complaintRes.data.data || { kpis: {} },
        feedback: feedbackRes.data.data || { kpis: {} },
    };
};

/* -------------------- office performance tab -------------------- */

const performanceSorted = computed(() => [...performance.value.data].sort((a, b) => (b.totalAssigned || 0) - (a.totalAssigned || 0)));
const complianceRate = (o) => o.totalCompleted ? 100 - (o.overdueRate ?? 0) : null;
const officesMeetingCompliance = computed(() => performance.value.data.filter(o => o.totalCompleted && complianceRate(o) >= 80).length);
const officesNeedingAttention = computed(() => performance.value.data.filter(o => o.totalCompleted && complianceRate(o) < 60).length);
const complianceClass = (o) => {
    const rate = complianceRate(o);
    if (rate == null) return 'text-grey';
    if (rate >= 80) return 'text-positive text-weight-bold';
    if (rate >= 60) return 'text-warning text-weight-bold';
    return 'text-negative text-weight-bold';
};

const loadPerformance = async () => {
    const response = await api.get('/report/office-performance', { params: { year: year.value } });
    performance.value = response.data || { data: [], systemReassignmentRate: 0 };
};

/* -------------------- account performance tab -------------------- */
// One row per admin/workstation account — distinct from the office scorecard above, which blends
// everyone assigned to that office into one figure. See ReportController.getAccountPerformanceReport.

const accountsSorted = computed(() => [...accountPerformance.value.data].sort((a, b) => (b.totalCompleted || 0) - (a.totalCompleted || 0)));
const accountComplianceRate = (a) => a.totalCompleted ? 100 - (a.overdueRate ?? 0) : null;
const accountsWithCorrections = computed(() => accountPerformance.value.data.filter(a => a.undoneCount > 0).length);
const systemAvgCorrectionRate = computed(() => {
    const withCompletions = accountPerformance.value.data.filter(a => (a.totalCompleted || 0) + (a.undoneCount || 0) > 0);
    if (!withCompletions.length) return null;
    const totalUndone = withCompletions.reduce((s, a) => s + (a.undoneCount || 0), 0);
    const totalDenominator = withCompletions.reduce((s, a) => s + (a.totalCompleted || 0) + (a.undoneCount || 0), 0);
    return totalDenominator ? +(totalUndone / totalDenominator * 100).toFixed(1) : null;
});

const loadAccountPerformance = async () => {
    const response = await api.get('/report/account-performance', { params: { year: year.value } });
    accountPerformance.value = response.data || { data: [] };
};

/* -------------------- CSM tab -------------------- */

const systemCsmAverage = computed(() => {
    const withData = csm.value.csm.filter(o => o.totalRespondents > 0);
    if (!withData.length) return '—';
    const totalN = withData.reduce((s, o) => s + o.totalRespondents, 0);
    const weighted = withData.reduce((s, o) => s + o.avgSatisfaction * o.totalRespondents, 0) / totalN;
    return `${weighted.toFixed(1)}%`;
});
const lowestSqdLabel = computed(() => {
    const labels = csm.value.sqdLabels;
    if (!labels.length) return '—';
    const dims = labels.map((label, i) => {
        const values = csm.value.csm.map(o => o.sqdAverages[i]).filter(v => v != null);
        return { label, avg: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null };
    }).filter(d => d.avg != null);
    if (!dims.length) return '—';
    dims.sort((a, b) => a.avg - b.avg);
    return dims[0].label;
});

const loadCsm = async () => {
    const response = await api.get('/report/csm', { params: { year: year.value } });
    csm.value = response.data || { csm: [], comparison: [], sqdLabels: [] };
};

/* -------------------- civic engagement tab -------------------- */

const guestSharePct = computed(() => {
    const dMix = discussionStats.value.commentAuthorMix || [];
    const pMix = pollStats.value.voteAuthorMix || [];
    const guest = (dMix.find(m => m.label === 'Guest')?.count || 0) + (pMix.find(m => m.label === 'Guest')?.count || 0);
    const registered = (dMix.find(m => m.label === 'Registered')?.count || 0) + (pMix.find(m => m.label === 'Registered')?.count || 0);
    const total = guest + registered;
    return total ? Math.round((guest / total) * 100) : 0;
});
const combinedReopenRate = computed(() => {
    const d = discussionStats.value.reopenRate;
    const p = pollStats.value.reopenRate;
    if (d == null && p == null) return '—';
    const parts = [d, p].filter(v => v != null);
    return `${(parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1)}%`;
});

const authorMixChartSeries = ref([]);
const authorMixChartOptions = ref({
    chart: { type: 'pie' }, labels: [], colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' }, dataLabels: { enabled: true },
});
const topDiscussedSeries = ref([{ name: 'Comments', data: [] }]);
const topDiscussedOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true }, colors: [nextChartColor()], xaxis: { categories: [] },
});
const engagementByOffice = computed(() => {
    const byOffice = {};
    discussionsRaw.value.forEach(d => (d.offices || []).forEach(o => {
        const label = o.name;
        if (!byOffice[label]) byOffice[label] = { label, discussions: 0, polls: 0 };
        byOffice[label].discussions += 1;
    }));
    pollsRaw.value.forEach(p => (p.offices || []).forEach(o => {
        const label = o.name;
        if (!byOffice[label]) byOffice[label] = { label, discussions: 0, polls: 0 };
        byOffice[label].polls += 1;
    }));
    return Object.values(byOffice).sort((a, b) => (b.discussions + b.polls) - (a.discussions + a.polls));
});

const applyEngagementCharts = () => {
    const dMix = discussionStats.value.commentAuthorMix || [];
    const pMix = pollStats.value.voteAuthorMix || [];
    const guest = (dMix.find(m => m.label === 'Guest')?.count || 0) + (pMix.find(m => m.label === 'Guest')?.count || 0);
    const registered = (dMix.find(m => m.label === 'Registered')?.count || 0) + (pMix.find(m => m.label === 'Registered')?.count || 0);
    authorMixChartSeries.value = [registered, guest];
    authorMixChartOptions.value = { ...authorMixChartOptions.value, labels: ['Registered', 'Guest'] };

    const topDiscussed = [...discussionsRaw.value]
        .filter(d => d.commentCount > 0)
        .sort((a, b) => b.commentCount - a.commentCount)
        .slice(0, 8);
    topDiscussedSeries.value = [{ name: 'Comments', data: topDiscussed.map(d => d.commentCount) }];
    topDiscussedOptions.value = {
        ...topDiscussedOptions.value,
        xaxis: { ...topDiscussedOptions.value.xaxis, categories: topDiscussed.map(d => (d.title || '').length > 28 ? d.title.slice(0, 28) + '…' : d.title) }
    };
};

const loadEngagement = async () => {
    const params = { period: 'year', year: year.value };
    const [discussionRes, pollRes] = await Promise.all([
        api.get('/discussion', { params }),
        api.get('/poll', { params: { ...params, guestToken: null } }),
    ]);
    discussionsRaw.value = discussionRes.data.data || [];
    discussionStats.value = discussionRes.data.stats || { reopenRate: null, commentAuthorMix: [] };
    pollsRaw.value = pollRes.data.data || [];
    pollStats.value = pollRes.data.stats || { reopenRate: null, voteAuthorMix: [] };
    applyEngagementCharts();
};

/* -------------------- export to PDF -------------------- */
// Builds the exact same values already on screen for the active tab into the plain
// {title, kpis, sections} shape ReportController.exportPdf's Pug template expects — a genuine
// "print what you're looking at", not a second, possibly-drifting derivation server-side.

const exporting = ref(false);
const previewDialog = ref(false);
const previewUrl = ref(null);
const cell = (value, tone) => ({ value: value ?? '—', tone });
const toneFor = (rate) => rate == null ? null : rate >= 80 ? 'good' : rate >= 60 ? 'warn' : 'bad';

const buildExportPayload = () => {
    const meta = `Year ${year.value}`;

    if (tab.value === 'summary') {
        return {
            title: 'Summary Report',
            meta,
            kpis: [
                { label: 'overall citizen satisfaction', value: overallSatisfactionLabel.value },
                { label: 'feedback filed', value: String(summary.value.complaint.kpis.totalComplaints ?? 0) },
                { label: 'CSM reports collected', value: String(summary.value.feedback.kpis.totalFeedback ?? 0) },
                { label: 'discussions opened', value: String(discussionTotals.value.topics) },
                { label: 'polls created', value: String(pollTotals.value.polls) },
            ],
            sections: [{
                title: `${year.value} at a glance, by module`,
                columns: [{ label: 'module' }, { label: 'volume', num: true }, { label: 'engagement', num: true }, { label: 'satisfaction / rate', num: true }],
                rows: [
                    [cell('Feedback'), cell(`${summary.value.complaint.kpis.totalComplaints ?? 0} filed`), cell(`${summary.value.complaint.kpis.unassignedCount ?? 0} unassigned`), cell(summary.value.complaint.kpis.avgSatisfaction != null ? summary.value.complaint.kpis.avgSatisfaction + ' ★' : '—')],
                    [cell('CSM Report'), cell(`${summary.value.feedback.kpis.totalFeedback ?? 0} responses`), cell(`${summary.value.feedback.kpis.kioskCount ?? 0} via kiosk`), cell(summary.value.feedback.kpis.avgSatisfaction != null ? summary.value.feedback.kpis.avgSatisfaction + '%' : '—')],
                    [cell('Discussion'), cell(`${discussionTotals.value.topics} topics`), cell(`${discussionTotals.value.comments} comments`), cell(discussionStats.value.reopenRate != null ? discussionStats.value.reopenRate + '% reopened' : '—')],
                    [cell('Poll'), cell(`${pollTotals.value.polls} polls`), cell(`${pollTotals.value.votes} votes`), cell(pollStats.value.reopenRate != null ? pollStats.value.reopenRate + '% reopened' : '—')],
                ]
            }]
        };
    }

    if (tab.value === 'performance') {
        return {
            title: 'Office Performance & Compliance',
            meta,
            kpis: [
                { label: 'system-wide reassignment rate', value: `${performance.value.systemReassignmentRate ?? 0}%` },
                { label: 'offices ≥80% ARTA-compliant', value: String(officesMeetingCompliance.value) },
                { label: 'offices <60% ARTA-compliant', value: String(officesNeedingAttention.value) },
            ],
            sections: [{
                title: `office performance scorecard · ${year.value}`,
                note: 'Assigned/received/completed counts, average ack & resolution time, ARTA/EODB compliance rate, AI auto-assignment rate, and satisfaction on both citizen channels.',
                columns: [
                    { label: 'office' }, { label: 'assigned', num: true }, { label: 'received', num: true }, { label: 'completed', num: true },
                    { label: 'avg ack (h)', num: true }, { label: 'avg resolution (h)', num: true }, { label: 'ARTA compliance', num: true },
                    { label: 'AI-assigned', num: true }, { label: 'feedback sat.', num: true }, { label: 'CSM sat.', num: true }
                ],
                rows: performanceSorted.value.map(o => {
                    const rate = complianceRate(o);
                    return [
                        cell(o.officeAlias || o.officeName), cell(o.totalAssigned), cell(o.totalReceived), cell(o.totalCompleted),
                        cell(o.avgAcknowledgmentHours ?? '—'), cell(o.avgResolutionHours ?? '—'),
                        cell(o.totalCompleted ? rate.toFixed(1) + '%' : '—', o.totalCompleted ? toneFor(rate) : null),
                        cell(o.aiAssignedRate != null ? o.aiAssignedRate + '%' : '—'),
                        cell(o.avgComplaintSatisfaction != null ? o.avgComplaintSatisfaction + ' ★' : '—'),
                        cell(o.avgFeedbackSatisfaction != null ? o.avgFeedbackSatisfaction + '%' : '—'),
                    ];
                })
            }]
        };
    }

    if (tab.value === 'accounts') {
        return {
            title: 'Account Performance',
            meta,
            kpis: [
                { label: 'admin/workstation accounts', value: String(accountPerformance.value.data.length) },
                { label: 'system-wide "done" correction rate', value: systemAvgCorrectionRate.value != null ? `${systemAvgCorrectionRate.value}%` : '—' },
                { label: 'accounts with a corrected "done"', value: String(accountsWithCorrections.value) },
            ],
            sections: [{
                title: `account performance scorecard · ${year.value}`,
                note: 'Received/completed/responded counts and average ack/resolution time are per-account (not per-office); satisfaction is on that account\'s own responses; "done" corrections counts how often a supervisor sent their completion mark back.',
                columns: [
                    { label: 'account' }, { label: 'role' }, { label: 'office' },
                    { label: 'received', num: true }, { label: 'completed', num: true }, { label: 'responses', num: true },
                    { label: 'avg ack (h)', num: true }, { label: 'avg resolution (h)', num: true }, { label: 'ARTA compliance', num: true },
                    { label: 'satisfaction', num: true }, { label: '"done" corrections', num: true }
                ],
                rows: accountsSorted.value.map(a => {
                    const rate = accountComplianceRate(a);
                    return [
                        cell(a.name), cell(a.role), cell(a.office || '—'),
                        cell(a.totalReceived), cell(a.totalCompleted), cell(a.totalResponses),
                        cell(a.avgAcknowledgmentHours ?? '—'), cell(a.avgResolutionHours ?? '—'),
                        cell(a.totalCompleted ? rate.toFixed(1) + '%' : '—', a.totalCompleted ? toneFor(rate) : null),
                        cell(a.avgSatisfaction != null ? a.avgSatisfaction + ' ★' : '—'),
                        cell(a.correctionRate != null ? `${a.undoneCount} (${a.correctionRate}%)` : String(a.undoneCount), a.undoneCount ? 'bad' : null),
                    ];
                })
            }]
        };
    }

    if (tab.value === 'csm') {
        return {
            title: 'Citizen Satisfaction (CSM)',
            meta,
            kpis: [
                { label: 'system-wide CSM score', value: systemCsmAverage.value },
                { label: 'total respondents', value: String(csm.value.csm.reduce((s, o) => s + o.totalRespondents, 0)) },
                { label: 'lowest-scoring dimension', value: lowestSqdLabel.value },
            ],
            sections: [
                {
                    title: `Client Satisfaction Measurement (CSM) by office · ${year.value}`,
                    note: 'The ARTA-mandated 8-dimension CSM survey (SQD0-8), collected via kiosk/manual CSM report entries.',
                    columns: [
                        { label: 'office' }, { label: 'respondents', num: true }, { label: 'overall %', num: true },
                        ...csm.value.sqdLabels.map((_, i) => ({ label: `SQD${i}`, num: true }))
                    ],
                    rows: csm.value.csm.map(o => [
                        cell(o.officeAlias || o.officeName), cell(o.totalRespondents),
                        cell(o.avgSatisfaction != null ? o.avgSatisfaction + '%' : '—'),
                        ...o.sqdAverages.map(v => cell(v ?? '—'))
                    ])
                },
                {
                    title: `Feedback vs. CSM report satisfaction · ${year.value}`,
                    note: 'Two different scales on purpose — feedback responses are rated 1-5 stars by the citizen; CSM reports use the CSM % above.',
                    columns: [{ label: 'office' }, { label: 'feedback satisfaction', num: true }, { label: 'ratings', num: true }, { label: 'CSM satisfaction', num: true }, { label: 'responses', num: true }],
                    rows: csm.value.comparison.map(o => [
                        cell(o.officeAlias || o.officeName),
                        cell(o.complaintSatisfaction != null ? o.complaintSatisfaction + ' ★' : '—'),
                        cell(o.complaintRatingCount), cell(o.feedbackSatisfaction != null ? o.feedbackSatisfaction + '%' : '—'), cell(o.feedbackCount)
                    ])
                }
            ]
        };
    }

    if (tab.value === 'engagement') {
        return {
            title: 'Civic Engagement',
            meta,
            kpis: [
                { label: 'total topics opened', value: String(discussionTotals.value.topics + pollTotals.value.polls) },
                { label: 'total engagements', value: String(discussionTotals.value.comments + pollTotals.value.votes) },
                { label: 'from guests (not signed in)', value: `${guestSharePct.value}%` },
                { label: 'reopen rate (discussion / poll)', value: combinedReopenRate.value },
            ],
            sections: [{
                title: 'by office · topics assigned',
                columns: [{ label: 'office' }, { label: 'discussions', num: true }, { label: 'polls', num: true }],
                rows: engagementByOffice.value.map(row => [cell(row.label), cell(row.discussions), cell(row.polls)])
            }]
        };
    }

    // activity log
    return {
        title: 'Activity Log',
        meta,
        kpis: [
            { label: 'total activities logged', value: String(activityLog.value.length) },
        ],
        sections: [{
            title: `internal activity · ${year.value}`,
            note: 'Feedback handling (ComplaintHistory) plus Discussion/Poll/Office/User/Holiday/CSM report administration, newest first.',
            columns: [{ label: 'when' }, { label: 'module' }, { label: 'action' }, { label: 'description' }, { label: 'by' }],
            rows: filteredActivityLog.value.map(row => [
                cell(formatDateTime(row.createdAt)), cell(moduleLabel(row.module)), cell(row.action), cell(row.description), cell(row.actorLabel || 'System')
            ])
        }]
    };
};

const exportPdf = async () => {
    exporting.value = true;
    try {
        const payload = buildExportPayload();
        // Preview, not download — matches the Feedback module's rating PDF (FeedbackOfficeComponent.vue's
        // generatePDF): fetch as arraybuffer, wrap it in a blob URL, show it in the dialog's iframe.
        // Any older blob URL is revoked first so switching tabs/years doesn't leak memory.
        const response = await api.post('/report/export-pdf', payload, { responseType: 'arraybuffer' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value.split('#')[0]);
        previewUrl.value = URL.createObjectURL(blob) + '#view=FitW';
        previewDialog.value = true;
    } catch (error) {
        console.error('Error exporting report PDF:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">Unable to export this report to PDF.</div>` });
    } finally {
        exporting.value = false;
    }
};

/* -------------------- activity log tab -------------------- */

// Complaint keeps its own dedicated history table server-side (ComplaintHistory); every other
// module logs into the new shared ActivityLog — see utils/activityLog.js. getActivityLog merges
// both into one feed already sorted newest-first.
const MODULE_ICONS = {
    complaint: 'bi-chat-quote',
    discussion: 'bi-chat-left-text',
    poll: 'bi-bar-chart-line',
    office: 'bi-building',
    user: 'bi-person-badge',
    holiday: 'bi-calendar-event',
    feedback: 'bi-emoji-expressionless',
};
// Display-only relabel of the raw ComplaintHistory/ActivityLog `module` value ('complaint'/
// 'feedback' — unchanged server-side) to match the Feedback/CSM Report rebrand everywhere this
// gets rendered (the activity log table's own column, plus its PDF/CSV export below).
const MODULE_LABELS = {
    complaint: 'feedback',
    feedback: 'CSM report',
};
const moduleLabel = (module) => MODULE_LABELS[module] || module;
const ACTION_COLORS = {
    created: 'positive',
    updated: 'primary',
    closed: 'grey',
    reopened: 'positive',
    disabled: 'negative',
    enabled: 'positive',
    reassigned: 'warning',
};
const activityModuleOptions = [
    { label: 'all modules', value: 'all' },
    { label: 'feedback', value: 'complaint' },
    { label: 'discussion', value: 'discussion' },
    { label: 'poll', value: 'poll' },
    { label: 'office', value: 'office' },
    { label: 'user', value: 'user' },
    { label: 'holiday', value: 'holiday' },
    { label: 'CSM report', value: 'feedback' },
];

const activityLog = ref([]);
const activitySearch = ref('');
const activityModule = ref('all');
const formatDateTime = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const filteredActivityLog = computed(() => {
    const term = activitySearch.value.trim().toLowerCase();
    return activityLog.value.filter(row => {
        if (activityModule.value !== 'all' && row.module !== activityModule.value) return false;
        if (!term) return true;
        return (row.description || '').toLowerCase().includes(term) || (row.actorLabel || '').toLowerCase().includes(term);
    });
});

const loadActivityLog = async () => {
    const response = await api.get('/report/activity-log', { params: { year: year.value } });
    activityLog.value = response.data.data || [];
};

/* -------------------- orchestration -------------------- */

const loadActiveTab = async () => {
    loading.value = true;
    try {
        if (tab.value === 'summary') await Promise.all([loadSummary(), loadEngagement()]);
        else if (tab.value === 'performance') await loadPerformance();
        else if (tab.value === 'accounts') await loadAccountPerformance();
        else if (tab.value === 'csm') await loadCsm();
        else if (tab.value === 'engagement') await loadEngagement();
        else if (tab.value === 'activity') await loadActivityLog();
    } catch (error) {
        console.error('Error loading report:', error);
    } finally {
        loading.value = false;
    }
};

const stepYear = (delta) => {
    const next = year.value + delta;
    if (next > currentYear) return;
    year.value = next;
    loadActiveTab();
};

watch(tab, () => loadActiveTab());

onMounted(() => {
    loadActiveTab();
});
</script>

<style scoped>
/* Same aspect-ratio-scroll trick as FeedbackOfficeComponent.vue's .myIframe — the dialog's
   full-height/full-width props only size the dialog wrapper, not the card's children, so the
   iframe needs its own sizing to fill (and scroll within) the preview. */
.rp-pdf-frame {
    position: relative;
    padding-bottom: 65.25%;
    padding-top: 30px;
    height: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
}
.rp-pdf-frame iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
.rp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.rp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.rp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.rp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
}
.rp-kpi {
    min-height: 84px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.rp-kpi-value {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.2;
}
.rp-kpi-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-top: 2px;
}
.rp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 12px;
}
/* Report list rows — same "list item, not table" basis as the Preference pages
   (OfficePreferenceComponent.vue's op-status-section): a right-aligned stat cluster in place
   of table columns. Rows with many metrics (office performance, CSM) just wrap onto more lines
   instead of forcing horizontal scroll. */
.rp-office-list {
    max-height: 65vh;
    overflow-y: auto;
}
.rp-stat-section {
    max-width: 60%;
}
.rp-stat-wrap {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px 16px;
}
.rp-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 64px;
}
</style>
