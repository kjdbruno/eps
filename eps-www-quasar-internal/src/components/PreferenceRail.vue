<template>
    <div>
        <q-card flat class="rc-rail-card">
            <div class="rc-rail-head">
                <div class="row items-center justify-between no-wrap q-mb-sm">
                    <div class="row items-baseline q-gutter-xs">
                        <div class="text-h6 text-capitalize">{{ title }}</div>
                        <div class="text-caption text-grey">{{ shown }} of {{ total }}</div>
                    </div>
                    <q-btn v-if="showAdd" unelevated rounded no-caps size="sm" color="primary" :label="addLabel" @click="emit('add')" />
                </div>
                <q-input
                    :model-value="search" outlined dense clearable :placeholder="placeholder"
                    class="rc-search q-mb-sm" @update:model-value="v => emit('update:search', v || '')"
                >
                    <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                </q-input>
                <template v-if="filters.length">
                    <div class="text-caption text-uppercase text-grey q-mb-xs">{{ filtersLabel }}</div>
                    <div class="row q-gutter-xs">
                        <q-btn
                            v-for="f in filters" :key="f.value"
                            no-caps unelevated rounded size="sm" :label="f.label"
                            class="rc-chipbtn" :class="{ 'rc-chipbtn--active': filter === f.value }"
                            @click="emit('update:filter', f.value)"
                        />
                    </div>
                </template>
                <!-- a second row of chips for a second way to narrow the list (e.g. the year) -->
                <template v-if="filters2.length">
                    <div class="text-caption text-uppercase text-grey q-mt-sm q-mb-xs">{{ filters2Label }}</div>
                    <div class="row q-gutter-xs">
                        <q-btn
                            v-for="f in filters2" :key="f.value"
                            no-caps unelevated rounded size="sm" :label="f.label"
                            class="rc-chipbtn" :class="{ 'rc-chipbtn--active': filter2 === f.value }"
                            @click="emit('update:filter2', f.value)"
                        />
                    </div>
                </template>
            </div>
            <q-separator />

            <div class="rc-rail-body">
                <q-inner-loading :showing="loading" color="primary" />
                <slot />
                <EmptyState v-if="!loading && !shown" rail :icon="icon" :title="emptyTitle || `No ${title} found`" hint="Try another search or filter." />
            </div>
        </q-card>
    </div>
</template>

<script setup>
import EmptyState from 'src/components/EmptyState.vue';
// The right-hand list of a preference page (same shape as the revapp preference pages): a head
// with the title, count and Add button, a search box and status chips, then the rows (default
// slot) — each row is an `.rc-item`. Owns no data; the page passes in what to show.
defineProps({
    title: { type: String, default: '' },
    shown: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    search: { type: String, default: '' },
    placeholder: { type: String, default: 'Search...' },
    // [{ value, label }]; empty = no status chips
    filters: { type: Array, default: () => [] },
    filter: { type: String, default: 'all' },
    filtersLabel: { type: String, default: 'status' },
    filters2: { type: Array, default: () => [] },
    filter2: { type: String, default: 'all' },
    filters2Label: { type: String, default: 'year' },
    loading: { type: Boolean, default: false },
    icon: { type: String, default: 'bi-inbox' },
    // the button at the top of the rail (Add by default; the Client accounts page uses Send)
    addLabel: { type: String, default: 'Add' },
    // false for a list with nothing to add (the people on the Messages page)
    showAdd: { type: Boolean, default: true },
    // the word used when the list is empty ("No people found"), when the title does not read well in it
    emptyTitle: { type: String, default: '' },
});

const emit = defineEmits(['add', 'update:search', 'update:filter', 'update:filter2']);
</script>
