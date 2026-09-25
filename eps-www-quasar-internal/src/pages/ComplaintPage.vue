<template>
    <div>
        <div class="cp-shell">
            <div class="cp-main">
                <div class="row items-center justify-between q-mb-md cp-header">
                    <div>
                        <div class="cp-eyebrow">feedback desk &middot; operations overview<template v-if="analyticsScopeLabel"> &middot; {{ analyticsScopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="cp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="cp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="cp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="cp-period-btn" :class="analyticsPeriod === 'week' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="cp-period-btn" :class="analyticsPeriod === 'month' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="cp-period-btn" :class="analyticsPeriod === 'year' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="analyticsLoading" @click="loadAnalytics">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <!-- CSS grid (not Quasar's row/col-*) so every tile lands the same height in
                     whichever row it wraps into, regardless of how many tiles happen to share
                     that row — same fix as the panel grids below and on FeedbackPage.vue. -->
                <div class="cp-kpi-grid q-mb-md">
                    <q-card flat class="cp-kpi radius-xs bg-primary">
                        <div class="cp-kpi-value text-white">{{ analyticsKpis.totalComplaints ?? 0 }}</div>
                        <div class="cp-kpi-label text-white">
                            feedback filed
                            <!--
                                Deliberately NOT the same number as "shown of N" in the Complaint
                                List rail — this tile counts complaints FILED within the selected
                                Week/Month/Year window above; the list is an always-current work
                                queue (every complaint ever assigned to you, any filing date), so an
                                older still-open complaint never disappears just because the period
                                selector moved on. The two are expected to disagree whenever an
                                office has a complaint from outside the selected period.
                            -->
                            <q-icon name="bi-info-circle" size="11px" class="q-ml-xs cp-kpi-info">
                                <q-tooltip>
                                    Feedback filed within {{ analyticsRangeLabel || 'the selected period' }}. The Feedback List on the
                                    right isn't period-filtered — it always shows every feedback ever assigned to you, so its total can differ.
                                </q-tooltip>
                            </q-icon>
                        </div>
                        <div v-if="analyticsTrends.totalComplaints?.pctChange != null" class="cp-kpi-trend" :class="analyticsTrends.totalComplaints.pctChange >= 0 ? 'cp-kpi-trend--up' : 'cp-kpi-trend--down'">
                            <q-icon :name="analyticsTrends.totalComplaints.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.totalComplaints.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.totalComplaints.pctChange }}% vs {{ analyticsTrends.totalComplaints.label }}
                        </div>
                    </q-card>
                    <q-card flat class="cp-kpi radius-xs bg-primary">
                        <div class="cp-kpi-value text-white">{{ formatResolutionTime(analyticsKpis.avgAcknowledgementDays) }}</div>
                        <div class="cp-kpi-label text-white">avg. acknowledgement time</div>
                        <div v-if="analyticsTrends.avgAcknowledgementDays?.pctChange != null" class="cp-kpi-trend" :class="analyticsTrends.avgAcknowledgementDays.pctChange >= 0 ? 'cp-kpi-trend--up' : 'cp-kpi-trend--down'">
                            <q-icon :name="analyticsTrends.avgAcknowledgementDays.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.avgAcknowledgementDays.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.avgAcknowledgementDays.pctChange }}% vs {{ analyticsTrends.avgAcknowledgementDays.label }}
                        </div>
                    </q-card>
                    <q-card flat class="cp-kpi radius-xs bg-primary">
                        <div class="cp-kpi-value text-white">{{ formatResolutionTime(analyticsKpis.avgResolutionDays) }}</div>
                        <div class="cp-kpi-label text-white">avg. resolution time</div>
                        <div v-if="analyticsTrends.avgResolutionDays?.pctChange != null" class="cp-kpi-trend" :class="analyticsTrends.avgResolutionDays.pctChange >= 0 ? 'cp-kpi-trend--up' : 'cp-kpi-trend--down'">
                            <q-icon :name="analyticsTrends.avgResolutionDays.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.avgResolutionDays.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.avgResolutionDays.pctChange }}% vs {{ analyticsTrends.avgResolutionDays.label }}
                        </div>
                    </q-card>
                    <q-card flat class="cp-kpi radius-xs bg-primary">
                        <div class="cp-kpi-value text-white">{{ analyticsKpis.avgSatisfaction != null ? analyticsKpis.avgSatisfaction + ' ★' : '—' }}</div>
                        <div class="cp-kpi-label text-white">avg. satisfaction</div>
                    </q-card>
                    
                </div>

                <div class="cp-panel-grid">
                    <q-card
                        v-if="canViewAll"
                        flat
                        class="cp-kpi radius-xs cursor-pointer custom-border"
                        :class="showUnassignedOnly ? 'bg-negative' : ''"
                        @click="toggleUnassignedFilter"
                    >
                        <div class="cp-kpi-value" :class="showUnassignedOnly ? 'text-white' : 'text-negative'">{{ unassignedCount }}</div>
                        <div class="cp-kpi-label" :class="showUnassignedOnly ? 'text-white' : 'text-grey'">needs assignment</div>
                    </q-card>
                    <q-card
                        flat
                        class="cp-kpi radius-xs cursor-pointer custom-border"
                        :class="showOverdueOnly ? 'bg-negative' : ''"
                        @click="toggleOverdueFilter"
                    >
                        <div class="cp-kpi-value" :class="showOverdueOnly ? 'text-white' : 'text-negative'">{{ analyticsKpis.ackOverdueCount ?? 0 }}</div>
                        <div class="cp-kpi-label" :class="showOverdueOnly ? 'text-white' : 'text-grey'">acknowledgement overdue</div>
                    </q-card>
                    <q-card
                        flat
                        class="cp-kpi radius-xs cursor-pointer custom-border"
                        :class="showResolutionOverdueOnly ? 'bg-negative' : ''"
                        @click="toggleResolutionOverdueFilter"
                    >
                        <div class="cp-kpi-value" :class="showResolutionOverdueOnly ? 'text-white' : 'text-negative'">{{ analyticsKpis.resolutionOverdueCount ?? 0 }}</div>
                        <div class="cp-kpi-label" :class="showResolutionOverdueOnly ? 'text-white' : 'text-grey'">resolution overdue</div>
                    </q-card>
                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--wide">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">feedback filed per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">feedback by status</div>
                        <apexchart type="bar" height="240" :options="statusChartOptions" :series="statusChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">complexity mix</div>
                        <apexchart type="pie" height="280" :options="complexityShareOptions" :series="complexityShareSeries" />
                        <div class="q-mt-sm" v-for="t in complexityMix" :key="t.tier">
                            <div class="row items-center justify-between text-caption q-mb-xs">
                                <span class="text-capitalize">{{ complexityLabel(t.tier) }} &middot; {{ t.targetDays }}d target</span>
                                <span class="text-weight-bold">{{ t.onTimeRate != null ? t.onTimeRate + '%' : '—' }}</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (t.onTimeRate ?? 0) + '%', background: meterColor(t.onTimeRate) }"></div></div>
                        </div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">open backlog by office</div>
                        <apexchart type="bar" height="240" :options="backlogChartOptions" :series="backlogChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="row items-baseline justify-between q-mb-sm">
                            <div class="text-caption text-uppercase text-grey">citizen satisfaction</div>
                            <div class="text-caption text-grey" v-if="satisfaction.totalRatings">{{ satisfaction.totalRatings }} rating{{ satisfaction.totalRatings === 1 ? '' : 's' }}</div>
                        </div>
                        <template v-if="satisfaction.totalRatings">
                            <div class="text-h4 text-weight-bold q-mb-sm">{{ satisfaction.avgRating }} <span class="text-body2 text-grey">/ 5</span></div>
                            <apexchart type="bar" height="160" :options="satisfactionChartOptions" :series="satisfactionChartSeries" />
                        </template>
                        <div class="text-caption text-grey text-center q-py-md" v-else>no ratings yet this period</div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border cp-panel radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">SLA compliance</div>
                        <div class="q-mb-md">
                            <div class="row items-center justify-between text-caption q-mb-xs">
                                <span>acknowledged within 24 business hours</span>
                                <span class="text-weight-bold">{{ slaCompliance.ackRate != null ? slaCompliance.ackRate + '%' : '—' }}</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (slaCompliance.ackRate ?? 0) + '%', background: meterColor(slaCompliance.ackRate) }"></div></div>
                        </div>
                        <div>
                            <div class="row items-center justify-between text-caption q-mb-xs">
                                <span>resolved within complexity-tier target</span>
                                <span class="text-weight-bold">{{ slaCompliance.resolutionRate != null ? slaCompliance.resolutionRate + '%' : '—' }}</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (slaCompliance.resolutionRate ?? 0) + '%', background: meterColor(slaCompliance.resolutionRate) }"></div></div>
                        </div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">office-completion &rarr; feedback-completion</div>
                        <div class="text-caption text-grey q-mb-sm">avg. time from every assigned office marking done to a supervisor finalizing it</div>
                        <div class="text-h4 text-weight-bold">{{ approvalLagLabel }}</div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">routing accuracy</div>
                        <apexchart type="pie" height="280" :options="routingShareOptions" :series="routingShareSeries" />
                        <div class="q-mt-sm">
                            <div class="row items-center justify-between text-caption q-mb-xs">
                                <span>reassigned at least once</span>
                                <span class="text-weight-bold">{{ routingAccuracy.reassignmentRate }}%</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: routingAccuracy.reassignmentRate + '%', background: reassignMeterColor(routingAccuracy.reassignmentRate) }"></div></div>
                            <div class="text-caption text-grey q-mt-xs">{{ routingAccuracy.reassignedCount }} of {{ analyticsKpis.totalComplaints ?? 0 }} feedback</div>
                        </div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--full" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">acknowledgement rate vs. resolution rate, by office</div>
                        <div class="text-caption text-grey q-mb-sm">fast to acknowledge doesn't always mean fast to resolve</div>
                        <apexchart type="bar" height="260" :options="ackResolutionByOfficeOptions" :series="ackResolutionByOfficeSeries" />
                    </q-card>

                    <!-- Every feedback that has a location on file (citizen-filed only — see
                         ComplaintValidator; a staff-filed or pre-geolocation-feature entry has none
                         and just never gets a pin), scoped the same as everything else here
                         (own-office only for workstation). Not period-filtered — "all feedback",
                         same framing as the KPI tile it sits under. -->
                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--full">
                        <div class="row items-center justify-between q-mb-sm">
                            <div class="text-caption text-uppercase text-grey">feedback locations</div>
                            <div class="text-caption text-grey">{{ locationMarkers.length }} pinned</div>
                        </div>
                        <LocationMap :markers="locationMarkers" height="360px" empty-text="No feedback with a location on file yet." />
                    </q-card>
                </div>
            </div>

            <div class="cp-rail">
                <q-card flat class="cp-rail-card">
                    <div class="cp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">feedback list</div>
                                <div class="text-caption text-grey">{{ complaints.length }} shown of {{ meta.TotalItems || 0 }}</div>
                            </div>
                            <q-btn v-if="isSupervisor" unelevated color="primary" rounded size="sm" no-caps label="add" class="cp-add-btn" @click="createComplaintDialog = true">
                                <q-tooltip>File feedback on a citizen's behalf</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense debounce="1000" v-model="filter" placeholder="Search reference no. or content..." class="cp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div class="row q-gutter-xs q-mb-sm">
                            <q-btn no-caps unelevated rounded size="sm" label="All" class="cp-chip" :class="!anyQuickFilterActive ? 'cp-chip--active' : ''" @click="clearQuickFilters" />
                            <q-btn no-caps unelevated rounded size="sm" label="Unassigned" class="cp-chip" :class="showUnassignedOnly ? 'cp-chip--active' : ''" @click="toggleUnassignedFilter" />
                            <q-btn no-caps unelevated rounded size="sm" label="Ack. overdue" class="cp-chip" :class="showOverdueOnly ? 'cp-chip--active' : ''" @click="toggleOverdueFilter" />
                            <q-btn no-caps unelevated rounded size="sm" label="Resolution overdue" class="cp-chip" :class="showResolutionOverdueOnly ? 'cp-chip--active' : ''" @click="toggleResolutionOverdueFilter" />
                            <q-btn
                                v-for="s in STATUS_QUICK_FILTERS" :key="s.value"
                                no-caps unelevated rounded size="sm" :label="s.label"
                                class="cp-chip" :class="filterStatus === s.value ? 'cp-chip--active' : ''"
                                @click="toggleStatusFilter(s.value)"
                            />
                        </div>
                        <template v-if="canViewAll">
                            <div class="text-caption text-uppercase text-grey q-mb-xs">office</div>
                            <div class="row q-gutter-xs">
                                <q-btn no-caps unelevated rounded size="sm" label="All" class="cp-chip" :class="!filterOffice.length ? 'cp-chip--active' : ''" @click="clearOfficeFilter" />
                                <q-btn
                                    v-for="o in OptionOffice.filter(o => o.value !== 'all')" :key="o.value"
                                    no-caps unelevated rounded size="sm" :label="o.label"
                                    class="cp-chip" :class="filterOffice.includes(o.value) ? 'cp-chip--active' : ''"
                                    @click="toggleOfficeFilter(o.value)"
                                />
                            </div>
                        </template>
                    </div>
                    <q-separator />
                    <div class="cp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <div
                            v-for="dt in complaints" :key="dt.id"
                            class="cp-list-item" :class="rowSeverity(dt)"
                            @click="() => { ComplaintStore.dialog = true; getComplaint(dt.id); GenerateRandomAvatar() }"
                        >
                            <div class="row items-center justify-between no-wrap">
                                <div class="text-caption text-weight-bold text-uppercase">{{ dt.referenceNo }}</div>
                                <div class="text-caption text-grey">{{ moment(dt.createdAt).fromNow() }}</div>
                            </div>
                            <div class="text-body2 q-mt-xs">{{ formatName(dt) }}</div>
                            <div class="row items-center q-gutter-xs q-mt-xs">
                                <span class="cp-pill" :style="{ background: (STATUS_PILL[dt.status] || {}).bg, color: (STATUS_PILL[dt.status] || {}).text }">{{ dt.status }}</span>
                                <span v-if="dt.complexity" class="cp-pill cp-pill--light">{{ complexityLabel(dt.complexity) }}</span>
                                <span v-if="primaryOfficeLabel(dt)" class="text-caption text-grey">{{ primaryOfficeLabel(dt) }}</span>
                            </div>
                        </div>
                        <div v-if="loading" class="cp-list-empty">
                            <q-spinner-ios size="1.5em" />
                            <div class="text-caption text-uppercase q-mt-sm">loading feedback...</div>
                        </div>
                        <div v-if="!loading && complaints.length === 0" class="cp-list-empty">
                            <div class="text-caption text-uppercase">no feedback</div>
                        </div>
                        <div v-if="loadingMore" class="cp-list-load-more">
                            <q-spinner-ios size="1.2em" />
                            <span class="text-caption q-ml-sm">loading more...</span>
                        </div>
                        <div v-if="!loading && !loadingMore && complaints.length > 0 && !hasMoreComplaints" class="cp-list-load-more text-grey">
                            <span class="text-caption">end of list</span>
                        </div>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="cp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>
        <q-dialog v-model="ComplaintStore.dialog" full-height persistent >
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">feedback information</div>
                    <q-space />
                    <q-btn
                        v-if="isSupervisor && ComplaintStore.details?.via === 'staff' && !isTerminal"
                        unelevated rounded size="sm" color="primary" label="Edit"
                        class="q-mr-sm" @click="editComplaintDialog = true"
                    />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-separator />
                <q-card-section class="scroll" style="flex: 1">
                    <div class="row q-col-gutter-md">
                        <div class="col-5">
                            <q-item class="bg-accent q-pa-md radius-sm">
                                <q-item-section avatar>
                                    <q-avatar>
                                        <img :src="randomAvatar" />
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <q-item-label class="text-capitalize">{{ ComplaintStore.details.isAnonymous ? 'Anonymous' : formatName(ComplaintStore.details) }}</q-item-label>
                                </q-item-section>
                            </q-item>
                            <q-card-section class="q-mt-sm q-pa-md radius-sm bg-accent">
                                <div class="q-mb-sm">
                                    <div class="text-caption text-uppercase text-grey">reference no.</div>
                                    <div class="text-body1 text-uppercase">{{ ComplaintStore.details?.referenceNo }}</div>
                                </div>
                                <div class="q-mb-sm">
                                    <div class="text-caption text-uppercase text-grey">status</div>
                                    <div class="text-body1 text-uppercase">{{ ComplaintStore.details?.status }}</div>
                                    <div class="text-caption text-grey q-mt-xs" v-if="ComplaintStore.details?.remarks">
                                        <q-icon name="bi-chat-square-text-fill" size="xs" class="q-mr-xs" />
                                        {{ ComplaintStore.details.remarks }}
                                    </div>
                                </div>
                                <div class="q-mb-sm">
                                    <div class="text-caption text-uppercase text-grey q-mb-xs">complexity / resolution</div>
                                    <div class="row items-center q-gutter-xs">
                                        <q-badge
                                            :color="ComplaintStore.details?.complexity ? 'grey-7' : 'grey-4'"
                                            class="text-uppercase"
                                        >
                                            {{ ComplaintStore.details?.complexity ? complexityLabel(ComplaintStore.details.complexity) : 'not yet classified' }}
                                        </q-badge>
                                        <q-badge
                                            v-if="resolutionComplianceLabel"
                                            :color="resolutionComplianceColor" class="text-uppercase"
                                        >
                                            {{ resolutionComplianceLabel }}
                                            <q-tooltip>{{ resolutionComplianceTooltip }}</q-tooltip>
                                        </q-badge>
                                        <q-badge v-if="approvalLagForThisComplaintLabel" color="grey-6" class="text-uppercase">
                                            approved {{ approvalLagForThisComplaintLabel }} after done
                                            <q-tooltip>
                                                Every assigned office had marked its own part done by {{ moment(approvalLagForThisComplaint.lastOfficeDoneAt).format('MMM DD, YYYY hh:mm A') }};
                                                a supervisor finalized it {{ approvalLagForThisComplaintLabel }} later.
                                            </q-tooltip>
                                        </q-badge>
                                    </div>
                                </div>
                                <div class="q-mb-sm">
                                    <!-- <div class="text-caption text-uppercase text-grey">office</div> -->
                                    <!-- <div class="text-body1 text-uppercase">{{ FormatOffices(ComplaintStore.details?.complaintOffices) || 'unassigned' }}</div> -->
                                    <div>
                                        <div class="text-caption text-uppercase text-grey q-mb-xs">assigned office(s)</div>
                                        <q-list bordered separator class="radius-sm overflow-hidden" v-if="displayOffices.length">
                                            <q-item
                                                v-for="co in displayOffices" :key="co.id"
                                                :class="[!co.isActive ? 'text-grey-6' : '', 'cp-office-item']"
                                            >
                                                <q-item-section>
                                                    <q-item-label class="text-uppercase">
                                                        {{ co.office?.name }} ({{ co.office?.alias }})
                                                        <q-badge v-if="!co.isActive" color="grey-5" class="text-uppercase q-ml-xs">disabled</q-badge>
                                                    </q-item-label>
                                                    <q-item-label caption v-if="co.assignmentReason">
                                                        <q-icon :name="co.assignedBy === 'ai' ? 'bi-robot' : 'bi-person-check'" size="xs" class="q-mr-xs" />
                                                        {{ co.assignmentReason }}
                                                    </q-item-label>
                                                    <q-item-label caption v-else class="text-grey">
                                                        {{ co.assignedBy === 'admin' ? 'Assigned manually, no note left.' : 'No reason on record.' }}
                                                    </q-item-label>
                                                </q-item-section>
                                                <q-item-section side>
                                                    <q-badge :color="co.status === 'completed' ? 'positive' : (co.status === 'cancelled' ? 'negative' : 'grey')" class="text-uppercase q-mb-xs">{{ co.status }}</q-badge>
                                                    <q-badge
                                                        v-if="complianceLabel(co)"
                                                        :color="complianceColor(co)" class="text-uppercase"
                                                    >
                                                        {{ complianceLabel(co) }}
                                                        <q-tooltip>{{ complianceTooltip(co) }}</q-tooltip>
                                                    </q-badge>
                                                    <q-btn
                                                        class="q-my-xs"
                                                        v-if="isSupervisor && co.status === 'completed' && !isTerminal"
                                                        unelevated no-caps outline size="xs" label="undone" color="warning"
                                                        :loading="sendBackLoading === co.id" @click="confirmSendBack(co)"
                                                    >
                                                        <q-tooltip>Not actually done? Mark undone</q-tooltip>
                                                    </q-btn>
                                                </q-item-section>
                                            </q-item>
                                        </q-list>
                                        <div class="text-caption text-grey" v-else>
                                            Not yet assigned to any office.
                                        </div>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section class="q-mt-sm q-pa-md radius-sm bg-accent" v-if="ComplaintStore.details.content">
                                <div class="text-caption text-uppercase text-grey">feedback content</div>
                                <read-more :rows="3" moreText="See More" lessText="See Less">
                                    {{ ComplaintStore.details.content }}
                                </read-more>
                                <div style="width: 100%;">
                                    <q-carousel swipeable animated v-model="slide" thumbnails infinite class="radius-sm" v-if="ComplaintStore.details?.complaintFiles?.length > 0">
                                        <q-carousel-slide
                                            v-for="(photo, index) in ComplaintStore.details?.complaintFiles || []"
                                            :key="photo.id"
                                            :name="index+1"
                                            :img-src="(FormatFile(photo))"
                                        />
                                    </q-carousel>
                                </div>
                            </q-card-section>
                            <!-- Only for a citizen-filed complaint that actually captured one (see
                                 ComplaintValidator) — a staff-filed or pre-feature entry has none,
                                 so this section just doesn't render rather than showing an empty map. -->
                            <q-card-section class="q-mt-sm q-pa-md radius-sm bg-accent" v-if="detailLocationMarkers.length">
                                <div class="text-caption text-uppercase text-grey q-mb-xs">location</div>
                                <LocationMap :markers="detailLocationMarkers" height="220px" />
                            </q-card-section>
                            <q-card-section class="q-mt-sm q-pa-md radius-sm bg-accent">
                                <div class="text-caption text-uppercase text-grey q-mb-xs">activity history</div>
                                <q-list bordered separator class="radius-sm overflow-hidden" v-if="ComplaintStore.details?.history?.length">
                                    <q-item v-for="h in ComplaintStore.details.history" :key="h.id">
                                        <q-item-section>
                                            <q-item-label>{{ h.description }}</q-item-label>
                                            <q-item-label caption>
                                                {{ formatHistoryDate(h.createdAt) }}
                                                <template v-if="h.actorLabel"> &middot; {{ h.actorLabel }}</template>
                                            </q-item-label>
                                        </q-item-section>
                                        <q-item-section side>
                                            <q-badge color="grey" class="text-uppercase">{{ h.action }}</q-badge>
                                        </q-item-section>
                                    </q-item>
                                </q-list>
                                <div class="text-caption text-grey" v-else>No activity recorded yet.</div>
                            </q-card-section>
                        </div>
                        <div class="col-7">
                            <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <div class="q-gutter-xs">
                                    <q-btn
                                        v-for="(n, index) in navs"
                                        unelevated
                                        :class="activeTab === `${n.tab}` ? 'bg-primary text-white' : 'bg-accent'"
                                        @click="activeTab = `${n.tab}`"
                                        size="sm"
                                        :label="n.label"
                                        rounded
                                    />
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'responses'" class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <!-- Compose stays fixed at the top of the tab, not part of the scrolling list below. -->
                                <div class="text-caption text-grey" v-if="isTerminal">
                                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                    This feedback has been finalized as <b class="text-uppercase">{{ ComplaintStore.details?.status }}</b> — no further action needed.
                                </div>
                                <template v-else>
                                    <div class="text-caption text-grey" v-if="isMonitoring">
                                        <q-icon name="bi-eye" size="xs" class="q-mr-xs" />
                                        Monitoring accounts are view-only — responses are handled by office staff.
                                    </div>
                                    <div class="text-caption text-grey" v-else-if="!isSupervisor && !myOfficeAssignment">
                                        This feedback isn't currently assigned to your office.
                                    </div>
                                    <!--
                                        Receive-first applies whenever the CURRENT user's own office (via their
                                        Staff row) is one of this complaint's assigned offices and hasn't
                                        acknowledged it yet — true for workstation, and equally true for a
                                        Super/Admin whose account also belongs to an office (e.g. an IT-department
                                        admin on an IT-routed complaint). A Super/Admin with no office of their own,
                                        or whose office isn't assigned here, skips straight to the compose box below
                                        (their response isn't tied to any single office's queue) — same as before.
                                    -->
                                    <q-btn
                                        v-else-if="myOfficeAssignment && myOfficeAssignment.status === 'pending'"
                                        unelevated no-caps rounded color="primary" icon="bi-inbox" label="receive feedback"
                                        class="full-width" :loading="receiveLoading" @click="submitReceive"
                                    />
                                    <template v-else>
                                        <q-input
                                            outlined type="textarea" rows="3" v-model="responseContent"
                                            label="Enter Response" class="q-mb-sm"
                                        />
                                        <q-file
                                            v-if="!markAsDone"
                                            outlined v-model="responseFiles" label="Upload Evidence (optional)" multiple counter
                                            accept="image/*,application/pdf" class="q-mb-sm"
                                        >
                                            <template v-slot:prepend><q-icon name="bi-paperclip" /></template>
                                        </q-file>
                                        <!-- Explicit per-office "done" signal lives right on the response itself, as a
                                             toggle pill rather than a separate button — a reply's content alone isn't
                                             reliable evidence an office considers its part finished, so this is what
                                             makes THIS response the final one. Only workstation can toggle it — matches
                                             the backend's own requireRole('workstation') on /response/complete, which
                                             this calls instead of /response/respond when it's on. -->
                                        <div
                                            v-if="AuthStore.user?.role === 'workstation' && myOfficeAssignment && !['completed', 'cancelled'].includes(myOfficeAssignment.status)"
                                            class="row items-center q-gutter-xs q-mb-sm"
                                        >
                                            <q-btn
                                                no-caps unelevated rounded size="sm" icon="bi-check2-circle" label="done"
                                                class="cp-chip" :class="markAsDone ? 'cp-chip--active' : ''"
                                                @click="markAsDone = !markAsDone"
                                            />
                                            <span class="text-caption text-grey">
                                                {{ markAsDone ? 'This response will mark your office\'s part as done — no evidence attachments here.' : 'Mark this as your office\'s final response.' }}
                                            </span>
                                        </div>
                                        <q-btn
                                            no-caps rounded unelevated :color="markAsDone ? 'positive' : 'primary'"
                                            :label="markAsDone ? 'send & mark done' : 'send response'" class="full-width"
                                            :disable="!responseContent" :loading="respondLoading" @click="submitRespond"
                                        />
                                    </template>
                                </template>

                                <q-separator class="q-my-md" />

                                <!-- Citizen satisfaction — the average of the stars the complainant left on each
                                     office's responses in THIS complaint, plus the count. Updates live: the
                                     backend emits 'complaints:changed' on every rating (see the socket handler
                                     in onMounted), which re-fetches this open modal. -->
                                <div class="row q-gutter-sm q-mb-md" v-if="officeSatisfaction.length">
                                    <q-card flat bordered class="radius-sm q-pa-sm col-auto" v-for="os in officeSatisfaction" :key="os.label">
                                        <div class="text-caption text-uppercase text-grey">{{ os.label }} &middot; satisfaction</div>
                                        <div class="row items-center q-gutter-xs">
                                            <div class="text-h6 text-weight-bold">{{ os.avg.toFixed(1) }}</div>
                                            <q-rating :model-value="os.avg" readonly size="1.1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" icon-half="bi-star-half" />
                                            <div class="text-caption text-grey">({{ os.count }} rated)</div>
                                        </div>
                                    </q-card>
                                </div>

                                <div class="text-caption text-uppercase text-grey q-mb-sm">responses &middot; latest first</div>
                                <div class="response-list-scroll" v-if="sortedResponses.length">
                                    <q-list bordered separator class="radius-sm overflow-hidden">
                                        <q-item v-for="r in sortedResponses" :key="r.id">
                                            <q-item-section avatar top>
                                                <q-avatar size="40px" :color="r.user?.avatar ? undefined : 'primary'" text-color="white">
                                                    <img v-if="r.user?.avatar" :src="formatAvatar(r.user)" />
                                                    <template v-else>{{ responderInitials(r) }}</template>
                                                </q-avatar>
                                            </q-item-section>
                                            <q-item-section>
                                                <div class="row items-center q-gutter-xs q-mb-xs">
                                                    <div class="text-weight-bold text-capitalize">{{ responderName(r) }}</div>
                                                    <q-badge color="primary" class="text-uppercase">{{ responseDepartment(r) }}</q-badge>
                                                    <div class="text-caption text-grey">{{ formatHistoryDate(r.createdAt) }}</div>
                                                </div>
                                                <div class="text-body2">{{ r.content }}</div>
                                                <div class="row q-gutter-sm q-mt-sm" v-if="r.responseFiles?.length">
                                                    <template v-for="f in r.responseFiles" :key="f.id">
                                                        <q-img
                                                            v-if="!isResponsePdf(f)"
                                                            :src="f.file"
                                                            class="response-evidence-thumb radius-xs cursor-pointer"
                                                            fit="cover"
                                                            @click="responsePreview = f.file"
                                                        />
                                                        <q-btn
                                                            v-else
                                                            outline dense no-caps size="sm" color="primary" icon="bi-file-earmark-pdf" :label="f.filename"
                                                            :href="f.file" target="_blank"
                                                        />
                                                    </template>
                                                </div>
                                                <!-- Per-response rating the complainant left (read-only for staff). -->
                                                <div class="row items-center q-gutter-xs q-mt-sm" v-if="canBeRated(r)">
                                                    <span class="text-caption text-grey">citizen rating:</span>
                                                    <template v-if="responseRating(r)">
                                                        <q-rating :model-value="responseRating(r)" readonly size="1.1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" />
                                                        <span class="text-caption text-grey">{{ responseRating(r) }}/5</span>
                                                    </template>
                                                    <span class="text-caption text-grey" v-else>not rated yet</span>
                                                </div>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </div>
                                <div v-else>
                                    <div class="text-center q-pa-lg">
                                        <q-icon name="bi-exclamation-circle" size="xl" color="grey"/>
                                        <div class="text-caption text-grey text-uppercase q-mt-sm">no response yet</div>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'reassign' && isSupervisor" class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <div  v-if="isTerminal" class="text-caption text-grey">
                                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                    Reassignment is locked — this feedback is already finalized.
                                </div>
                                <template v-else>
                                    <div class="row items-center q-mb-xs">
                                        <div class="text-caption text-uppercase text-grey">assigned office(s)</div>
                                        <q-space />
                                        <q-btn
                                            unelevated size="sm" color="primary" icon="bi-stars" round
                                            :loading="suggestLoading" @click="loadSuggestions"
                                        >
                                            <q-tooltip>Help me decide with AI</q-tooltip>
                                        </q-btn>
                                    </div>
                                    <div class="text-caption text-grey q-mb-xs" v-if="suggestionsChecked && !suggestions.length">
                                        No confident suggestion — the AI couldn't match this feedback to any office's mandate.
                                    </div>
                                    <div class="row items-center q-gutter-xs q-mb-sm">
                                        <q-btn
                                            v-for="o in filteredOffice.filter(o => o.value !== 'all')" :key="o.value"
                                            no-caps unelevated rounded size="sm" :label="o.fullLabel || o.label"
                                            class="cp-chip" :class="selectedOfficeIds.includes(o.value) ? 'cp-chip--active' : ''"
                                            @click="toggleOffice(o.value)"
                                        >
                                            <q-icon
                                                v-if="suggestedOfficeIds.has(o.value)"
                                                name="bi-stars" :color="selectedOfficeIds.includes(o.value) ? 'white' : 'amber-8'" size="0.8em" class="q-ml-xs"
                                            >
                                                <q-tooltip>AI-suggested</q-tooltip>
                                            </q-icon>
                                        </q-btn>
                                    </div>

                                    <!-- Reason for each office that has one (AI-suggested or manually noted) — a plain
                                         list below the pills rather than packed inside each pill itself. -->
                                    <q-list v-if="officesWithReason.length" bordered separator class="radius-xs overflow-hidden q-mb-sm">
                                        <q-item v-for="o in officesWithReason" :key="o.value">
                                            <q-item-section v-if="selectedOfficeIds.includes(o.value)" side>
                                                <q-icon name="bi-check-circle-fill" color="primary" size="xs" />
                                            </q-item-section>
                                            <q-item-section>
                                                <q-item-label class="text-caption text-uppercase text-weight-bold">
                                                    {{ o.fullLabel || o.label }}
                                                    <q-icon v-if="suggestedOfficeIds.has(o.value)" name="bi-stars" color="amber-8" size="0.8em" class="q-ml-xs" />
                                                </q-item-label>
                                                <q-item-label caption>{{ reasonsByOffice[o.value] }}</q-item-label>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>

                                    <q-input
                                        outlined type="textarea" rows="2"
                                        v-model="reassignReason"
                                        label="Fallback reason (for offices with no AI reason)"
                                        class="q-mb-sm"
                                    />
                                    <q-btn
                                        no-caps rounded unelevated color="primary" class="full-width"
                                        :label="selectedOfficeIds.length ? `reassign (${selectedOfficeIds.length})` : 'clear assignment'"
                                        :loading="reassignLoading"
                                        @click="submitReassign"
                                    />
                                </template>
                            </q-card-section>
                            <!-- Complexity / SLA reassignment — there's no per-office SLA anymore, the ARTA/EODB
                                 complexity tier alone drives resolutionDeadline, so "reassigning the SLA" means
                                 correcting a misclassified tier here. Super/admin only, same as office reassignment. -->
                            <q-card-section v-if="activeTab == 'reassign' && isSupervisor" class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <div v-if="isTerminal" class="text-caption text-grey">
                                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                    Reassignment is locked — this feedback is already finalized.
                                </div>
                                <template v-else>
                                    <div class="row items-center q-mb-xs">
                                        <div class="text-caption text-uppercase text-grey">complexity / SLA</div>
                                        <q-space />
                                        <q-btn
                                            unelevated size="sm" color="primary" icon="bi-stars" round
                                            :loading="suggestLoading" @click="loadSuggestions"
                                        >
                                            <q-tooltip>Help me decide with AI</q-tooltip>
                                        </q-btn>
                                    </div>
                                    <div class="text-caption text-grey q-mb-sm">
                                        Changes the ARTA/EODB tier and recomputes the resolution deadline from when this feedback
                                        was filed — use this to correct a misclassification, not to extend an individual deadline.
                                    </div>
                                    <div class="text-caption text-grey q-mb-xs" v-if="suggestionsChecked && !suggestedComplexity">
                                        No confident suggestion — the AI couldn't classify this feedback's complexity.
                                    </div>
                                    <div class="row items-center q-gutter-xs q-mb-sm">
                                        <q-btn
                                            v-for="c in COMPLEXITY_OPTIONS" :key="c.value"
                                            no-caps unelevated rounded size="sm" :label="`${c.label} · ${c.days}d`"
                                            class="cp-chip" :class="selectedComplexity === c.value ? 'cp-chip--active' : ''"
                                            @click="selectedComplexity = c.value"
                                        >
                                            <q-icon
                                                v-if="suggestedComplexity === c.value"
                                                name="bi-stars" :color="selectedComplexity === c.value ? 'white' : 'amber-8'" size="0.8em" class="q-ml-xs"
                                            >
                                                <q-tooltip>AI-suggested</q-tooltip>
                                            </q-icon>
                                        </q-btn>
                                    </div>
                                    <q-btn
                                        no-caps rounded unelevated color="primary" class="full-width"
                                        label="reassign SLA"
                                        :disable="!selectedComplexity || selectedComplexity === ComplaintStore.details?.complexity"
                                        :loading="complexityLoading"
                                        @click="submitReassignComplexity"
                                    />
                                </template>
                            </q-card-section>
                            <!-- One process for every transition — finalize (completed/cancelled) and reopen
                                 (completed -> ongoing) are all "pick a card, add remarks/reason, submit", never a
                                 separate button/dialog of their own. Which card(s) are offered is the only thing
                                 that changes with state; requestStatusChange(statusChoice) handles all of them. -->
                            <q-card-section v-if="activeTab == 'status' && isSupervisor" class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <div class="text-caption text-grey" v-if="isTerminal && !canReopen">
                                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                    This feedback is finalized as <b class="text-uppercase">{{ ComplaintStore.details?.status }}</b>. No further status changes.
                                </div>
                                <template v-else>
                                    <div class="text-caption text-grey q-mb-sm" v-if="isTerminal">
                                        <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                        Finalized as <b class="text-uppercase">completed</b>. Reopen below if it turns out this wasn't actually resolved.
                                    </div>
                                    <template v-else>
                                        <div class="text-caption text-grey q-mb-sm">
                                            Finalizing here applies to the whole feedback — every office it's assigned to is marked the same way.
                                        </div>
                                        <div class="text-caption text-negative q-mb-sm" v-if="officesNotReceived.length">
                                            <q-icon name="bi-exclamation-triangle-fill" size="xs" class="q-mr-xs" />
                                            Cannot mark completed yet — {{ officesNotReceived.length }} assigned office(s) haven't acknowledged/received the feedback: {{ officesNotReceived.map(o => o.office?.alias || o.office?.name).join(', ') }}.
                                        </div>
                                        <!-- AI-assisted completion suggestion — advisory only, and only worth offering
                                             once every office has at least acknowledged the complaint (offering it any
                                             earlier would only ever come back "not eligible" on the structural floor,
                                             the warning above already says why). Once past that floor the AI reads the
                                             whole response thread and can still say "not ready" — even when every
                                             office has marked its part done — if the responses don't show a real
                                             resolution. Never submits anything itself; it just pre-fills the
                                             choice/remarks below for the supervisor to review, edit, or ignore. Matches
                                             the "Help me decide with AI" idiom already used on the re-assignment panel. -->
                                        <template v-else>
                                            <div class="row items-center q-mb-sm">
                                                <div class="text-caption text-uppercase text-grey">ready to complete?</div>
                                                <q-space />
                                                <q-btn
                                                    unelevated size="sm" color="primary" icon="bi-stars" round
                                                    :loading="completionSuggestLoading" @click="loadCompletionSuggestion"
                                                >
                                                    <q-tooltip>Help me decide with AI</q-tooltip>
                                                </q-btn>
                                            </div>
                                            <template v-if="completionSuggestion && !completionSuggestion.eligible">
                                                <!-- AI held it back after reading the responses — warn, and if the offices
                                                     themselves all marked done, spell out the mismatch. Still not blocking:
                                                     the "completed" card below stays clickable. -->
                                                <div class="text-caption text-warning q-mb-sm" v-if="completionSuggestion.aiJudged">
                                                    <q-icon name="bi-exclamation-triangle-fill" size="xs" class="q-mr-xs" />
                                                    {{ completionSuggestion.reason }}
                                                    <template v-if="completionSuggestion.officeMarksReady">
                                                        Every assigned office marked its part done, but the responses don't clearly show the issue was resolved.
                                                    </template>
                                                </div>
                                                <!-- Structural floor not cleared yet (an office hasn't engaged). -->
                                                <div class="text-caption text-grey q-mb-sm" v-else>
                                                    <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                                                    {{ completionSuggestion.reason }}
                                                </div>
                                            </template>
                                            <q-banner v-if="completionSuggestion?.eligible" class="bg-blue-1 text-dark rounded-lg banner-radius q-pa-sm q-mb-sm radius-xs" dense inline-actions>
                                                <template v-slot:avatar><q-icon name="bi-stars" color="primary" /></template>
                                                <div class="text-caption">
                                                    The responses on file look like this was resolved.
                                                    <template v-if="completionSuggestion.llmUnavailable"> Add your own closing remarks below.</template>
                                                    <template v-else> A draft closing summary has been filled in below — review and edit before submitting.</template>
                                                </div>
                                            </q-banner>
                                        </template>
                                    </template>

                                    <div class="row items-start q-gutter-sm q-mb-sm">
                                        <template v-if="!isTerminal">
                                            <q-card
                                                flat
                                                class="office-check-item status-check-item custom-border radius-xs q-pa-md"
                                                :class="[
                                                    statusChoice === 'completed' ? 'status-check-item--positive' : '',
                                                    officesNotReceived.length ? 'status-check-item--disabled' : 'cursor-pointer'
                                                ]"
                                                @click="!officesNotReceived.length && (statusChoice = 'completed')"
                                            >
                                                <div class="row items-center no-wrap q-gutter-xs">
                                                    <q-icon
                                                        :name="statusChoice === 'completed' ? 'bi-check-circle-fill' : 'bi-circle'"
                                                        :color="statusChoice === 'completed' ? 'positive' : 'grey-5'"
                                                        size="1.1em"
                                                    />
                                                    <div class="text-caption text-uppercase text-weight-bold">completed</div>
                                                </div>
                                                <q-tooltip v-if="officesNotReceived.length">
                                                    Blocked until every assigned office acknowledges/receives the feedback.
                                                </q-tooltip>
                                            </q-card>
                                            <q-card
                                                flat
                                                class="office-check-item status-check-item custom-border radius-xs cursor-pointer q-pa-md"
                                                :class="statusChoice === 'cancelled' ? 'status-check-item--negative' : ''"
                                                @click="statusChoice = 'cancelled'"
                                            >
                                                <div class="row items-center no-wrap q-gutter-xs">
                                                    <q-icon
                                                        :name="statusChoice === 'cancelled' ? 'bi-x-circle-fill' : 'bi-circle'"
                                                        :color="statusChoice === 'cancelled' ? 'negative' : 'grey-5'"
                                                        size="1.1em"
                                                    />
                                                    <div class="text-caption text-uppercase text-weight-bold">cancelled</div>
                                                </div>
                                            </q-card>
                                        </template>
                                        <q-card
                                            v-else
                                            flat
                                            class="office-check-item status-check-item custom-border radius-xs cursor-pointer q-pa-md"
                                            :class="statusChoice === 'reopen' ? 'status-check-item--negative' : ''"
                                            @click="statusChoice = 'reopen'"
                                        >
                                            <div class="row items-center no-wrap q-gutter-xs">
                                                <q-icon
                                                    :name="statusChoice === 'reopen' ? 'bi-arrow-counterclockwise' : 'bi-circle'"
                                                    :color="statusChoice === 'reopen' ? 'negative' : 'grey-5'"
                                                    size="1.1em"
                                                />
                                                <div class="text-caption text-uppercase text-weight-bold">reopen</div>
                                            </div>
                                        </q-card>
                                    </div>

                                    <q-input
                                        outlined type="textarea"
                                        v-model="statusRemarks"
                                        :label="isTerminal ? 'Reason for reopening' : 'Remarks'"
                                        class="q-mb-sm"
                                    />
                                    <q-btn
                                        no-caps rounded unelevated color="primary" class="full-width"
                                        label="submit"
                                        :disable="!statusChoice || (isTerminal && !statusRemarks.trim())"
                                        :loading="statusLoading"
                                        @click="requestStatusChange(statusChoice)"
                                    />
                                </template>
                            </q-card-section>
                        </div>
                    </div>
                </q-card-section>
                <q-separator />
                <q-inner-loading :showing="ComplaintStore.isLoading">
                    <q-spinner-ios />
                </q-inner-loading>
            </q-card>
        </q-dialog>

        <q-dialog v-model="showResponsePreview">
            <q-img :src="responsePreview" style="width: 90vw; max-width: 600px;" />
        </q-dialog>

        <q-dialog v-model="createComplaintDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">file feedback</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <CreateComplaintComponent v-if="createComplaintDialog" class="col" @close="createComplaintDialog = false" @saved="onComplaintCreated" />
                </q-card-section>
            </q-card>
        </q-dialog>

        <q-dialog v-model="editComplaintDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">edit feedback</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <CreateComplaintComponent v-if="editComplaintDialog" :complaint="ComplaintStore.details" class="col" @close="editComplaintDialog = false" @saved="onComplaintEdited" />
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, onBeforeMount, watch } from 'vue';
import { useQuasar } from 'quasar';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { socket } from 'src/boot/socket';
import { useComplaintStore } from 'src/stores/complaint-store';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import Apexchart from 'vue3-apexcharts';
import CreateComplaintComponent from 'src/components/CreateComplaintComponent.vue';
import LocationMap from 'src/components/LocationMap.vue';

const $q = useQuasar();
const ComplaintStore = useComplaintStore();
const AuthStore = useAuthStore();

// "Unassigned" only has meaning across the whole system — a single office's staff view is
// already scoped to their own office's complaints, so this is Supervisor-only (super/admin).
// isSupervisor gates actual TRANSACTIONS (create, edit, re-assignment, status changes) — kept
// narrow on purpose, monitoring is excluded from every one of these. canViewAll gates
// system-wide READ-ONLY panels (KPIs, charts, office filter) — monitoring gets the same visibility
// a supervisor has, just none of the buttons.
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const isMonitoring = computed(() => AuthStore.user?.role === 'monitoring');
// Matches the backend's requireRole('super', 'admin') on PATCH /complaint/:id/reopen — same
// audience as updateStatus/completion-suggestion.
// Whether the status panel has anything actionable to offer on an already-finalized complaint —
// only a supervisor account, and only a 'completed' one (never 'cancelled', a deliberate call
// rather than "not actually done"). Drives which branch of the unified status panel renders.
const canReopen = computed(() => isSupervisor.value && ComplaintStore.details?.status === 'completed');

// 're-assign' and 'status' are super/admin-only modules (see the matching v-if on their panels
// below) — hidden from workstation here too, so there's no pill that opens onto a blank panel.
// 'responses' now covers both composing a reply and reading past ones — see its panel below.
const navs = computed(() => [
    { tab: 'responses', label: 'responses' },
    ...(isSupervisor.value ? [
        { tab: 'reassign', label: 're-assignment' },
        { tab: 'status', label: 'status' },
    ] : []),
]);

// Which of the 4 tabs in the complaint detail dialog is active — reassignment/responses/
// respond/status. Reset per complaint opened (see getComplaint) to a sensible default per role:
// supervisors land on reassignment first, workstation lands on the responses record.
const activeTab = ref('responses');

const loading = ref(false);

const filter = ref('');
const filterStatus = ref('all');
const filterOffice = ref([]); // array of officeIds — empty = no office filter (all offices)

// Quick view for the "needs assignment" stat card below — complaints auto-assignment couldn't
// place anywhere (no AI provider configured, or nothing matched a mandate confidently enough).
const showUnassignedOnly = ref(false);
const unassignedCount = ref(0);

const loadUnassignedCount = async () => {
    try {
        const response = await api.get(`/complaint`, { params: { unassigned: 'true', limit: 1 } });
        unassignedCount.value = response.data?.meta?.TotalItems ?? 0;
    } catch (error) {
        console.error("Error fetching unassigned count:", error);
    }
};

const toggleUnassignedFilter = () => {
    showUnassignedOnly.value = !showUnassignedOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Quick view for the "acknowledgement overdue" stat card — offices still holding an
// unreceived complaint past their 24-business-hour deadline (see utils/businessHours.js). The
// count itself now comes from analyticsKpis.ackOverdueCount (loadAnalytics) — one source for
// both roles, already scoped to "my office only" for workstation on the backend — rather than a
// separate admin-only endpoint.
const showOverdueOnly = ref(false);

const toggleOverdueFilter = () => {
    showOverdueOnly.value = !showOverdueOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Quick view for the "resolution overdue" stat card — complaints still open past their
// ARTA/EODB complexity-tier resolution deadline (see utils/businessHours.js). Same deal — count
// comes from analyticsKpis.resolutionOverdueCount now.
const showResolutionOverdueOnly = ref(false);

const toggleResolutionOverdueFilter = () => {
    showResolutionOverdueOnly.value = !showResolutionOverdueOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Plain single-status quick filters — every status except 'unassigned', which already has its
// own dedicated chip/KPI-tile toggle (showUnassignedOnly) since "unassigned" doubles as an
// operational alert, not just a status. One click sets filterStatus; clicking the active one
// again clears back to 'all'.
const STATUS_QUICK_FILTERS = [
    { value: 'unverified', label: 'Unverified' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];
const toggleStatusFilter = (status) => {
    filterStatus.value = filterStatus.value === status ? 'all' : status;
    page.value = 1;
    getAllComplaints();
};

// The rail's "All" chip — clears every quick filter (the three KPI-tile toggles plus the
// completed shortcut) in one call instead of one getAllComplaints() round-trip per filter.
const anyQuickFilterActive = computed(() =>
    showUnassignedOnly.value || showOverdueOnly.value || showResolutionOverdueOnly.value || filterStatus.value !== 'all'
);
const clearQuickFilters = () => {
    showUnassignedOnly.value = false;
    showOverdueOnly.value = false;
    showResolutionOverdueOnly.value = false;
    filterStatus.value = 'all';
    page.value = 1;
    getAllComplaints();
};

/* -------------------- analytics (supervisor) --------------------
   Backs the analytics panels in the main column — a single aggregate call to
   GET /complaint/analytics (admin/super only, see ComplaintController.getAnalytics), fanned out
   into the ApexCharts series/options below plus a couple of plain meters for single-ratio
   figures (SLA compliance, on-time rate per tier, reassignment rate). Everything here is
   Complaint/ComplaintOffice/ComplaintHistory data only — no ratings, no other modules. */

const analyticsLoading = ref(false);
const analyticsPeriod = ref('year'); // 'week' | 'month' | 'year' — sent to GET /complaint/analytics
// Which year the dashboard looks at — defaults to the real current year; stepping back lets you
// browse a past year's data. Same pattern as FeedbackPage.vue's year stepper.
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
// Matches the trend-bucketing convention in ComplaintController (and the same computed used by
// FeedbackPage.vue/DiscussionPage.vue/PollPage.vue): week -> daily buckets, month -> weekly,
// year -> monthly. Drives the "complaints filed per ___" chart title so it actually reflects
// what's plotted instead of always claiming "week".
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');
// Set only for a workstation view (their office's alias/name) — null/empty for super/admin,
// whose dashboard is system-wide and needs no such label.
const analyticsScopeLabel = ref('');
const analyticsKpis = ref({ totalComplaints: 0, avgResolutionDays: null });
// "vs last week/month/year" badges under the total-complaints/avg-resolution-time KPI tiles —
// whichever comparison matches the currently selected period button.
const analyticsTrends = ref({ totalComplaints: null, avgResolutionDays: null });

// Picks minutes/hours/days by magnitude instead of always "Xd" — a resolution that took under an
// hour used to round to "0.0d" and look like broken data.
const formatResolutionTime = (days) => {
    if (days == null) return '—';
    const totalMinutes = days * 24 * 60;
    if (totalMinutes < 60) return Math.round(totalMinutes) + 'm';
    const totalHours = days * 24;
    if (totalHours < 24) return (Math.round(totalHours * 10) / 10) + 'h';
    return (Math.round(days * 10) / 10) + 'd';
};
// Avg. time between every assigned office marking its own part done and a supervisor actually
// finalizing the complaint — see avgApprovalLagHours in ComplaintController.getAnalytics. Reuses
// formatResolutionTime by converting hours -> days, same minutes/hours/days-by-magnitude scaling
// as the resolution-time KPI above rather than a separate formatter.
const approvalLagLabel = computed(() => formatResolutionTime(
    analyticsKpis.value.avgApprovalLagHours != null ? analyticsKpis.value.avgApprovalLagHours / 24 : null
));
const complexityMix = ref([]);
const slaCompliance = ref({ ackRate: null, resolutionRate: null });
const routingAccuracy = ref({ aiAssignedCount: 0, adminAssignedCount: 0, reassignedCount: 0, reassignmentRate: 0 });
// 1-5 star ratings citizens leave on responses — scoped by when the rating was given, not when
// the underlying complaint was filed (see getAnalytics on the backend for why).
const satisfaction = ref({ avgRating: null, totalRatings: 0, distribution: [] });

const STATUS_ORDER = ['unverified', 'verified', 'pending', 'unassigned', 'ongoing', 'completed', 'cancelled'];
// Distinct from the "complaints by status" chart's colors (shared app palette, see
// CHART_PALETTE) — this one stays semantic (grey/blue/green/red carry meaning) since it's the
// solid status pill shown on each list row, paired with a text color for contrast.
const STATUS_PILL = {
    unverified: { bg: '#9E9E9E', text: '#FFFFFF' },
    verified: { bg: '#DCEBFB', text: '#0C447C' },
    pending: { bg: '#FBF1D9', text: '#9A6B00' },
    unassigned: { bg: '#C10015', text: '#FFFFFF' },
    ongoing: { bg: '#004EA8', text: '#FFFFFF' },
    completed: { bg: '#21BA45', text: '#FFFFFF' },
    cancelled: { bg: '#E0E0E0', text: '#616161' },
};

// Single shared palette for every generic categorical/single-series chart on this page (same
// list used on FeedbackPage.vue and the feedback office-detail modal). Status/SLA/complexity
// colors below stay semantic (grey/blue/green/red carry meaning) and are deliberately not
// swapped to this palette.
// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (well, 5 distinct — repeated 3x below to match the array length
// every multi-item chart on this page already expects), just randomized which color lands where.
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

const volumeChartSeries = ref([{ name: 'Filed', data: [] }]);
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

const statusChartSeries = ref([{ name: 'Complaints', data: [] }]);
const statusChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    legend: { show: false },
    colors: [],
    xaxis: { categories: [] },
});

const complexityShareSeries = ref([0, 0, 0]);
const complexityShareOptions = ref({
    chart: { type: 'pie' },
    labels: ['Simple', 'Complex', 'Highly technical'],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const backlogChartSeries = ref([{ name: 'Open', data: [] }]);
const backlogChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Ack rate vs. resolution rate, one grouped column pair per office — grouped column (not
// horizontal-bar like backlog above) since it's two series being compared per category, not one.
const ackResolutionByOfficeSeries = ref([{ name: 'Ack. rate', data: [] }, { name: 'Resolution rate', data: [] }]);
const ackResolutionByOfficeOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    colors: [nextChartColor(), nextChartColor()],
    legend: { position: 'bottom', fontSize: '11px' },
    xaxis: { categories: [] },
    yaxis: { max: 100, labels: { formatter: (v) => Math.round(v) + '%' } },
});

const routingShareSeries = ref([0, 0]);
const routingShareOptions = ref({
    chart: { type: 'pie' },
    labels: ['AI-matched', 'Manually assigned'],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const satisfactionChartSeries = ref([{ name: 'Ratings', data: [0, 0, 0, 0, 0] }]);
const satisfactionChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'] },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

// on_time rate (SLA compliance meters, complexity-tier meters, reassignment rate) — lower isn't
// always worse (reassignment), so callers pass which direction is "good".
const meterColor = (rate) => {
    if (rate == null) return '#BDBDBD';
    return rate >= 85 ? '#21BA45' : rate >= 70 ? '#F2C037' : '#C10015';
};
const reassignMeterColor = (rate) => {
    if (rate == null) return '#BDBDBD';
    return rate <= 10 ? '#21BA45' : rate <= 20 ? '#F2C037' : '#C10015';
};

const applyAnalyticsToCharts = (d) => {
    const volume = d.volumeTrend || [];
    volumeChartSeries.value = [{ name: 'Filed', data: volume.map(w => w.count) }];
    volumeChartOptions.value = {
        ...volumeChartOptions.value,
        xaxis: { ...volumeChartOptions.value.xaxis, categories: volume.map(w => w.label) }
    };

    const sortedStatus = [...(d.statusBreakdown || [])].sort(
        (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    );
    statusChartSeries.value = [{ name: 'Complaints', data: sortedStatus.map(s => s.count) }];
    statusChartOptions.value = {
        ...statusChartOptions.value,
        xaxis: { categories: sortedStatus.map(s => s.status) },
        // Shared app palette, indexed by each status's fixed position in STATUS_ORDER so a given
        // status always gets the same color regardless of which subset of statuses is present.
        colors: sortedStatus.map(s => CHART_PALETTE[STATUS_ORDER.indexOf(s.status) % CHART_PALETTE.length])
    };

    complexityMix.value = d.complexityMix || [];
    complexityShareSeries.value = complexityMix.value.map(t => t.count);

    const backlog = d.officeBacklog || [];
    backlogChartSeries.value = [{ name: 'Open', data: backlog.map(o => o.count) }];
    backlogChartOptions.value = {
        ...backlogChartOptions.value,
        xaxis: { categories: backlog.map(o => o.label) }
    };

    const ackResolution = d.ackResolutionByOffice || [];
    ackResolutionByOfficeSeries.value = [
        { name: 'Ack. rate', data: ackResolution.map(o => o.ackRate) },
        { name: 'Resolution rate', data: ackResolution.map(o => o.resolutionRate) }
    ];
    ackResolutionByOfficeOptions.value = {
        ...ackResolutionByOfficeOptions.value,
        xaxis: { ...ackResolutionByOfficeOptions.value.xaxis, categories: ackResolution.map(o => o.label) }
    };

    routingAccuracy.value = d.routingAccuracy || { aiAssignedCount: 0, adminAssignedCount: 0, reassignedCount: 0, reassignmentRate: 0 };
    routingShareSeries.value = [routingAccuracy.value.aiAssignedCount, routingAccuracy.value.adminAssignedCount];

    slaCompliance.value = d.slaCompliance || { ackRate: null, resolutionRate: null };

    satisfaction.value = d.satisfaction || { avgRating: null, totalRatings: 0, distribution: [] };
    satisfactionChartSeries.value = [{ name: 'Ratings', data: satisfaction.value.distribution.map(s => s.count) }];
};

const loadAnalytics = async () => {
    analyticsLoading.value = true;
    try {
        const { data } = await api.get('/complaint/analytics', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        analyticsKpis.value = data.data.kpis || {};
        analyticsTrends.value = data.data.trends || { totalComplaints: null, avgResolutionDays: null };
        analyticsRangeLabel.value = data.data.range?.label || '';
        analyticsScopeLabel.value = data.data.scope?.label || '';
        applyAnalyticsToCharts(data.data);
    } catch (error) {
        console.error('Error loading complaint analytics:', error);
    } finally {
        analyticsLoading.value = false;
    }
};

const setAnalyticsPeriod = (period) => {
    if (analyticsPeriod.value === period) return;
    analyticsPeriod.value = period;
    loadAnalytics();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    loadAnalytics();
};

/* -------------------- feedback locations map -------------------- */
// Every feedback with a location on file (GET /complaint/locations — scoped/capped server-side,
// see the controller). Not period-scoped, so it isn't reloaded by setAnalyticsPeriod/stepYear —
// only on mount and on the same 'complaints:changed' refresh everything else here uses.
const locationMarkers = ref([]);
const loadLocations = async () => {
    try {
        const { data } = await api.get('/complaint/locations');
        locationMarkers.value = (data.data || []).map(c => ({
            id: c.id,
            lat: c.latitude,
            lng: c.longitude,
            title: c.referenceNo,
            subtitle: c.content,
        }));
    } catch (error) {
        console.error('Error loading feedback locations:', error);
    }
};

// No pagination controls — the rail is a continuously-sorted (newest first, per the backend's
// own ORDER BY) infinite-scroll list. append:false (the default) replaces the list from page 1,
// used for the initial load and every filter/search change; append:true is the scroll-triggered
// "load the next batch" path, used only by loadMoreComplaints below.
const getAllComplaints = async (opts = {}) => {
    const append = !!opts.append;
    if (append) { loadingMore.value = true; } else { loading.value = true; }
    try {
        const response = await api.get(`/complaint`, {
            params: {
                page: page.value,
                limit: limit.value,
                filter: filter.value,
                status: (filterStatus.value == 'all' ? '' : filterStatus.value),
                office: filterOffice.value.length ? filterOffice.value.join(',') : '',
                unassigned: showUnassignedOnly.value ? 'true' : undefined,
                overdue: showOverdueOnly.value ? 'true' : undefined,
                resolutionOverdue: showResolutionOverdueOnly.value ? 'true' : undefined,
            }
        });
        const d = response.data;
        complaints.value = append ? [...complaints.value, ...d.data] : d.data;
        meta.value = d.meta;
    } catch (error) {
        console.error("Error fetching all complaints:", error);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

const complaints = ref([]);
const loadingMore = ref(false);
const hasMoreComplaints = computed(() => complaints.value.length < (meta.value.TotalItems || 0));

const loadMoreComplaints = () => {
    if (loading.value || loadingMore.value || !hasMoreComplaints.value) return;
    page.value++;
    getAllComplaints({ append: true });
};

// Fires on every scroll of the rail; loadMoreComplaints itself no-ops unless there's actually
// more to fetch, so this can stay cheap and unthrottled.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    const el = event.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
        loadMoreComplaints();
    }
    showBackToTop.value = el.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Search box — debounced via the q-input's own `debounce` prop (v-model only updates `filter`
// once the user pauses typing), so this fires already-throttled.
watch(filter, () => {
    page.value = 1;
    getAllComplaints();
});

const formatName = (app) => {
    const user = app?.complaintDetail?.user;
    return user?.firstname || user?.lastname
        ? `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()
        : 'Anonymous';
}

// A single at-a-glance severity for the list rail's left-edge stripe — reads the same
// compliance fields the detail modal already annotates each row with (see
// annotateOfficeCompliance/annotateResolutionCompliance on the backend), just condensed to one
// of four buckets instead of a per-office breakdown.
const rowSeverity = (dt) => {
    if (dt.status === 'unassigned') return 'sev-bad';
    const activeOffices = (dt.complaintOffices || []).filter(co => co.isActive);
    if (activeOffices.some(co => ['late', 'overdue'].includes(co.receiveComplianceStatus))) return 'sev-bad';
    if (['late', 'overdue'].includes(dt.resolutionComplianceStatus)) return 'sev-bad';
    if (dt.resolutionComplianceStatus === 'on_time' || dt.status === 'completed') return 'sev-good';
    if (dt.resolutionComplianceStatus === 'awaiting' || activeOffices.some(co => co.receiveComplianceStatus === 'awaiting')) return 'sev-warn';
    return 'sev-flat';
};

// Active office alias(es) for a list row — the closest thing to a "category" a complaint has
// now that ComplaintType routing is gone; office is what it's actually about, in practice.
const primaryOfficeLabel = (dt) => (dt.complaintOffices || [])
    .filter(co => co.isActive)
    .map(co => co.office?.alias)
    .filter(Boolean)
    .join(', ');

const meta = ref({});
const page = ref(1);
const limit = ref(20); // batch size for infinite scroll — bigger than the old 10/page default

const UpdateOffice = () => {
    page.value = 1;
    getAllComplaints();
}

// Multi-select office filter — pill row in the rail header. Toggling one adds/removes it from
// filterOffice rather than replacing it, so several offices can be filtered on at once.
const toggleOfficeFilter = (officeId) => {
    filterOffice.value = filterOffice.value.includes(officeId)
        ? filterOffice.value.filter(id => id !== officeId)
        : [...filterOffice.value, officeId];
    UpdateOffice();
};
const clearOfficeFilter = () => {
    filterOffice.value = [];
    UpdateOffice();
};

onBeforeMount(() => {
    ComplaintStore.year = new Date().getFullYear();
    LoadOffice();
    ComplaintStore.dialog = false;
    ComplaintStore.details = {};
})

// Live refresh: the backend emits 'complaints:changed' whenever a complaint is filed, verified
// via OTP, reassigned, has its status changed, or is received/responded-to/completed by an
// office (see utils/notifySocket.broadcastComplaintsChanged). Reset to page 1 — a new complaint
// sorts to the top (createdAt DESC), and refreshing at a deeper infinite-scroll page would drop
// it. Debounced so a burst of changes triggers one refetch, not many.
let refreshTimer = null;
const onComplaintsChanged = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
        page.value = 1;
        getAllComplaints();
        if (canViewAll.value) { loadUnassignedCount(); }
        loadAnalytics();
        loadLocations();
        // If a detail dialog is open, keep it current too.
        const openId = ComplaintStore.details?.id;
        if (ComplaintStore.dialog && openId) getComplaint(openId, { resetTab: false });
    }, 800);
};

onMounted(() => {
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
    loadLocations();
    socket.on('complaints:changed', onComplaintsChanged);
});

onUnmounted(() => {
    clearTimeout(refreshTimer);
    socket.off('complaints:changed', onComplaintsChanged);
});

/* -------------------- create complaint (super/admin, on a citizen's behalf) -------------------- */

const createComplaintDialog = ref(false);
const onComplaintCreated = () => {
    createComplaintDialog.value = false;
    // A new complaint always sorts to the very top (createdAt DESC) — without resetting to page
    // 1, refreshing at whatever page the rail's infinite scroll had reached would replace the
    // list with that later page's rows instead, and the new complaint wouldn't show up at all.
    page.value = 1;
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
};

const editComplaintDialog = ref(false);
const onComplaintEdited = async () => {
    editComplaintDialog.value = false;
    const id = ComplaintStore.details?.id;
    if (id) await getComplaint(id, { resetTab: false });
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
};

const OptionStatus = ref([
    {
        value: "all",
        label: "All"
    },
    {
        value: "unverified",
        label: "Unverified"
    },
    {
        value: "pending",
        label: "Pending"
    },
    {
        value: "unassigned",
        label: "Unassigned"
    },
    {
        value: "ongoing",
        label: "Ongoing"
    },
    {
        value: "completed",
        label: "Completed"
    },
    {
        value: "cancelled",
        label: "Cancelled"
    }
]);

const OptionOffice = ref([]);
const filteredOffice = ref([]);

const LoadOffice = async () => {
    try {
        const { data } = await api.get(`/preference/office/getOffice`);
        OptionOffice.value = [
            {
                label: 'All',
                value: 'all'
            },
            ...(data || []).map(d => {
                const baseLabel = d.label ?? d.alias ?? String(d.text ?? d.value ?? '');
                return {
                    label: baseLabel,
                    // Formal name + alias, e.g. "Office of the Local Economic and Business
                    // Development Officer (LEBDO)" — used by the reassignment office list below.
                    fullLabel: d.name ? (d.alias ? `${d.name} (${d.alias})` : d.name) : baseLabel,
                    value: Number(d.value ?? d.id)
                };
            })
        ];
        filteredOffice.value = [...OptionOffice.value];
    } catch (error) {
        console.error("Error fetching options:", error);
    }
};


// resetTab: true only when opening the modal on a (possibly different) complaint — the tab
// should land on "responses" by default there. Every post-save refresh (reassign, status change,
// receive, respond) passes resetTab: false so the tab the user was already on doesn't jump back.
const getComplaint = async (id, { resetTab = true } = {}) => {
    resetReassignPanel();
    statusChoice.value = null;
    statusRemarks.value = '';
    completionSuggestion.value = null;
    markAsDone.value = false;
    if (resetTab) activeTab.value = 'responses';
    try {
        const response = await api.get(`/complaint/${id}`);
        const d = response.data;
        ComplaintStore.details = d.data;

        // Re-assignment tab defaults to what's already active — a supervisor opening it is far
        // more often adjusting the current assignment than replacing it wholesale, so both panels
        // start pre-selected on the current office(s)/tier rather than blank.
        const activeOfficeRows = (d.data.complaintOffices || []).filter(co => co.isActive);
        selectedOfficeIds.value = activeOfficeRows.map(co => co.officeId);
        const reasons = {};
        activeOfficeRows.forEach(co => { if (co.assignmentReason) reasons[co.officeId] = co.assignmentReason; });
        reasonsByOffice.value = reasons;
        selectedComplexity.value = d.data.complexity || null;
    } catch (error) {
        console.error("Error fetching all complaints:", error);
    }
}

// Once a complaint is finalized (completed/cancelled), every transactional module — reassignment,
// status changes, workstation responses — is locked. Only the record itself (content, responses,
// history) stays viewable.
const isTerminal = computed(() => ['completed', 'cancelled'].includes(ComplaintStore.details?.status));

/* -------------------- responses -------------------- */

// Latest first — the backend doesn't guarantee an order, and the merged "responses" tab (compose
// on top, history below) reads better with the newest reply right under the compose box.
const sortedResponses = computed(() =>
    [...(ComplaintStore.details?.responses || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

const responseDepartment = (r) => {
    const office = r?.user?.staff?.office;
    if (office) return office.alias || office.name;
    // Super/admin have no office of their own — label by role instead of repeating their name.
    if (['super', 'admin'].includes(r?.user?.role)) return 'supervisor';
    // The citizen who filed the complaint can also post a follow-up (see the external app's
    // "add a follow-up" box) — label it distinctly from staff/supervisor entries.
    if (r?.user?.role === 'citizen') return 'citizen';
    return 'Unknown';
};

const responderName = (r) => {
    const u = r?.user;
    const name = `${u?.firstname || ''} ${u?.lastname || ''}`.trim();
    return name || u?.username || 'Unknown';
};

/* -------------------- response ratings -------------------- */

// Only staff/supervisor replies can be rated — a citizen's own follow-up can't (matches the
// external app, which hides the star widget on citizen-authored entries).
const canBeRated = (r) => r?.user?.role !== 'citizen';

// The complaint is owned by a single citizen, and only that citizen can rate (enforced
// server-side), so responseRatings holds 0 or 1 entry — their score for this response.
const responseRating = (r) => r?.responseRatings?.[0]?.rate ?? 0;

// Citizen satisfaction per office, from the stars left on that office's responses in THIS
// complaint. Office = the responding staff member's office (responseDepartment), so a
// supervisor's general updates group under "supervisor".
const officeSatisfaction = computed(() => {
    const groups = {};
    for (const r of (ComplaintStore.details?.responses || [])) {
        if (!canBeRated(r)) continue;
        const rate = responseRating(r);
        if (!rate) continue;
        const label = responseDepartment(r);
        if (!groups[label]) groups[label] = [];
        groups[label].push(rate);
    }
    return Object.entries(groups).map(([label, rates]) => ({
        label,
        count: rates.length,
        avg: rates.reduce((sum, x) => sum + x, 0) / rates.length,
    }));
});

const responderInitials = (r) => {
    const u = r?.user;
    const initials = `${(u?.firstname || '')[0] || ''}${(u?.lastname || '')[0] || ''}`.toUpperCase();
    return initials || '?';
};

const formatAvatar = (user) => `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`;

const isResponsePdf = (file) => file?.file?.startsWith('data:application/pdf') || /\.pdf$/i.test(file?.filename || '');

const responsePreview = ref('');
const showResponsePreview = computed({
    get: () => !!responsePreview.value,
    set: (v) => { if (!v) responsePreview.value = ''; }
});

/* -------------------- acknowledgement compliance -------------------- */
// co.receiveComplianceStatus is computed server-side from receivedAt/receiveDeadline — see
// getReceiveComplianceStatus in the backend's utils/businessHours.js. Never derived here.

const complianceLabel = (co) => ({
    on_time: 'acknowledged on time',
    late: 'acknowledged late',
    overdue: 'acknowledgement overdue',
    awaiting: `awaiting — ${formatTimeLeft(co.receiveDeadline)}`,
}[co.receiveComplianceStatus] || '');

const complianceColor = (co) => ({
    on_time: 'positive',
    late: 'negative',
    overdue: 'negative',
    awaiting: 'orange',
}[co.receiveComplianceStatus] || 'grey');

const complianceTooltip = (co) => {
    const deadline = co.receiveDeadline ? moment(co.receiveDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (co.receiveComplianceStatus === 'awaiting') return `Must be received by ${deadline} (24 business hours from assignment).`;
    if (co.receiveComplianceStatus === 'overdue') return `Deadline was ${deadline} — still not received.`;
    if (co.receiveComplianceStatus === 'on_time') return `Received on ${moment(co.receivedAt).format('MMM DD, YYYY hh:mm A')} — deadline was ${deadline}.`;
    if (co.receiveComplianceStatus === 'late') return `Received on ${moment(co.receivedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} deadline.`;
    return '';
};

const formatTimeLeft = (deadline) => {
    if (!deadline) return '';
    const hours = moment(deadline).diff(moment(), 'hours');
    if (hours < 1) return 'less than 1h left';
    if (hours < 24) return `${hours}h left`;
    return `${Math.round(hours / 24)}d left`;
};

/* -------------------- resolution compliance (whole-complaint, ARTA/EODB tier) -------------------- */
// ComplaintStore.details.resolutionComplianceStatus is computed server-side from
// completedAt/resolutionDeadline — see getResolutionComplianceStatus in the backend's
// utils/businessHours.js. Never derived here.

const complexityLabel = (complexity) => (complexity || '').replace('_', ' ');

const formatDaysLeft = (deadline) => {
    if (!deadline) return '';
    const days = moment(deadline).diff(moment(), 'days');
    if (days < 1) return formatTimeLeft(deadline);
    return `${days}d left`;
};

const resolutionComplianceLabel = computed(() => ({
    on_time: 'resolved on time',
    late: 'resolved late',
    overdue: 'resolution overdue',
    awaiting: `resolution due — ${formatDaysLeft(ComplaintStore.details?.resolutionDeadline)}`,
}[ComplaintStore.details?.resolutionComplianceStatus] || ''));

const resolutionComplianceColor = computed(() => ({
    on_time: 'positive',
    late: 'negative',
    overdue: 'negative',
    awaiting: 'orange',
}[ComplaintStore.details?.resolutionComplianceStatus] || 'grey'));

const resolutionComplianceTooltip = computed(() => {
    const d = ComplaintStore.details;
    const deadline = d?.resolutionDeadline ? moment(d.resolutionDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (d.resolutionComplianceStatus === 'awaiting') return `Target resolution by ${deadline} (${complexityLabel(d.complexity)} tier).`;
    if (d.resolutionComplianceStatus === 'overdue') return `Target was ${deadline} — still not resolved.`;
    if (d.resolutionComplianceStatus === 'on_time') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — target was ${deadline}.`;
    if (d.resolutionComplianceStatus === 'late') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} target.`;
    return '';
});

// THIS complaint's own office-done -> approval gap — computed client-side from data already on
// the detail payload (each office's completedAt + the complaint's own), no separate endpoint
// needed. Only meaningful once actually completed; null while still open or if cancelled.
const approvalLagForThisComplaint = computed(() => {
    const d = ComplaintStore.details;
    if (!d || d.status !== 'completed' || !d.completedAt) return null;
    const activeCompletedAts = (d.complaintOffices || [])
        .filter(co => co.isActive && co.completedAt)
        .map(co => new Date(co.completedAt).getTime());
    if (!activeCompletedAts.length) return null;
    const lastOfficeDoneAt = Math.max(...activeCompletedAts);
    const hours = (new Date(d.completedAt).getTime() - lastOfficeDoneAt) / 3600000;
    return hours >= 0 ? { lastOfficeDoneAt, hours } : null;
});
const approvalLagForThisComplaintLabel = computed(() => {
    const lag = approvalLagForThisComplaint.value;
    return lag ? formatResolutionTime(lag.hours / 24) : null;
});

/* -------------------- office reassignment -------------------- */

// All offices ever assigned — active or disabled (cancellation disables rather than removes
// them, see requestStatusChange, so a cancelled complaint's offices still show up here, greyed
// out and badged "disabled" in the template).
const displayOffices = computed(() => ComplaintStore.details?.complaintOffices || []);

// Single-pin marker for this complaint's own location, if it has one on file (LocationMap takes
// an array either way — see the "feedback locations" overview panel for the multi-pin case).
const detailLocationMarkers = computed(() => {
    const detail = ComplaintStore.details?.complaintDetail;
    const lat = detail?.latitude != null ? Number(detail.latitude) : null;
    const lng = detail?.longitude != null ? Number(detail.longitude) : null;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return [];
    return [{ id: ComplaintStore.details.id, lat, lng, title: ComplaintStore.details?.referenceNo }];
});
const activeOffices = computed(() => displayOffices.value.filter(co => co.isActive));
// Offices still assigned (active) that haven't acknowledged/received the complaint yet — mirrors
// the backend's own guard in updateStatus, surfaced here so the "completed" card is disabled
// client-side too instead of only failing after submit.
const officesNotReceived = computed(() => activeOffices.value.filter(co => co.status === 'pending'));

const suggestions = ref([]);
const suggestLoading = ref(false);
const suggestionsChecked = ref(false);
const suggestedOfficeIds = computed(() => new Set(suggestions.value.map(s => s.officeId)));

// Multi-office selection: which office cards are checked, and each one's reason (from the AI
// suggestion it matched, or left blank for a manually-added office — the shared textarea below
// is used as a fallback for those at submit time).
const selectedOfficeIds = ref([]);
const reasonsByOffice = ref({});
const reassignReason = ref(''); // fallback reason for offices with no reason of their own
const reassignLoading = ref(false);
// Offices with a reason on file (AI-suggested or picked up from a manual match) — the list shown
// below the office pill row.
const officesWithReason = computed(() => filteredOffice.value.filter(o => o.value !== 'all' && reasonsByOffice.value[o.value]));

const resetReassignPanel = () => {
    suggestions.value = [];
    suggestLoading.value = false;
    suggestionsChecked.value = false;
    selectedOfficeIds.value = [];
    reasonsByOffice.value = {};
    reassignReason.value = '';
    reassignLoading.value = false;
    selectedComplexity.value = null;
    suggestedComplexity.value = null;
};

// Mirrors the backend's RESOLUTION_DAYS (utils/businessHours.js) — display-only, the backend
// stays the single source of truth for what each tier actually resolves to.
const COMPLEXITY_OPTIONS = [
    { value: 'simple', label: 'Simple', days: 3 },
    { value: 'complex', label: 'Complex', days: 7 },
    { value: 'highly_technical', label: 'Highly Technical', days: 20 },
];
const selectedComplexity = ref(null);
const complexityLoading = ref(false);
// AI-suggested complexity tier — comes back from the same suggest-office call (one LLM request
// already classifies both), so the sparkle button in either section triggers loadSuggestions()
// and populates both this and `suggestions` together.
const suggestedComplexity = ref(null);

const submitReassignComplexity = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || !selectedComplexity.value) return;

    const tier = COMPLEXITY_OPTIONS.find(c => c.value === selectedComplexity.value);
    const result = await Swal.fire({
        title: 'Reassign this feedback\'s SLA?',
        html: `Reclassify as <b>${tier?.label || selectedComplexity.value}</b> (${tier?.days ?? '?'}-day target)? The resolution deadline is recomputed from when this feedback was filed — this can move it earlier or later.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'reassign SLA',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    complexityLoading.value = true;
    try {
        const response = await api.patch(`/complaint/${id}/complexity`, { complexity: selectedComplexity.value });
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
        await getComplaint(id, { resetTab: false });
        loadAnalytics();
    } catch (error) {
        console.error("Error reassigning complexity:", error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'Unable to reassign this feedback\'s SLA.'}<div>
            `
        });
    } finally {
        complexityLoading.value = false;
    }
};

const loadSuggestions = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;

    suggestLoading.value = true;
    suggestionsChecked.value = false;
    try {
        const response = await api.get(`/complaint/${id}/suggest-office`);
        suggestions.value = response.data?.suggestions || [];
        suggestionsChecked.value = true;
        // Auto-check every suggested card and drop in its reason — no extra "use this" click needed.
        applyAllSuggestions();
        // Same call classifies a complexity tier too — badge it and pre-select it, same "no extra
        // click needed" treatment as the office suggestions above.
        suggestedComplexity.value = response.data?.complexity || null;
        if (suggestedComplexity.value) selectedComplexity.value = suggestedComplexity.value;
    } catch (error) {
        console.error("Error fetching office suggestion:", error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'Unable to get a suggestion right now.'}<div>
            `
        });
    } finally {
        suggestLoading.value = false;
    }
};

const applyAllSuggestions = () => {
    const ids = new Set(selectedOfficeIds.value);
    for (const s of suggestions.value) {
        ids.add(s.officeId);
        reasonsByOffice.value[s.officeId] = s.reason || '';
    }
    selectedOfficeIds.value = [...ids];
};

// Toggle a card in/out of the selected set. Checking one that was AI-suggested adopts its reason.
const toggleOffice = (officeId) => {
    const idx = selectedOfficeIds.value.indexOf(officeId);
    if (idx >= 0) {
        selectedOfficeIds.value.splice(idx, 1);
        return;
    }
    selectedOfficeIds.value.push(officeId);
    const matched = suggestions.value.find(s => s.officeId === officeId);
    if (matched?.reason) reasonsByOffice.value[officeId] = matched.reason;
};

const submitReassign = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;

    const names = selectedOfficeIds.value
        .map(oid => {
            const o = filteredOffice.value.find(x => x.value === oid);
            return o?.fullLabel || o?.label || `Office #${oid}`;
        });
    const result = await Swal.fire({
        title: names.length ? 'Reassign this feedback?' : 'Clear this assignment?',
        html: names.length
            ? `Set the handling office(s) to <b>${names.join(', ')}</b>? Any office not in that list is unassigned from this feedback, and each new one starts its own acknowledgement clock.`
            : `Remove every office from this feedback? It goes back to <b>unassigned</b> for someone to route manually.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: names.length ? 'reassign' : 'clear assignment',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    reassignLoading.value = true;
    try {
        const offices = selectedOfficeIds.value.map(officeId => ({
            officeId,
            reason: reasonsByOffice.value[officeId] || reassignReason.value || undefined
        }));
        const response = await api.patch(`/complaint/${id}/office`, { offices });
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
        if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
    } catch (error) {
        console.error("Error reassigning office:", error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'Unable to reassign this feedback.'}<div>
            `
        });
    } finally {
        reassignLoading.value = false;
    }
};

/* -------------------- status control (super/admin) -------------------- */
// One process for every whole-complaint transition — finalize forward (completed/cancelled, via
// updateStatus) or walk back (reopen, via ComplaintController.reopen) all go through this same
// pick-a-card -> remarks/reason -> submit flow (see the status tab's template). Which target(s)
// are even offered is decided by the template (canReopen); this function just dispatches to
// whichever endpoint that target actually needs.

const statusLoading = ref(false);
const statusChoice = ref(null); // which card is selected — 'completed' | 'cancelled' | 'reopen' | null
const statusRemarks = ref(''); // doubles as the reopen reason when statusChoice === 'reopen'

const requestStatusChange = (target) => {
    if (!target) return;
    const isReopen = target === 'reopen';

    if (isReopen) {
        if (!statusRemarks.value.trim()) {
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">not yet</div><div class="text-caption;">A reason is required to reopen this feedback.<div>`
            });
            return;
        }
    } else {
        if (ComplaintStore.details?.status === target) return;
        if (target === 'completed' && officesNotReceived.value.length) {
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">not yet</div><div class="text-caption;">Every assigned office must acknowledge/receive the feedback first.<div>`
            });
            return;
        }
    }

    Swal.fire({
        title: isReopen ? 'Reopen this feedback?' : 'Confirm',
        html: isReopen
            ? `This tells the citizen it isn't actually resolved yet, and resets every office that was marked completed back to ongoing.`
            : `Mark this feedback as <b>${target.toUpperCase()}</b>? Every office it's assigned to will be marked ${target} as well. This should only be done when it's final.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: isReopen ? 'reopen' : 'confirm',
        cancelButtonText: 'cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        const id = ComplaintStore.details?.id;
        if (!id) return;

        statusLoading.value = true;
        try {
            const response = isReopen
                ? await api.patch(`/complaint/${id}/reopen`, { reason: statusRemarks.value.trim() })
                : await api.patch(`/complaint/${id}/status`, {
                    status: target,
                    remarks: statusRemarks.value,
                    // Purely a history-log tag on the backend (see updateStatus) — true whenever the
                    // AI suggestion banner was showing an eligible suggestion at submit time,
                    // regardless of whether the remarks were left as-drafted or edited.
                    aiAssisted: target === 'completed' && !!completionSuggestion.value?.eligible && !completionSuggestion.value?.llmUnavailable
                });
            Toast.fire({
                icon: "success",
                html: `<div class="text-h6 text-bold text-uppercase">${isReopen ? 'reopened!' : 'updated!'}</div><div class="text-caption;">${response.data.message}<div>`
            });
            statusChoice.value = null;
            statusRemarks.value = '';
            completionSuggestion.value = null;
            await getComplaint(id, { resetTab: false });
            getAllComplaints();
            if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
        } catch (error) {
            console.error("Error updating status:", error);
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || (isReopen ? 'Unable to reopen this feedback.' : 'Unable to update status.')}<div>`
            });
        } finally {
            statusLoading.value = false;
        }
    });
};

/* -------------------- AI-assisted completion suggestion (super/admin) -------------------- */
// Advisory only — GET /complaint/:id/completion-suggestion never changes anything server-side.
// Accepting it just pre-fills statusChoice/statusRemarks above; the actual finalization still
// goes through requestStatusChange -> updateStatus like any manual completion.

// { eligible, reason, draftRemarks, llmUnavailable, basis?, aiJudged?, officeMarksReady? } | null
const completionSuggestion = ref(null);
const completionSuggestLoading = ref(false);

const loadCompletionSuggestion = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;

    completionSuggestLoading.value = true;
    try {
        const { data } = await api.get(`/complaint/${id}/completion-suggestion`);
        completionSuggestion.value = data;
        if (data.eligible && !officesNotReceived.value.length) {
            statusChoice.value = 'completed';
            if (data.draftRemarks) statusRemarks.value = data.draftRemarks;
        }
    } catch (error) {
        console.error("Error fetching completion suggestion:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to get a suggestion right now.'}<div>`
        });
    } finally {
        completionSuggestLoading.value = false;
    }
};

/* -------------------- undone (super/admin) -------------------- */
// The counterpart to the response composer's "done" pill — reverses ONE office's own completion
// while the complaint as a whole is still open (see ResponseController.reopenOffice). The bigger
// "reopen this complaint" case, for after the whole thing was already finalized, is folded into
// the unified status panel above instead (statusChoice === 'reopen').

const sendBackLoading = ref(null); // holds the ComplaintOffice id currently being marked undone, or null

const confirmSendBack = (co) => {
    // Plain confirmation only — no reason prompt. Unlike the whole-complaint reopen above (which
    // reverses an already citizen-notified finalization and keeps a mandatory reason), undoing one
    // office's own "done" mark while the complaint is still open is lower-stakes and doesn't need one.
    Swal.fire({
        title: 'Mark undone?',
        html: `Reverse <b class="text-uppercase">${co.office?.name || co.office?.alias}</b>'s "done" mark on this feedback? They'll need to resolve it again.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'mark undone',
        cancelButtonText: 'cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        sendBackLoading.value = co.id;
        try {
            const response = await api.post('/response/reopen', { complaintOfficeId: co.id });
            Toast.fire({
                icon: "success",
                html: `<div class="text-h6 text-bold text-uppercase">marked undone!</div><div class="text-caption;">${response.data.message}<div>`
            });
            await getComplaint(ComplaintStore.details.id, { resetTab: false });
            getAllComplaints();
        } catch (error) {
            console.error("Error marking office undone:", error);
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to mark this undone.'}<div>`
            });
        } finally {
            sendBackLoading.value = null;
        }
    });
};

/* -------------------- workstation actions -------------------- */

const myOfficeAssignment = computed(() =>
    (ComplaintStore.details?.complaintOffices || []).find(
        co => co.isActive && co.officeId === AuthStore.user?.staff?.officeId
    )
);

const responseContent = ref('');
const responseFiles = ref(null);
const receiveLoading = ref(false);
const respondLoading = ref(false);
// The "done" pill toggle on the response composer — off submits a plain response
// (/response/respond); on submits the SAME response through /response/complete instead, which
// also marks this office's ComplaintOffice row 'completed'. Reset after every submit and every
// time a different complaint is opened (see getComplaint) so it never silently carries over.
const markAsDone = ref(false);

const submitReceive = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;
    receiveLoading.value = true;
    try {
        await api.post('/response/receive', { complaintId: id });
        Toast.fire({ icon: "success", html: `<div class="text-h6 text-bold text-uppercase">received!</div>` });
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
    } catch (error) {
        console.error("Error receiving complaint:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to receive this feedback.'}<div>`
        });
    } finally {
        receiveLoading.value = false;
    }
};

// One submit path for both — the "done" pill just decides which endpoint the SAME typed response
// goes to. markAsDone posts through /response/complete (workstation-only on the backend, so the
// pill itself is also hidden for anyone else — see the template) instead of /response/respond,
// which additionally marks this office's ComplaintOffice row 'completed'. A confirm dialog only
// gates the done path, since that one isn't easily undone by the office itself afterward (see
// confirmSendBack, a supervisor-only reversal).
const submitRespond = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || !responseContent.value) return;

    if (markAsDone.value) {
        const result = await Swal.fire({
            title: 'Confirm',
            html: `Send this response and mark your office's part of this feedback as <b>DONE</b>? A supervisor can send it back if it turns out it isn't.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'confirm',
            cancelButtonText: 'cancel',
            reverseButtons: true
        });
        if (!result.isConfirmed) return;
    }

    respondLoading.value = true;
    try {
        let successHtml;
        if (markAsDone.value) {
            // No file upload on this path — /response/complete takes no attachments (see the
            // template's v-if hiding the evidence field while the pill is on).
            const response = await api.post('/response/complete', { complaintId: id, content: responseContent.value });
            successHtml = `<div class="text-h6 text-bold text-uppercase">done!</div><div class="text-caption;">${response.data.message}<div>`;
        } else {
            const formData = new FormData();
            formData.append('complaintId', id);
            formData.append('content', responseContent.value);
            (responseFiles.value || []).forEach(f => formData.append('files', f));
            await api.post('/response/respond', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            successHtml = `<div class="text-h6 text-bold text-uppercase">sent!</div>`;
        }
        Toast.fire({ icon: "success", html: successHtml });
        responseContent.value = '';
        responseFiles.value = null;
        markAsDone.value = false;
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
    } catch (error) {
        console.error("Error sending response:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to send this response.'}<div>`
        });
    } finally {
        respondLoading.value = false;
    }
};

const formatHistoryDate = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const randomAvatar = ref('')

const GenerateRandomAvatar = () => {
    const randomNumber = Math.floor(Math.random() * 5) + 1
    randomAvatar.value = new URL(
        `../assets/icons/A${randomNumber}.png`,
        import.meta.url
    ).href
}

const FormatOffices = (complaintOffices) => {
    const offices = complaintOffices?.filter(item => item.isActive).map(
        item => item?.office?.alias
    ) || [];

    if (!offices.length) return '';
    if (offices.length === 1) return offices[0];
    if (offices.length === 2) return offices.join(' & ');

    return `${offices.slice(0, -1).join(', ')} & ${offices.at(-1)}`;
};

const slide = ref(1);

const FormatFile = (file) => {
    const baseUrl = process.env.VUE_APP_BACKEND_URL;
    return `${baseUrl}${file.file}`;
}
</script>

<style scoped>
/* Two-column shell: analytics main column (left, flexes) + a full-height complaint list rail
   (right, fixed width). --rail-only drops to a single column for roles with no analytics access
   (workstation), where the list is the whole page. */
.cp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
.cp-shell--rail-only {
    grid-template-columns: 1fr;
}
@media (max-width: 1200px) {
    .cp-shell {
        grid-template-columns: 1fr;
    }
}
.cp-main {
    min-width: 0;
}
/* auto-fit + a stretched grid row means every tile in the same row matches the tallest one
   (e.g. a tile with a trend badge) regardless of how many tiles wrap into that row. */
.cp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}
/* Dedicated KPI tile — deliberately not reusing the legacy .card class (a fixed 225x250px
   square meant for the old icon-tile grid), which was clipping/overlapping neighbors here since
   it ignored the column width entirely. height:100% fills its stretched grid cell (see
   .cp-kpi-grid) instead of sizing to its own content, so every tile in a row lines up evenly. */
.cp-kpi {
    width: 100%;
    height: 100%;
    min-height: 92px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: transform 220ms cubic-bezier(.2, .8, .2, 1), box-shadow 220ms ease;
}
.cp-kpi:hover {
    transform: scale(1.02);
}
.cp-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.cp-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.cp-kpi-info {
    opacity: 0.75;
    cursor: help;
    vertical-align: -1px;
}
/* "vs last week/month/year" badge under a KPI tile's value — a soft pill readable on the tile's
   own bg-primary background, colored green/red by the raw direction of change (not a domain
   judgment about which direction is "good" for that particular metric). */
.cp-kpi-trend {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 10.5px;
    font-weight: 600;
    margin-top: 6px;
    padding: 1px 6px 1px 2px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.16);
}
.cp-kpi-trend--up {
    color: #B6F5C6;
}
.cp-kpi-trend--down {
    color: #FFC9CE;
}
.cp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.cp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.cp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.cp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.cp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.cp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.cp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
/* List rail search + quick-filter chips */
.cp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.cp-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.cp-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
/* Status/complexity pills on each list row */
.cp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.cp-pill--light {
    background: #F6F9FC;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
}
.cp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.cp-panel {
    min-width: 0;
}
.cp-panel--wide {
    grid-column: span 2;
}
/* Always the full row, regardless of how many columns the auto-fit grid settles on at the
   current width — unlike --wide's fixed span:2, which only fills the row when the grid happens
   to land on exactly 2 columns. */
.cp-panel--full {
    grid-column: 1 / -1;
}
@media (max-width: 900px) {
    .cp-panel--wide {
        grid-column: span 1;
    }
}
.cp-rail {
    min-width: 0;
}
/* Below the point .cp-shell collapses to one column (see the media query above), the rail is
   just another stacked block — normal flow, no bleed. */
.cp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
/* Floating "back to top" for the scrollable list below — .cp-rail-card is the positioning
   context in both layouts (relative here, fixed on wide viewports below), so this stays pinned
   to the rail's own bottom-right corner rather than the page's. */
.cp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
/* Above that point, the rail bleeds past q-page's own padding (q-pa-lg, MainLayout.vue) and
   pins to the browser viewport's top/right/bottom edges — a full-height panel with no inset,
   rather than a card floating with margin like the rest of the page. position: fixed sidesteps
   fighting that ancestor padding entirely, since it's anchored to the viewport, not to .cp-rail
   (which still reserves the 380px grid column so .cp-main never renders underneath it). */
@media (min-width: 1201px) {
    .cp-rail-card {
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
.cp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
/* Floating "undone" icon for a completed office — sits over the top-right corner of its card
   instead of inline next to the status badge, so it reads as a standalone action rather than
   competing with the status/compliance badges for space in the side column. */
.cp-office-item {
    position: relative;
    padding-top: 26px;
}
.cp-office-undone-btn {
    position: absolute;
    top: 3px;
    right: 3px;
    z-index: 2;
}
.cp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.cp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.cp-list-item:hover {
    background: var(--q-accent, #F6F9FC);
}
.cp-list-item.sev-bad {
    border-left-color: var(--q-negative);
}
.cp-list-item.sev-warn {
    border-left-color: var(--q-warning);
}
.cp-list-item.sev-good {
    border-left-color: var(--q-positive);
}
.cp-list-item.sev-flat {
    border-left-color: #E0E0E0;
}
.cp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.cp-list-load-more {
    padding: 14px 16px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}
.cp-meter {
    height: 7px;
    border-radius: 4px;
    background: #EEEEEE;
    overflow: hidden;
}
.cp-meter-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
}
.response-evidence-thumb {
    width: 84px;
    height: 84px;
}
/* Only this list scrolls within the merged "responses" tab — the compose box above it stays put
   regardless of how many past responses there are, instead of the whole tab/page growing
   unbounded. */
.response-list-scroll {
    max-height: 420px;
    overflow-y: auto;
}
/* Width shrinks to fit the office name (the reason text below wraps within it rather than
   pushing the card wider), bounded so a short name doesn't get a cramped card and a long
   name doesn't run edge-to-edge. Height is left to each card's own content — the parent row
   uses items-start (see template) so a taller card (e.g. one with an AI reason) never
   stretches its neighbors to match; every card grows independently. */
.office-check-item {
    width: fit-content;
    min-width: 160px;
    max-width: 100%;
    transition: border-color 0.15s ease, background 0.15s ease;
}
.office-check-item:hover {
    border-color: var(--q-primary);
}
.office-check-item--active {
    border-color: var(--q-primary);
    background: rgba(0, 78, 168, 0.06);
}
/* Status cards reuse the same shrink-to-fit card look as office selection, just with a
   positive/negative accent instead of primary once chosen. */
.status-check-item {
    min-width: 140px;
}
.status-check-item--positive {
    border-color: var(--q-positive);
    background: rgba(33, 186, 69, 0.06);
}
.status-check-item--negative {
    border-color: var(--q-negative);
    background: rgba(193, 0, 21, 0.06);
}
.status-check-item--disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.card {
    height: 250px;
    width: 225px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
.card-status {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
.card-hover-animate {
    transition: border-color 0.3s ease, transform 0.2s ease;
}

.card-hover-animate:hover {
  transform: scale(1.02); /* optional zoom effect */
}
.card-graph {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
</style>