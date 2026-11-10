<template>
    <div>
        <q-dialog persistent :model-value="modelValue" class="dialog dialog--wide" @update:model-value="v => emit('update:modelValue', v)" @before-show="onShow">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">citizen CSM report &middot; office detail</div>
                        <div class="text-h5 text-uppercase">{{ FeedbackStore.details?.alias }}</div>
                        <div class="rc-hero-badges">
                            <span class="rc-hero-pill rc-hero-pill--on">{{ band.label }}</span>
                            <span class="rc-hero-pill">{{ FeedbackStore.details?.name }}<q-tooltip>{{ FeedbackStore.details?.name }}</q-tooltip></span>
                            <span class="rc-hero-pill" v-if="FeedbackStore.year">{{ FeedbackStore.year }}</span>
                            <span class="rc-hero-pill">{{ formatNumber(totalFeedback || 0) }} report{{ totalFeedback === 1 ? '' : 's' }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col rc-split">
                    <aside class="rc-side">
                        <template v-for="(n, i) in pages" :key="n.key">
                            <div v-if="i === 1" class="rc-side-title">CSM reports</div>
                            <button type="button" class="rc-side-item" :class="{ 'rc-side-item--on': page === n.key }" @click="page = n.key">
                                <q-icon :name="n.icon" />
                                <span>{{ n.label }}</span>
                                <b v-if="n.count">{{ n.count }}</b>
                            </button>
                        </template>
                    </aside>

                    <div class="rc-main">
                        <!-- ===== manage: file a report for this office, or go change the office ===== -->
                        <template v-if="page === 'manage' && canManage">
                            <div class="rc-page">
                                <div class="rc-pg-head">
                                    <ManageActions :title="`What would you like to do with ${FeedbackStore.details?.alias}?`" :actions="manageActions" @pick="onManage" />
                                </div>
                                <div class="rc-pg-side">
                                    <div class="rc-panel rc-panel--fill">
                                        <RecordTrail
                                            module="office" :entity-id="FeedbackStore.details?.id" :created-at="FeedbackStore.details?.createdAt || ''" :show-link="false"
                                            icon="bi-building" :headline="FeedbackStore.details?.alias || ''" :subline="FeedbackStore.details?.name || ''" :facts="trailFacts"
                                        />
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- ===== overview: how is this office doing? ===== -->
                        <template v-if="page === 'summary'">
                            <div v-if="!totalFeedback" class="rc-block">
                                <div class="rc-empty">
                                    <q-icon name="bi-clipboard-data" size="36px" />
                                    <div class="rc-empty-t">No CSM reports yet</div>
                                    <div class="rc-empty-d">Nobody has rated this office in {{ FeedbackStore.year }}.</div>
                                </div>
                            </div>
                            <div v-else class="rc-ov">
                                <!-- the numbers across the top -->
                                <div class="rc-block rc-ov-sum">
                                    <div class="rc-block-title">overview</div>
                                    <div class="rc-tiles">
                                        <div class="rc-tile"><span class="rc-ico rc-ico--blue"><q-icon name="bi-emoji-smile" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">satisfaction</span><span class="rc-tile-value" :style="{ color: band.color }">{{ formatPercentage(totalRating) }}</span><span class="rc-tile-sub">{{ band.label }}</span></span></div>
                                        <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-clipboard-data" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">reports</span><span class="rc-tile-value">{{ formatNumber(totalFeedback) }}</span><span class="rc-tile-sub">in {{ FeedbackStore.year }}</span></span></div>
                                        <div class="rc-tile"><span class="rc-ico rc-ico--purple"><q-icon name="bi-tv" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">how they answered</span><span class="rc-tile-value">{{ kioskCount }} / {{ manualCount }}</span><span class="rc-tile-sub">kiosk / by staff</span></span></div>
                                        <div class="rc-tile" :class="{ 'rc-tile--warn': poorCount > 0 }"><span class="rc-ico rc-ico--red"><q-icon name="bi-emoji-frown" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">rated poorly</span><span class="rc-tile-value">{{ poorCount }}</span><span class="rc-tile-sub">under 70%</span></span></div>
                                        <div class="rc-tile"><span class="rc-ico rc-ico--amber"><q-icon name="bi-graph-down-arrow" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">weakest area</span><span class="rc-tile-value">{{ weakestDim ? weakestDim.key.toUpperCase() : '—' }}</span><span class="rc-tile-sub">{{ weakestDim ? weakestDim.value + ' / 5' : 'not rated' }}</span></span></div>
                                        <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-graph-up-arrow" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">strongest area</span><span class="rc-tile-value">{{ strongestDim ? strongestDim.key.toUpperCase() : '—' }}</span><span class="rc-tile-sub">{{ strongestDim ? strongestDim.value + ' / 5' : 'not rated' }}</span></span></div>
                                    </div>
                                </div>

                                <!-- how the service scored, weakest first -->
                                <div class="rc-ov-det">
                                    <div class="rc-block">
                                        <div class="rc-block-title">how the service scored</div>
                                        <div class="text-caption text-grey q-mb-md">The weakest areas come first, so you know where to improve.</div>
                                        <div v-for="dim in sqdByNeed" :key="dim.key" class="ov-step">
                                            <div class="ov-step-top">
                                                <span class="ov-step-n">{{ dim.key.replace('sqd', '') }}</span>
                                                <span class="ov-step-label">{{ SQD_SHORT[dim.key] }}<q-tooltip>{{ dim.label }}</q-tooltip></span>
                                                <span class="ov-step-count">{{ dim.value ? dim.value : '—' }}</span>
                                                <span class="ov-step-pct">/ 5</span>
                                            </div>
                                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: ((dim.value || 0) / 5 * 100) + '%', background: sqdColor(dim.value) }"></div></div>
                                        </div>
                                    </div>
                                </div>

                                <div class="rc-ov-right">
                                    <!-- where it stands: the four rating bands as a short path -->
                                    <div class="rc-block rc-ov-stand">
                                        <div class="rc-block-title">where it stands</div>
                                        <div class="fi-steps">
                                            <div
                                                v-for="(st, i) in bandPath" :key="st.label" class="fi-step"
                                                :class="{ 'fi-step--done': i < bandIndex, 'fi-step--now': i === bandIndex && bandIndex > 0, 'fi-step--bad': i === bandIndex && bandIndex === 0 }"
                                            >
                                                <span class="fi-dot"><q-icon :name="i < bandIndex ? 'bi-check-lg' : (i === bandIndex ? (bandIndex === 0 ? 'bi-x-lg' : 'bi-star-fill') : 'bi-circle')" size="14px" /></span>
                                                <span class="fi-lbl">{{ st.label }}</span>
                                            </div>
                                        </div>
                                        <div class="text-caption text-grey q-mt-sm">{{ bandHint }}</div>
                                    </div>

                                    <div class="rc-ov-pair">
                                        <!-- the facts, plainly -->
                                        <div class="rc-block rc-ov-glance">
                                            <div class="rc-block-title">at a glance</div>
                                            <div class="rc-facts">
                                                <div class="rc-fact"><span class="rc-ico rc-ico--blue"><q-icon name="bi-building" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">office</span><span class="rc-fact-value">{{ FeedbackStore.details?.name }}</span></span></div>
                                                <div class="rc-fact"><span class="rc-ico rc-ico--teal"><q-icon name="bi-calendar-check" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">latest report</span><span class="rc-fact-value">{{ latestReport }}</span></span></div>
                                                <div class="rc-fact"><span class="rc-ico rc-ico--purple"><q-icon name="bi-journal-check" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">know the charter</span><span class="rc-fact-value">{{ charterRates.aware != null ? charterRates.aware + '%' : '—' }}</span></span></div>
                                                <div class="rc-fact"><span class="rc-ico rc-ico--amber"><q-icon name="bi-eye" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">can see the charter</span><span class="rc-fact-value">{{ charterRates.visible != null ? charterRates.visible + '%' : '—' }}</span></span></div>
                                            </div>
                                        </div>

                                        <!-- the spread, not just the average -->
                                        <div class="rc-block rc-ov-handled">
                                            <div class="rc-block-title">spread of ratings</div>
                                            <div v-for="b in bandRows" :key="b.label" class="ov-step">
                                                <div class="ov-step-top">
                                                    <span class="ov-dot" :style="{ background: b.color }"></span>
                                                    <span class="ov-step-label">{{ b.label }}</span>
                                                    <span class="ov-step-count">{{ b.count }}</span>
                                                    <span class="ov-step-pct">{{ b.pct }}%</span>
                                                </div>
                                                <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.color }"></div></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="rc-ov-pair">
                                        <div class="rc-block">
                                            <div class="rc-block-title">reports over the year</div>
                                            <apexchart type="area" height="190" :options="chartOptions1" :series="series1" />
                                        </div>
                                        <div class="rc-block">
                                            <div class="rc-block-title">satisfaction over the year</div>
                                            <apexchart type="line" height="190" :options="chartOptionsTrend" :series="seriesTrend" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- ===== who answered: the figures on the left, what stands out fixed on the right ===== -->
                        <div v-if="page === 'clients'" class="rc-page">
                            <div class="rc-pg-head">
                                <div class="wz-action" style="--wz-bg: #E4F6EA; --wz-fg: #1C8A3B;">
                                    <div class="wz-action-icon"><q-icon name="bi-people" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">{{ totalFeedback }} report{{ totalFeedback === 1 ? '' : 's' }} in {{ FeedbackStore.year }}</div>
                                        <div class="wz-action-title">Who answered</div>
                                        <div class="wz-action-hint">Who the clients were, and how they gave their feedback.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="rc-pg-main">
                                <div class="fo-grid">
                                    <div v-for="c in clientCards" :key="c.title" class="rc-block">
                                        <div class="rc-block-title">{{ c.title }}</div>
                                        <apexchart v-if="hasData(c.series.value)" type="donut" height="240" :options="c.options.value" :series="c.series.value" />
                                        <div v-else class="rc-empty rc-empty--sm"><q-icon name="bi-pie-chart" size="28px" /><div class="rc-empty-t">No data</div></div>
                                    </div>
                                </div>
                            </div>
                            <div class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="rc-cap">most of the clients</div>
                                            <div class="rc-facts">
                                                <div v-for="f in clientFacts" :key="f.label" class="rc-fact">
                                                    <span class="rc-ico" :class="'rc-ico--' + f.tone"><q-icon :name="f.icon" size="16px" /></span>
                                                    <span class="rc-fact-text"><span class="rc-fact-label">{{ f.label }}</span><span class="rc-fact-value">{{ f.value }}</span></span>
                                                </div>
                                            </div>
                                            <div class="rc-note">Based on the {{ totalFeedback }} report{{ totalFeedback === 1 ? '' : 's' }} of {{ FeedbackStore.year }}. Anyone who left a detail blank is not counted in it.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== citizen's charter ===== -->
                        <div v-if="page === 'charter'" class="rc-page">
                            <div class="rc-pg-head">
                                <div class="wz-action" style="--wz-bg: #FFF1D6; --wz-fg: #9A6B00;">
                                    <div class="wz-action-icon"><q-icon name="bi-journal-check" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">CC1 &middot; CC2 &middot; CC3</div>
                                        <div class="wz-action-title">The citizen's charter</div>
                                        <div class="wz-action-hint">Do clients know it, can they see it, and does it help them?</div>
                                    </div>
                                </div>
                            </div>
                            <div class="rc-pg-main">
                                <div class="fo-grid">
                                    <div v-for="c in charterCards" :key="c.key" class="rc-block">
                                        <div class="rc-block-title">{{ c.title }}<span class="rc-count">{{ c.key }}</span></div>
                                        <div class="text-caption text-grey q-mb-sm">{{ c.hint }}</div>
                                        <apexchart v-if="hasData(c.series.value)" type="donut" height="240" :options="c.options.value" :series="c.series.value" />
                                        <div v-else class="rc-empty rc-empty--sm"><q-icon name="bi-pie-chart" size="28px" /><div class="rc-empty-t">No data</div></div>
                                    </div>
                                </div>
                            </div>
                            <div class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="rc-cap">how the charter is doing</div>
                                            <div v-for="m in charterMeters" :key="m.label" class="ov-meter-row">
                                                <div class="ov-meter-top"><span>{{ m.label }}</span><b>{{ m.value != null ? m.value + '%' : '—' }}</b></div>
                                                <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (m.value || 0) + '%', background: m.color }"></div></div>
                                                <div class="ov-meter-sub">{{ m.sub }}</div>
                                            </div>
                                            <div class="rc-note">Visibility and usefulness are counted only among clients who answered them (not applicable is left out).</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== the reports: what they say on the left, the list itself (with its filters) fixed on the right ===== -->
                        <div v-if="page === 'reports'" class="rc-page">
                            <div class="rc-pg-head">
                                <div class="wz-action" style="--wz-bg: #E5EEFC; --wz-fg: #204888;">
                                    <div class="wz-action-icon"><q-icon name="bi-clipboard-data" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">{{ filteredRatings.length }} of {{ ratings.length }} in {{ FeedbackStore.year }}</div>
                                        <div class="wz-action-title">What the reports say</div>
                                        <div class="wz-action-hint">It follows the filters on the right. Pick a report in the list to open it.</div>
                                    </div>
                                </div>
                            </div>

                            <div class="rc-pg-main">
                                <div v-if="!filteredRatings.length" class="rc-empty">
                                    <q-icon name="bi-clipboard-data" size="36px" />
                                    <div class="rc-empty-t">{{ ratings.length ? 'No reports match' : 'No CSM reports yet' }}</div>
                                    <div class="rc-empty-d">{{ ratings.length ? 'Change the filters on the right to see more.' : 'Nobody has rated this office in ' + FeedbackStore.year + '.' }}</div>
                                </div>
                                <template v-else>
                                    <div class="rc-block">
                                        <div class="rc-block-title">the reports shown</div>
                                        <div class="rc-tiles">
                                            <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-clipboard-data" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">reports</span><span class="rc-tile-value">{{ filteredRatings.length }}</span><span class="rc-tile-sub">{{ filteredKiosk }} kiosk / {{ filteredRatings.length - filteredKiosk }} by staff</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--blue"><q-icon name="bi-emoji-smile" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">average</span><span class="rc-tile-value">{{ filteredAverage }}</span><span class="rc-tile-sub">satisfied</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-graph-up-arrow" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">best report</span><span class="rc-tile-value">{{ highest[0] ? highest[0].averageSqdPercentage.toFixed(1) + '%' : '—' }}</span><span class="rc-tile-sub">{{ highest[0] ? formatDate(highest[0].date) : '' }}</span></span></div>
                                            <div class="rc-tile" :class="{ 'rc-tile--warn': lowest[0] && lowest[0].averageSqdPercentage < 70 }"><span class="rc-ico rc-ico--red"><q-icon name="bi-graph-down-arrow" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">lowest report</span><span class="rc-tile-value">{{ lowest[0] ? lowest[0].averageSqdPercentage.toFixed(1) + '%' : '—' }}</span><span class="rc-tile-sub">{{ lowest[0] ? formatDate(lowest[0].date) : '' }}</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--purple"><q-icon name="bi-calendar-check" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">latest</span><span class="rc-tile-value">{{ filteredLatest }}</span><span class="rc-tile-sub">most recent report</span></span></div>
                                        </div>
                                    </div>

                                    <div class="fo-grid">
                                        <div class="rc-block">
                                            <div class="rc-block-title">reports per month</div>
                                            <apexchart type="bar" height="200" :options="monthlyCountOptions" :series="monthlyCountSeries" />
                                        </div>
                                        <div class="rc-block">
                                            <div class="rc-block-title">average per month</div>
                                            <apexchart type="line" height="200" :options="monthlyAvgOptions" :series="monthlyAvgSeries" />
                                        </div>
                                    </div>

                                    <div class="fo-grid">
                                        <div class="rc-block">
                                            <div class="rc-block-title">how these reports scored the service</div>
                                            <div v-for="d in filteredSqd" :key="d.key" class="ov-step">
                                                <div class="ov-step-top">
                                                    <span class="ov-step-n">{{ d.key.replace('sqd', '') }}</span>
                                                    <span class="ov-step-label">{{ SQD_SHORT[d.key] }}</span>
                                                    <span class="ov-step-count">{{ d.avg ? d.avg : '—' }}</span>
                                                    <span class="ov-step-pct">/ 5</span>
                                                </div>
                                                <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: ((d.avg || 0) / 5 * 100) + '%', background: sqdColor(d.avg) }"></div></div>
                                            </div>
                                        </div>
                                        <div class="rc-block">
                                            <div class="rc-block-title">spread of these reports</div>
                                            <div v-for="b in filteredBands" :key="b.label" class="ov-step">
                                                <div class="ov-step-top">
                                                    <span class="ov-dot" :style="{ background: b.color }"></span>
                                                    <span class="ov-step-label">{{ b.label }}</span>
                                                    <span class="ov-step-count">{{ b.count }}</span>
                                                    <span class="ov-step-pct">{{ b.pct }}%</span>
                                                </div>
                                                <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.color }"></div></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="fo-grid">
                                        <div v-for="g in worth" :key="g.title" class="rc-block">
                                            <div class="rc-block-title">{{ g.title }}</div>
                                            <div class="fo-mini-list">
                                                <div v-for="dt in g.rows" :key="dt.id" class="fp-office-rating-row" :class="ratingSeverity(dt)" @click="generatePDF(dt.id)">
                                                    <q-icon :name="dt.entryFrom === 'manual' ? 'bi-file-earmark' : 'bi-tv'" :color="dt.entryFrom === 'manual' ? 'primary' : 'positive'" size="xs" class="q-mr-sm" />
                                                    <div class="col">
                                                        <div class="text-caption text-weight-bold text-uppercase">{{ formatDate(dt.date) }}</div>
                                                        <div class="text-caption text-grey">{{ dt.entryFrom === 'manual' ? 'entered by staff' : formatTime(dt.date) + ' · kiosk' }}</div>
                                                    </div>
                                                    <ImpressionBadge v-if="dt.sentiment" :value="dt.sentiment" :why="dt.sentimentReason || ''" class="q-mr-xs" />
                                                    <span class="fp-office-pill" :style="{ background: ratingPillColor(dt).bg, color: ratingPillColor(dt).text }">{{ formatPercentage(dt.averageSqdPercentage) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>

                            <div class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="fo-rail-filters">
                                                <div class="rc-cap">how it was answered</div>
                                                <div class="row q-gutter-xs q-mb-md">
                                                    <q-btn v-for="o in ENTRY_FILTERS" :key="o.key" no-caps unelevated rounded size="sm" :label="o.label + ' · ' + entryCount(o.key)" class="fo-chip" :class="entryFilter === o.key ? 'fo-chip--on' : ''" @click="entryFilter = o.key" />
                                                </div>
                                                <div class="rc-cap">how it was rated</div>
                                                <div class="row q-gutter-xs">
                                                    <q-btn v-for="o in BAND_FILTERS" :key="o.key" no-caps unelevated rounded size="sm" :label="o.label + ' · ' + bandCount(o.key)" class="fo-chip" :class="bandFilter === o.key ? 'fo-chip--on' : ''" @click="bandFilter = o.key" />
                                                </div>
                                                <div class="row items-center justify-between q-mt-md">
                                                    <div class="rc-cap" style="margin: 0;">{{ filteredRatings.length }} of {{ ratings.length }} reports</div>
                                                    <q-btn flat no-caps rounded dense size="sm" color="primary" label="clear filters" :disable="entryFilter === 'all' && bandFilter === 'all'" @click="clearFilters" />
                                                </div>
                                            </div>
                                            <div class="fo-rail-list">
                                                <div
                                                    v-for="dt in filteredRatings" :key="dt.id"
                                                    class="fp-office-rating-row" :class="ratingSeverity(dt)"
                                                    @click="generatePDF(dt.id)"
                                                >
                                                    <q-icon :name="dt.entryFrom === 'manual' ? 'bi-file-earmark' : 'bi-tv'" :color="dt.entryFrom === 'manual' ? 'primary' : 'positive'" size="xs" class="q-mr-sm" />
                                                    <div class="col">
                                                        <div class="text-caption text-weight-bold text-uppercase">{{ formatDate(dt.date) }}</div>
                                                        <div class="text-caption text-grey">{{ dt.entryFrom === 'manual' ? 'entered by staff' : formatTime(dt.date) + ' · kiosk' }}</div>
                                                    </div>
                                                    <ImpressionBadge v-if="dt.sentiment" :value="dt.sentiment" :why="dt.sentimentReason || ''" class="q-mr-xs" />
                                                    <span class="fp-office-pill" :style="{ background: ratingPillColor(dt).bg, color: ratingPillColor(dt).text }">
                                                        {{ formatPercentage(dt.averageSqdPercentage) }}
                                                    </span>
                                                    <q-inner-loading :showing="dt.id == id ? rateLoading : null">
                                                        <q-spinner-ios size="1.2em" />
                                                    </q-inner-loading>
                                                </div>
                                                <EmptyState
                                                    v-if="!filteredRatings.length" rail icon="bi-clipboard-data"
                                                    :title="ratings.length ? 'No reports match' : 'No reports yet'"
                                                    :hint="ratings.length ? 'Change the filters above.' : 'Nobody has rated this office yet.'"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <PdfPreviewDialog v-model="ratingDialog" :src="file" caption="citizen CSM report" title="CSM report" />
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import ManageActions from 'src/components/ManageActions.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import { useAuthStore } from 'src/stores/auth-store';
import ImpressionBadge from 'src/components/ImpressionBadge.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import Apexchart from "vue3-apexcharts";
import PdfPreviewDialog from './PdfPreviewDialog.vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';

import { useFeedbackStore } from '../stores/feedback-store';

const FeedbackStore = useFeedbackStore();

// Filing a report for the office and changing the office itself are for a supervisor.
const router = useRouter();
const canManage = computed(() => ['super', 'admin'].includes(useAuthStore().user?.role));
const goToOfficePreference = () => { emit('update:modelValue', false); router.push('/preference/office'); };
const manageActions = computed(() => [
    {
        key: 'file', label: 'File a CSM report', icon: 'bi-plus-circle', bg: '#E4F6EA', color: '#1C8A3B',
        hint: `Record what a client said about ${FeedbackStore.details?.alias || 'this office'}, as entered by staff. The office is already chosen.`,
    },
    {
        key: 'office', label: 'Change the office', icon: 'bi-building-gear', bg: '#E5EEFC', color: '#204888',
        hint: 'Open it in Office preference: its name, email and mandate, or switch it on or off.',
    },
]);
// the details in the panel next to Manage
const trailFacts = computed(() => [
    { label: 'Reports', value: String(totalFeedback.value || 0), icon: 'bi-clipboard-data' },
    { label: 'Satisfaction', value: band.value?.label || '—', icon: 'bi-emoji-smile' },
    { label: 'Poor reports', value: String(poorCount.value || 0), icon: 'bi-emoji-frown', dim: !poorCount.value },
    { label: 'Year', value: String(FeedbackStore.year || ''), icon: 'bi-calendar3' },
]);
const onManage = (key) => { if (key === 'file') emit('file', FeedbackStore.details?.id); else if (key === 'office') goToOfficePreference(); };

// The pages of this dialog (shown as pills in the header).
const page = ref('summary');
const pages = computed(() => [
    { key: 'summary', icon: 'bi-grid-1x2', label: 'overview' },
    { key: 'clients', icon: 'bi-people', label: 'clients' },
    { key: 'charter', icon: 'bi-journal-check', label: 'charter' },
    { key: 'reports', icon: 'bi-clipboard-data', label: 'reports', count: ratings.value.length },
    ...(canManage.value ? [{ key: 'manage', icon: 'bi-toggles', label: 'manage' }] : []),
]);
const onShow = () => {
    page.value = 'summary';
    entryFilter.value = 'all';
    bandFilter.value = 'all';
    getAllRatings();
};

const props = defineProps({
    modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'file']);

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
    colors: ['#204888'],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { rotate: 0, style: { fontSize: '10px' } } },
    yaxis: { forceNiceScale: true, labels: { formatter: (v) => Math.round(v) } },
});

// ---- the overview's rows and path
const SQD_SHORT = {
    sqd0: 'Satisfied with the service', sqd1: 'Reasonable time', sqd2: 'Followed the steps and requirements',
    sqd3: 'Easy, simple steps', sqd4: 'Easy to find information', sqd5: 'Reasonable fees',
    sqd6: 'Fair to everyone', sqd7: 'Courteous, helpful staff', sqd8: 'Got what was needed',
};
const sqdColor = (v) => (!v ? '#B8C2D4' : v >= 4.25 ? '#21BA45' : v >= 3.5 ? '#68AFF1' : v >= 3 ? '#FFC900' : '#C10015');
const BAND_COLORS = { 'Excellent': '#1C8A3B', 'Good': '#4CAF7D', 'Fair': '#FFC900', 'Needs improvement': '#C10015' };
const bandRows = computed(() => {
    const labels = ratingDistributionOptions.value.labels || [];
    const counts = ratingDistributionSeries.value.map(n => Number(n) || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    return ['Excellent', 'Good', 'Fair', 'Needs improvement'].map(label => {
        const i = labels.indexOf(label);
        const count = i >= 0 ? counts[i] : 0;
        return { label, count, pct: total ? Math.round(count / total * 100) : 0, color: BAND_COLORS[label] };
    });
});
const bandPath = [{ label: 'Needs improvement', min: 0 }, { label: 'Fair', min: 70 }, { label: 'Good', min: 85 }, { label: 'Excellent', min: 95 }];
const bandIndex = computed(() => {
    const v = Number(totalRating.value) || 0;
    return bandPath.reduce((idx, b, i) => (v >= b.min ? i : idx), 0);
});
const bandHint = computed(() => {
    const v = Number(totalRating.value) || 0;
    const next = bandPath[bandIndex.value + 1];
    if (!next) return `${formatPercentage(v)} satisfied: the top band.`;
    return `${formatPercentage(v)} satisfied, ${(next.min - v).toFixed(1)} points short of ${next.label}.`;
});
const latestReport = computed(() => {
    const dates = ratings.value.map(r => r.date).filter(Boolean).sort();
    return dates.length ? moment(dates[dates.length - 1]).format('MMM DD, YYYY') : '—';
});

// ---- the charts as cards, and what stands out in them
const hasData = (series) => (series || []).some(n => Number(n) > 0);
const clientCards = computed(() => [
    { title: 'type of client', series: series2, options: chartOptions2 },
    { title: 'sex', series: series3, options: chartOptions3 },
    { title: 'age', series: series4, options: chartOptions4 },
    { title: 'how they answered', series: series5, options: chartOptions5 },
].map(c => ({ ...c, series: { value: c.series.value }, options: { value: c.options.value } })));
const charterCards = computed(() => [
    { key: 'CC1', title: 'do they know it', hint: 'awareness', series: series6, options: chartOptions6 },
    { key: 'CC2', title: 'can they see it', hint: 'visibility', series: series7, options: chartOptions7 },
    { key: 'CC3', title: 'does it help', hint: 'usefulness', series: series8, options: chartOptions8 },
].map(c => ({ ...c, series: { value: c.series.value }, options: { value: c.options.value } })));

const topOf = (series, options) => {
    const counts = (series || []).map(n => Number(n) || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const i = counts.indexOf(Math.max(...counts));
    return { label: options.labels[i], pct: Math.round(counts[i] / total * 100) };
};
const clientFacts = computed(() => {
    const rows = [
        { label: 'type of client', icon: 'bi-person-badge', tone: 'blue', top: topOf(series2.value, chartOptions2.value) },
        { label: 'sex', icon: 'bi-gender-ambiguous', tone: 'purple', top: topOf(series3.value, chartOptions3.value) },
        { label: 'age', icon: 'bi-hourglass-split', tone: 'amber', top: topOf(series4.value, chartOptions4.value) },
        { label: 'how they answered', icon: 'bi-tv', tone: 'teal', top: topOf(series5.value, chartOptions5.value) },
    ];
    return rows.map(r => ({ ...r, value: r.top ? `${r.top.label} · ${r.top.pct}%` : 'No data' }));
});

// charter rates: awareness over everyone; visibility and usefulness over those who answered them (N/A left out)
const rateOf = (series, options, test, skip) => {
    let part = 0, all = 0;
    (series || []).forEach((n, i) => {
        const label = options.labels[i] || '';
        if (skip && skip(label)) return;
        all += Number(n) || 0;
        if (test(label)) part += Number(n) || 0;
    });
    return all ? Math.round(part / all * 100) : null;
};
const charterRates = computed(() => ({
    aware: rateOf(series6.value, chartOptions6.value, l => !/^I do not know what a CC is and/i.test(l)),
    visible: rateOf(series7.value, chartOptions7.value, l => /easy to see/i.test(l), l => /^N\/A$|not applicable/i.test(l)),
    helped: rateOf(series8.value, chartOptions8.value, l => /^Helped|^Somewhat helped/i.test(l), l => /^N\/A$|not applicable/i.test(l)),
}));
const charterMeters = computed(() => [
    { label: 'know the charter', value: charterRates.value.aware, color: '#204888', sub: 'know what it is, or saw it in the office' },
    { label: 'could see it', value: charterRates.value.visible, color: '#68AFF1', sub: 'easy or somewhat easy to see' },
    { label: 'found it useful', value: charterRates.value.helped, color: '#FFC900', sub: 'helped very much or somewhat' },
]);

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
    markers: { size: 4 },
    colors: ['#FFC900'],
    grid: { strokeDashArray: 4 },
    xaxis: {
        categories: [],
        labels: { rotate: 0, style: { fontSize: '10px' } }
    },
    yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
            formatter: (v) => Math.round(v) + '%'
        }
    }
});

// Shared donut/pie look — same recipe as FeedbackPage.vue's system-wide mix charts (bottom
// legend, value labels on, the shared app palette instead of ApexCharts' default theme colors).
const DONUT_COLORS = ['#204888', '#FFC900', '#68AFF1', '#B8C2D4', '#3E6BB5', '#9A6B00'];
const pieOptions = () => ({
    chart: { type: 'donut' },
    labels: [],
    colors: DONUT_COLORS,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Reports', fontSize: '12px' } } } } },
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
// The same four bands the dashboards use (under 70 / 70-84 / 85-94 / 95+), in words.
const band = computed(() => {
    const v = Number(totalRating.value) || 0;
    if (!totalFeedback.value) return { label: 'No reports yet', bg: '#F6F9FC', color: '#8493AC' };
    if (v >= 95) return { label: 'Excellent', bg: '#E4F5E9', color: '#1C8A3B' };
    if (v >= 85) return { label: 'Good', bg: '#E4F5E9', color: '#1C8A3B' };
    if (v >= 70) return { label: 'Fair', bg: '#FBF1D9', color: '#9A6B00' };
    return { label: 'Needs improvement', bg: '#FBE6E8', color: '#B3121F' };
});
// service-quality dimensions, weakest first (an unrated one goes last)
const sqdByNeed = computed(() => [...sqdDimensions.value].sort((x, y) => (x.value || 9) - (y.value || 9)));

// the weakest and the strongest rated service areas (an unrated one does not count)
const ratedDims = computed(() => sqdDimensions.value.filter(d => d.value > 0));
const weakestDim = computed(() => [...ratedDims.value].sort((x, y) => x.value - y.value)[0] || null);
const strongestDim = computed(() => [...ratedDims.value].sort((x, y) => y.value - x.value)[0] || null);
const poorCount = computed(() => ratings.value.filter(r => r.averageSqdPercentage != null && r.averageSqdPercentage < 70).length);

// ---- the reports page: filters that sit on the right
const ENTRY_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'kiosk', label: 'Kiosk' },
    { key: 'manual', label: 'By staff' },
];
const BAND_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'excellent', label: 'Excellent' },
    { key: 'good', label: 'Good' },
    { key: 'fair', label: 'Fair' },
    { key: 'poor', label: 'Needs improvement' },
];
const entryFilter = ref('all');
const bandFilter = ref('all');
const bandOf = (r) => {
    const v = r.averageSqdPercentage;
    if (v == null) return 'none';
    return v >= 95 ? 'excellent' : v >= 85 ? 'good' : v >= 70 ? 'fair' : 'poor';
};
const entryOf = (r) => (r.entryFrom === 'manual' ? 'manual' : 'kiosk');
const entryCount = (key) => ratings.value.filter(r => (key === 'all' || entryOf(r) === key) && (bandFilter.value === 'all' || bandOf(r) === bandFilter.value)).length;
const bandCount = (key) => ratings.value.filter(r => (key === 'all' || bandOf(r) === key) && (entryFilter.value === 'all' || entryOf(r) === entryFilter.value)).length;
const filteredRatings = computed(() => ratings.value.filter(r =>
    (entryFilter.value === 'all' || entryOf(r) === entryFilter.value) && (bandFilter.value === 'all' || bandOf(r) === bandFilter.value)
));
const filteredAverage = computed(() => {
    const vals = filteredRatings.value.map(r => r.averageSqdPercentage).filter(v => v != null);
    return vals.length ? (vals.reduce((n, v) => n + v, 0) / vals.length).toFixed(1) + '%' : '—';
});
const filteredLatest = computed(() => {
    const dates = filteredRatings.value.map(r => r.date).filter(Boolean).sort();
    return dates.length ? moment(dates[dates.length - 1]).format('MMM DD, YYYY') : '—';
});
// ---- what the shown reports say (everything follows the filters)
const filteredKiosk = computed(() => filteredRatings.value.filter(r => entryOf(r) === 'kiosk').length);
const byScore = computed(() => [...filteredRatings.value].filter(r => r.averageSqdPercentage != null).sort((x, y) => x.averageSqdPercentage - y.averageSqdPercentage));
const lowest = computed(() => byScore.value.slice(0, 3));
// the best ones leave out any report already listed as lowest (with only a few reports the two would be the same)
const highest = computed(() => [...byScore.value].reverse().slice(0, 3));
const highestOthers = computed(() => highest.value.filter(r => !lowest.value.some(l => l.id === r.id)));
const worth = computed(() => [
    { title: 'lowest rated: worth a look', rows: lowest.value },
    { title: 'highest rated', rows: highestOthers.value },
].filter(g => g.rows.length));
const filteredSqd = computed(() => Object.keys(SQD_SHORT).map(key => {
    const vals = filteredRatings.value.map(r => Number(r[key])).filter(v => v > 0);
    return { key, avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null };
}).sort((x, y) => (x.avg ?? 9) - (y.avg ?? 9)));
const filteredBands = computed(() => {
    const total = filteredRatings.value.length;
    return [['excellent', 'Excellent'], ['good', 'Good'], ['fair', 'Fair'], ['poor', 'Needs improvement']].map(([key, label]) => {
        const count = filteredRatings.value.filter(r => bandOf(r) === key).length;
        return { label, count, pct: total ? Math.round(count / total * 100) : 0, color: BAND_COLORS[label] };
    });
});
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthly = computed(() => {
    const rows = MONTHS.map(label => ({ label, count: 0, sum: 0 }));
    filteredRatings.value.forEach(r => {
        const m = moment(r.date).month();
        rows[m].count++;
        rows[m].sum += Number(r.averageSqdPercentage) || 0;
    });
    return rows;
});
const monthlyCountSeries = computed(() => [{ name: 'Reports', data: monthly.value.map(m => m.count) }]);
const monthlyCountOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    colors: ['#204888'],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: MONTHS, labels: { rotate: 0, style: { fontSize: '10px' } } },
    yaxis: { forceNiceScale: true, labels: { formatter: (v) => Math.round(v) } },
};
const monthlyWithData = computed(() => monthly.value.filter(m => m.count));
const monthlyAvgSeries = computed(() => [{ name: 'Average', data: monthlyWithData.value.map(m => +(m.sum / m.count).toFixed(1)) }]);
const monthlyAvgOptions = computed(() => ({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 4 },
    dataLabels: { enabled: false },
    colors: ['#FFC900'],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: monthlyWithData.value.map(m => m.label), labels: { rotate: 0, style: { fontSize: '10px' } } },
    yaxis: { min: 0, max: 100, tickAmount: 5, labels: { formatter: (v) => Math.round(v) + '%' } },
}));

const clearFilters = () => {
    entryFilter.value = 'all';
    bandFilter.value = 'all';
};

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
        const FrequencyCategories = frequenciesData.map(item => item.label.slice(0, 3));

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

        // only the months that have reports: a month with none has no average, and would leave a gap in the line
        const trendWithData = trendData.filter(item => item.avgPercentage != null);
        seriesTrend.value = [{
            name: 'Avg. satisfaction',
            data: trendWithData.map(item => item.avgPercentage)
        }];

        chartOptionsTrend.value = {
            ...chartOptionsTrend.value,
            xaxis: {
                ...chartOptionsTrend.value.xaxis,
                categories: trendWithData.map(item => item.label.slice(0, 3))
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

        // The detail answer rounds each average to a whole number and counts "N/A" as 0; the analytics answer for this
        // office gives it to two decimals over the clients who actually rated the area.
        try {
            const exact = await api.get('/feedback/analytics', { params: { period: 'year', year: FeedbackStore.year, officeId: FeedbackStore.details.id } });
            (exact.data?.data?.sqdAverages || []).forEach((row, i) => { if (sqdValues[i]) sqdValues[i].value = row.avg || 0; });
        } catch (error) {
            console.error('Error fetching exact service averages:', error);
        }

        seriesSqdBar.value = [{
            name: 'Avg.',
            data: [sqd0.value, sqd1.value, sqd2.value, sqd3.value, sqd4.value, sqd5.value, sqd6.value, sqd7.value, sqd8.value]
        }];

    } catch (error) {
        console.error("Error fetching ratings or frequencies:", error);
    }
}

// while this dialog is open, a new report for this office shows in it too
useLiveRefresh(['feedback'], () => (props.modelValue && FeedbackStore.details?.id ? getAllRatings() : null));

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

</script>

<style scoped>
.rc-note { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: #F6F9FC; font-size: 12px; line-height: 1.5; color: #6B7A99; }
.fo-chip { background: #FFFFFF; color: #4C5C79; border: 1px solid #DCE4F0; min-height: 26px; padding: 0 12px; font-size: 12px; }
.fo-chip--on { background: var(--q-primary); color: #FFFFFF; border-color: var(--q-primary); }
.fo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0 14px; }
.fo-dim { padding: 8px 0; border-bottom: 1px solid #EEF2F8; }
.fo-dim:last-child { border-bottom: 0; }
.fo-dim-score { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; color: #16233A; }
/* the dialog body already scrolls, so the list takes the room it needs; on a wide dialog the
   reports sit two to a row instead of one long, thin column */
.fo-rail-filters { padding-bottom: 14px; }
.fo-rail-list, .fo-mini-list { border: 1px solid #E6ECF5; border-radius: 12px; overflow: hidden; background: #fff; }
/* only the list scrolls: the filters above it stay where they are */
.fo-rail-list { max-height: calc(88vh - 400px); min-height: 160px; overflow-y: auto; }
.fo-rail-list .fp-office-rating-row:last-child, .fo-mini-list .fp-office-rating-row:last-child { border-bottom: 0; }
.fp-office-rating-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    column-gap: 1px;
    background: rgba(0, 0, 0, 0.06);
    border: 1px solid #E6ECF5;
    border-radius: 14px;
    overflow: hidden;
}
.fp-office-rating-list > .fp-office-rating-row {
    background: #fff;
}
.fp-office-rating-list > .fp-office-rating-row:hover {
    background: #F6F9FC;
}
.fp-office-rating-list > .fp-office-list-empty {
    grid-column: 1 / -1;
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
@media (max-width: 900px) {
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
