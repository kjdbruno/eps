<template>
    <div class="hp-pref-shell">
        <div class="row items-center justify-between q-mb-sm">
            <div class="row items-baseline q-gutter-xs">
                <div class="text-h6 text-capitalize">holidays</div>
                <div class="text-caption text-grey">{{ filteredRows.length }} of {{ rows.length }}</div>
            </div>
            <q-btn unelevated rounded no-caps size="sm" color="primary" label="add" @click="openCreate">
                <q-tooltip>Add a new holiday</q-tooltip>
            </q-btn>
        </div>
        <q-input outlined dense v-model="search" placeholder="Search holiday name..." class="q-mb-md">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>

        <!-- "list scroll only" — header/search above stay put; this card scrolls internally once
             the list outgrows it, rather than the whole page growing. -->
        <q-card class="no-shadow custom-border radius-sm hp-pref-list-card">
            <q-inner-loading :showing="PreferenceStore.isLoadingTable" color="primary" />
            <q-list separator v-if="filteredRows.length">
                <q-item v-for="h in filteredRows" :key="h.id" class="q-pa-md">
                    <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" icon="bi-calendar-event" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label class="text-weight-bold text-uppercase">{{ h.name }}</q-item-label>
                        <q-item-label caption>
                            {{ formatDate(h.date) }} &middot; {{ moment(h.date).format('dddd') }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side top class="hp-pref-status-section">
                        <div class="row items-center no-wrap">
                            <q-badge :color="h.isActive ? 'positive' : 'negative'" rounded class="q-mr-xs" />
                            <span class="text-caption text-grey">{{ h.isActive ? 'active' : 'inactive' }}</span>
                        </div>
                    </q-item-section>
                    <q-item-section side>
                        <div class="q-gutter-xs">
                            <q-btn v-if="h.isActive" rounded unelevated color="grey-5" size="xs" no-caps label="edit" @click="() => { PreferenceStore.dialog = true; PreferenceStore.isEdit = true; PreferenceStore.holiday = h; }" />
                            <q-btn v-if="h.isActive" rounded unelevated color="grey-5" size="xs" no-caps label="disable" @click="disableHoliday(h)" :loading="h.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                            <q-btn v-else rounded unelevated color="grey-5" size="xs" no-caps label="enable" @click="enableHoliday(h)" :loading="h.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
            <div class="q-pa-xl text-center text-grey" v-else>
                <q-icon name="bi-calendar-event" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no holidays found</div>
            </div>
        </q-card>
        <q-dialog v-model="PreferenceStore.dialog" full-height persistent @before-show="openDialog(PreferenceStore.holiday)">
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">{{ PreferenceStore.isEdit ? 'Edit Holiday' : 'New Holiday' }}</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col hp-pref-create-shell">
                        <div class="hp-pref-create-body">
                            <div class="q-gutter-xs">
                                <q-input outlined v-model="form.date" label="Date" mask="####-##-##" hint="YYYY-MM-DD" :error="errors.date.type" :error-message="errors.date.message">
                                    <template v-slot:append>
                                        <q-icon name="event" class="cursor-pointer">
                                            <q-popup-proxy cover transition-show="scale" transition-hide="scale" class="no-shadow radius-sm custom-border">
                                                <q-date v-model="form.date" mask="YYYY-MM-DD" class="">
                                                    <div class="row items-center justify-end">
                                                        <q-btn v-close-popup label="close" color="primary" flat />
                                                    </div>
                                                </q-date>
                                            </q-popup-proxy>
                                        </q-icon>
                                    </template>
                                </q-input>
                                <q-input outlined v-model="form.name" label="Holiday Name" :error="errors.name.type" :error-message="errors.name.message" />
                            </div>
                        </div>
                        <div class="hp-pref-create-footer row justify-start">
                            <q-btn no-caps rounded unelevated color="primary" label="submit" :loading="PreferenceStore.isLoading" @click="save()" />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';

const PreferenceStore = usePreferenceStore();

const rows = ref([]);

// Self-contained search — no pagination, the whole (already small) holiday list renders at once,
// same convention as the Complaint/Discussion/Poll rail lists elsewhere in this app.
const search = ref('');
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return rows.value;
    return rows.value.filter(h => (h.name || '').toLowerCase().includes(term));
});

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const id = ref(null);
const form = reactive({
    date: '',
    name: '',
});

const errors = reactive({
    date: { type: false, message: '' },
    name: { type: false, message: '' },
});

const formatDate = (date) => moment(date).format('MMM DD, YYYY');

// Validate the form inputs
const validate = () => {
    errors.date.type = !form.date || !moment(form.date, 'YYYY-MM-DD', true).isValid();
    errors.name.type = !form.name;

    errors.date.message = !form.date ? 'Date is required.' : (errors.date.type ? 'Date must be YYYY-MM-DD.' : '');
    errors.name.message = errors.name.type ? 'Name is required.' : '';

    return !errors.date.type && !errors.name.type;
};

const fetchData = async () => {
    PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/holiday');
        rows.value = response.data;
        PreferenceStore.isLoadingTable = false;
    } catch (error) {
        console.error('Error fetching data:', error);
        PreferenceStore.isLoadingTable = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while fetching holidays.'}<div>
            `
        });
    }
};

onMounted(() => {
    fetchData();
});

const openDialog = (holiday) => {
    if (PreferenceStore.isEdit && holiday) {
        id.value = holiday.id;
        form.date = holiday.date || '';
        form.name = holiday.name || '';
    } else {
        id.value = null;
        form.date = '';
        form.name = '';
    }
    errors.date.type = false;
    errors.name.type = false;
};

const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/holiday/${id.value}/update`, form)
            : await api.post('/preference/holiday', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        PreferenceStore.isLoading = false;
        if (id.value) {
            updateRows(id.value, response.data.holiday);
        } else {
            rows.value.unshift(response.data.holiday);
        }
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error saving data:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while saving the holiday.'}<div>
            `
        });
    }
};

const disableHoliday = async (holiday) => {
    id.value = holiday.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/holiday/${holiday.id}/disable`);
        updateRows(holiday.id, response.data.holiday);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling holiday:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while disabling the holiday.'}<div>
            `
        });
    }
};

const enableHoliday = async (holiday) => {
    id.value = holiday.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/holiday/${holiday.id}/enable`);
        updateRows(holiday.id, response.data.holiday);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling holiday:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while enabling the holiday.'}<div>
            `
        });
    }
};

const updateRows = (id, data) => {
    const index = rows.value.findIndex(holiday => holiday.id === id);
    if (index !== -1) {
        Object.assign(rows.value[index], data)
    }
};
</script>

<style scoped>
.hp-pref-list-card {
    max-height: calc(100vh - 220px);
    min-height: 200px;
    overflow-y: auto;
}
.hp-pref-status-section {
    align-items: flex-end;
    min-width: 90px;
}
.hp-pref-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.hp-pref-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.hp-pref-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
</style>
