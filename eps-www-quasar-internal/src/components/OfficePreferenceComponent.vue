<template>
    <div class="op-shell">
        <div class="row items-center justify-between q-mb-sm">
            <div class="row items-baseline q-gutter-xs">
                <div class="text-h6 text-capitalize">offices</div>
                <div class="text-caption text-grey">{{ filteredRows.length }} of {{ rows.length }}</div>
            </div>
            <q-btn unelevated rounded no-caps size="sm" color="primary" label="add" @click="openCreate">
                <q-tooltip>Add a new office</q-tooltip>
            </q-btn>
        </div>
        <q-input outlined dense v-model="search" placeholder="Search name, alias, or email..." class="q-mb-md">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>

        <!-- "list scroll only" — header/search above stay put; this card scrolls internally once
             the list outgrows it, rather than the whole page growing. -->
        <q-card class="no-shadow custom-border radius-sm op-list-card">
            <q-inner-loading :showing="PreferenceStore.isLoadingTable" color="primary" />
            <q-list separator v-if="filteredRows.length">
                <q-item v-for="o in filteredRows" :key="o.id" class="q-pa-md">
                    <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" icon="bi-building" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label class="text-uppercase text-weight-bold">{{ o.name }}</q-item-label>
                        <q-item-label caption>
                            {{ o.alias }}<template v-if="o.email"> &middot; {{ o.email }}</template>
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side top class="op-status-section">
                        <div class="row items-center no-wrap q-mb-xs">
                            <q-badge :color="o.mandate ? 'positive' : 'grey'" rounded class="q-mr-xs" />
                            <span class="text-caption text-grey">{{ o.mandate ? 'mandate set' : 'no mandate' }}</span>
                        </div>
                        <div class="row items-center no-wrap">
                            <q-badge :color="o.isActive ? 'positive' : 'negative'" rounded class="q-mr-xs" />
                            <span class="text-caption text-grey">{{ o.isActive ? 'active' : 'inactive' }}</span>
                        </div>
                    </q-item-section>
                    <q-item-section side>
                        <div class="q-gutter-xs">
                            <q-btn v-if="o.isActive" rounded unelevated color="grey-5" size="xs" no-caps label="edit" @click="() => { PreferenceStore.dialog = true; PreferenceStore.isEdit = true; PreferenceStore.office = o; }" />
                            <q-btn v-if="o.isActive" rounded unelevated color="grey-5" size="xs" no-caps label="disable" @click="disableOffice(o)" :loading="o.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                            <q-btn v-else rounded unelevated color="grey-5" size="xs" no-caps label="enable" @click="enableOffice(o)" :loading="o.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
            <div class="q-pa-xl text-center text-grey" v-else>
                <q-icon name="bi-building" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no offices found</div>
            </div>
        </q-card>
        <q-dialog v-model="PreferenceStore.dialog" full-height persistent @before-show="openDialog(PreferenceStore.office)">
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">{{ PreferenceStore.isEdit ? 'Edit Office' : 'New Office' }}</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col op-create-shell">
                        <div class="op-create-body">
                            <div class="q-gutter-xs">
                                <q-input outlined v-model="form.name" label="Office Name" :error="errors.name.type" :error-message="errors.name.message" />
                                <q-input outlined v-model="form.alias" label="Office Alias" :error="errors.alias.type" :error-message="errors.alias.message" />
                                <q-input outlined v-model="form.email" label="Office Email" type="email" :error="errors.email.type" :error-message="errors.email.message" />
                                <q-input
                                    outlined type="textarea" rows="5"
                                    v-model="form.mandate"
                                    label="Mandate — what this office is responsible for"
                                    hint="Filed complaints are matched against this text to auto-assign them here. Leave blank and this office is skipped by auto-assignment."
                                />
                            </div>
                        </div>
                        <div class="op-create-footer row justify-start">
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
import { usePreferenceStore } from '../stores/preference-store';
import { Toast } from 'src/boot/sweetalert';

const PreferenceStore = usePreferenceStore();

const rows = ref([]);

// Self-contained search — no pagination, the whole (already small) office list renders at once,
// same convention as the Complaint/Discussion/Poll rail lists elsewhere in this app.
const search = ref('');
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return rows.value;
    return rows.value.filter(o =>
        (o.name || '').toLowerCase().includes(term) ||
        (o.alias || '').toLowerCase().includes(term) ||
        (o.email || '').toLowerCase().includes(term)
    );
});

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const id = ref(null);
const form = reactive({
    name: '',
    alias: '',
    email: '',
    mandate: '',
});

const errors = reactive({
    name: { type: false, message: '' },
    alias: { type: false, message: '' },
    email: { type: false, message: '' },
});

// Validate the form inputs
const validate = () => {
    errors.name.type = !form.name;
    errors.alias.type = !form.alias;
    errors.email.type = !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

    errors.name.message = errors.name.type ? 'Name is required.' : '';
    errors.alias.message = errors.alias.type ? 'Alias is required.' : '';
    errors.email.message = !form.email ? 'Email is required.' : (errors.email.type ? 'Email is invalid.' : '');

    return  !errors.name.type &&
            !errors.alias.type &&
            !errors.email.type;
};

// Fetch data when the component is mounted
const fetchData = async () => {
    PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/office');
        rows.value = response.data;
        PreferenceStore.isLoadingTable = false;
    } catch (error) {
        console.error('Error fetching data:', error);
        PreferenceStore.isLoadingTable = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while fetching office preferences.'}<div>
            `
        });
    }
};

// Fetch data when the component is mounted
onMounted(() => {
    fetchData();
});

// Open the dialog for creating or editing an office preference
const openDialog = (office) => {

    if (PreferenceStore.isEdit && office) {
        id.value = office.id;
        form.name = office.name || '';
        form.alias = office.alias || '';
        form.email = office.email || '';
        form.mandate = office.mandate || '';
    } else {
        id.value = null;
        form.name = '';
        form.alias = '';
        form.email = '';
        form.mandate = '';
    }
    errors.name.type = false;
    errors.alias.type = false;
    errors.email.type = false;
};

// Save the form data
const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/office/${id.value}/update`, form)
            : await api.post('/preference/office', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        PreferenceStore.isLoading = false;
        if (id.value) {
            updateRows(id.value, response.data.office);
        } else {
            rows.value.unshift(response.data.office);
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
                <div class="text-caption;">${error.response.data.message || 'An error occurred while saving the office.'}<div>
            `
        });
    }
};

// Disable an office preference
const disableOffice = async (office) => {
    id.value = office.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/office/${office.id}/disable`);
        updateRows(office.id, response.data.office);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling office:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while disabling the office.'}<div>
            `
        });
    }
};

// Enable an office preference
const enableOffice = async (office) => {
    id.value = office.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/office/${office.id}/enable`);
        updateRows(office.id, response.data.office);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling office:', error);
        PreferenceStore.isLoading = false;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response.data.message || 'An error occurred while enabling the office.'}<div>
            `
        });
    }
};

// Update rows when save or delete actions are performed
const updateRows = (id, data) => {
    const index = rows.value.findIndex(office => office.id === id);
    if (index !== -1) {
        Object.assign(rows.value[index], data)
    }
};
</script>

<style scoped>
.op-list-card {
    max-height: calc(100vh - 220px);
    min-height: 200px;
    overflow-y: auto;
}
.op-status-section {
    align-items: flex-end;
    min-width: 120px;
}
.op-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.op-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.op-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
</style>
