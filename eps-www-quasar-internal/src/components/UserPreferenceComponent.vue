<template>
    <div class="up-shell">
        <div class="row items-center justify-between q-mb-sm">
            <div class="row items-baseline q-gutter-xs">
                <div class="text-h6 text-capitalize">users</div>
                <div class="text-caption text-grey">{{ filteredRows.length }} of {{ rows.length }}</div>
            </div>
            <q-btn unelevated rounded no-caps size="sm" color="primary" label="add" @click="openCreate">
                <q-tooltip>Add a new user</q-tooltip>
            </q-btn>
        </div>
        <q-input outlined dense v-model="search" placeholder="Search name, username, or office..." class="q-mb-md">
            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
        </q-input>

        <!-- "list scroll only" — header/search above stay put; this card scrolls internally once
             the list outgrows it, rather than the whole page growing. -->
        <q-card class="no-shadow custom-border radius-sm up-list-card">
            <q-inner-loading :showing="PreferenceStore.isLoadingTable" color="primary" />
            <q-list separator v-if="filteredRows.length">
                <q-item v-for="u in filteredRows" :key="u.id" class="q-pa-md">
                    <q-item-section avatar>
                        <q-avatar color="primary" text-color="white">
                            <img v-if="u.avatar" :src="photoUrl(u.avatar)">
                            <q-icon v-else name="bi-person-fill" />
                        </q-avatar>
                    </q-item-section>
                    <q-item-section>
                        <q-item-label class="text-uppercase text-weight-bold">{{ u.firstname }} {{ u.lastname }}</q-item-label>
                        <q-item-label caption>
                            {{ u.username }}<template v-if="u.office"> &middot; {{ u.office }}</template>
                            <template v-else> &middot; no office</template>
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side top class="up-status-section">
                        <q-badge outline color="primary" class="text-uppercase q-mb-xs">{{ u.role }}</q-badge>
                        <div class="row items-center no-wrap">
                            <q-badge :color="u.isActive ? 'positive' : 'negative'" rounded class="q-mr-xs" />
                            <span class="text-caption text-grey">{{ u.isActive ? 'active' : 'inactive' }}</span>
                        </div>
                    </q-item-section>
                    <q-item-section side>
                        <div class="q-gutter-xs">
                            <q-btn rounded unelevated color="grey-5" size="xs" no-caps label="edit" @click="() => { PreferenceStore.dialog = true; PreferenceStore.isEdit = true; PreferenceStore.user = u; }" />
                            <q-btn v-if="u.isActive" rounded unelevated color="grey-5" size="xs" no-caps label="disable" @click="disableUser(u)" :loading="u.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                            <q-btn v-else rounded unelevated color="grey-5" size="xs" no-caps label="enable" @click="enableUser(u)" :loading="u.id == id ? PreferenceStore.isLoading : null" :disable="PreferenceStore.isLoading">
                                <template v-slot:loading>
                                    <q-spinner-ios />
                                </template>
                            </q-btn>
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
            <div class="q-pa-xl text-center text-grey" v-else>
                <q-icon name="bi-people" size="2em" class="q-mb-sm" />
                <div class="text-caption text-uppercase">no users found</div>
            </div>
        </q-card>
        <q-dialog v-model="PreferenceStore.dialog" full-height persistent @before-show="openDialog(PreferenceStore.user)">
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">{{ PreferenceStore.isEdit ? 'Edit User' : 'New User' }}</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col up-create-shell">
                        <div class="up-create-body">
                            <div class="row items-center q-gutter-md q-mb-md">
                                <q-avatar size="64px" color="grey-3">
                                    <img v-if="form.avatar && !avatarPreviewFailed" :src="photoUrl(form.avatar)" @error="avatarPreviewFailed = true">
                                    <q-icon v-else name="bi-person-fill" size="32px" color="grey" />
                                </q-avatar>
                                <q-file
                                    outlined dense v-model="avatarFile" label="Upload photo" accept="image/*"
                                    style="max-width: 240px;" :loading="avatarUploading" :disable="avatarUploading"
                                    @update:model-value="onAvatarPicked"
                                >
                                    <template v-slot:prepend><q-icon name="bi-camera" size="xs" /></template>
                                </q-file>
                            </div>
                            <div class="q-gutter-xs">
                                <q-input outlined v-model="form.firstname" label="First Name" :error="errors.firstname.type" :error-message="errors.firstname.message" />
                                <q-input outlined v-model="form.lastname" label="Last Name" :error="errors.lastname.type" :error-message="errors.lastname.message" />
                                <q-input outlined v-model="form.username" label="Username" :error="errors.username.type" :error-message="errors.username.message" />
                                <q-input
                                    outlined v-model="form.password" type="password" :label="PreferenceStore.isEdit ? 'Password (leave blank to keep current)' : 'Password'"
                                    :error="errors.password.type" :error-message="errors.password.message"
                                />
                            </div>

                            <!-- Role/Office pill selectors — same pattern as the Complaint reassignment
                                 chips (ComplaintPage.vue's cp-chip). Both are effectively single-select
                                 here (one role, one office), unlike Complaint's multi-office picker. -->
                            <div class="q-mb-md">
                                <div class="text-caption text-uppercase text-grey q-mb-xs">role</div>
                                <div class="row items-center q-gutter-xs">
                                    <q-btn
                                        v-for="r in roleOptions" :key="r.value"
                                        no-caps unelevated rounded size="sm" :label="r.label"
                                        class="up-chip" :class="form.role === r.value ? 'up-chip--active' : ''"
                                        @click="form.role = r.value"
                                    />
                                </div>
                                <div class="text-negative text-caption q-mt-xs" v-if="errors.role.type">{{ errors.role.message }}</div>
                            </div>

                            <div class="q-mb-md">
                                <div class="row items-center q-mb-xs">
                                    <div class="text-caption text-uppercase text-grey">office</div>
                                    <span class="text-caption text-grey q-ml-xs">{{ form.role === 'workstation' ? '(required)' : '(optional)' }}</span>
                                </div>
                                <div class="row items-center q-gutter-xs">
                                    <q-btn
                                        v-for="o in officeOptions" :key="o.value"
                                        no-caps unelevated rounded size="sm" :label="o.label"
                                        class="up-chip" :class="form.officeId === o.value ? 'up-chip--active' : ''"
                                        @click="form.officeId = form.officeId === o.value ? null : o.value"
                                    />
                                </div>
                                <div class="text-caption text-grey q-mt-xs" v-if="form.role !== 'workstation'">
                                    Optional — only needed if this account also belongs to a specific office (e.g. a department admin).
                                </div>
                                <div class="text-negative text-caption q-mt-xs" v-if="errors.officeId.type">{{ errors.officeId.message }}</div>
                            </div>
                        </div>
                        <div class="up-create-footer row justify-start">
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

// Self-contained search — no pagination, the whole (already small) staff list renders at once,
// same convention as the Complaint/Discussion/Poll rail lists elsewhere in this app.
const search = ref('');
const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return rows.value;
    return rows.value.filter(u => {
        const name = `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase();
        return name.includes(term) ||
            (u.username || '').toLowerCase().includes(term) ||
            (u.office || '').toLowerCase().includes(term) ||
            (u.role || '').toLowerCase().includes(term);
    });
});

const openCreate = () => {
    PreferenceStore.dialog = true;
    PreferenceStore.isEdit = false;
};

const roleOptions = [
    { label: 'Workstation', value: 'workstation' },
    { label: 'Admin', value: 'admin' },
    { label: 'Super Admin', value: 'super' },
    // Read-only oversight — can view everything a supervisor can (except this Office/User
    // preference page, which stays super-only) but never create/edit/close/reopen/respond/vote/
    // reassign anywhere. See middlewares/AuthMiddleware.js.
    { label: 'Monitoring', value: 'monitoring' },
];
const officeOptions = ref([]);

const id = ref(null);
const form = reactive({
    firstname: '',
    lastname: '',
    username: '',
    password: '',
    role: 'workstation',
    officeId: null,
    avatar: '',
});

// Same "path string, served from /uploads" convention MainLayout.vue's formatPhoto() already
// uses for any user's avatar — kept as one helper here since both the list and the dialog preview
// need it.
const photoUrl = (avatarPath) => `${process.env.VUE_APP_BACKEND_URL}${avatarPath}`;

const avatarFile = ref(null);
const avatarUploading = ref(false);
const avatarPreviewFailed = ref(false);

// Upload-then-reference: pick a file, upload it immediately, get back a path, and just hold onto
// that path in the form — the actual create/update submit stays a plain JSON request.
const onAvatarPicked = async (file) => {
    if (!file) return;
    avatarPreviewFailed.value = false;
    avatarUploading.value = true;
    try {
        const body = new FormData();
        body.append('avatar', file);
        const response = await api.post('/preference/user/avatar', body);
        form.avatar = response.data.path;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        avatarFile.value = null;
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'Unable to upload the photo.'}<div>
            `
        });
    } finally {
        avatarUploading.value = false;
    }
};

const errors = reactive({
    firstname: { type: false, message: '' },
    lastname: { type: false, message: '' },
    username: { type: false, message: '' },
    password: { type: false, message: '' },
    role: { type: false, message: '' },
    officeId: { type: false, message: '' },
});

// Validate the form inputs
const validate = () => {
    errors.firstname.type = !form.firstname;
    errors.lastname.type = !form.lastname;
    errors.username.type = !form.username;
    errors.password.type = !PreferenceStore.isEdit && !form.password;
    errors.role.type = !form.role;
    // Only workstation strictly requires an office — see UserValidator.js for why (a
    // workstation account with no office is locked out everywhere else in this app).
    errors.officeId.type = form.role === 'workstation' && !form.officeId;

    errors.firstname.message = errors.firstname.type ? 'First name is required.' : '';
    errors.lastname.message = errors.lastname.type ? 'Last name is required.' : '';
    errors.username.message = errors.username.type ? 'Username is required.' : '';
    errors.password.message = errors.password.type ? 'Password is required.' : '';
    errors.role.message = errors.role.type ? 'Role is required.' : '';
    errors.officeId.message = errors.officeId.type ? 'Office is required for a workstation account.' : '';

    return !errors.firstname.type &&
           !errors.lastname.type &&
           !errors.username.type &&
           !errors.password.type &&
           !errors.role.type &&
           !errors.officeId.type;
};

// Fetch the list of users
const fetchUsers = async () => {
    PreferenceStore.isLoadingTable = true;
    try {
        const response = await api.get('/preference/user');
        rows.value = response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'An error occurred while fetching user preferences.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoadingTable = false;
    }
};

// Office select needs the full office list, not just the ones already assigned to someone
const fetchOffices = async () => {
    try {
        const response = await api.get('/preference/office');
        officeOptions.value = (response.data || []).map(o => ({ label: o.alias || o.name, value: o.id }));
    } catch (error) {
        console.error('Error fetching offices for the user form:', error);
    }
};

onMounted(() => {
    fetchUsers();
    fetchOffices();
});

// Open the dialog for creating or editing a user
const openDialog = (user) => {
    if (PreferenceStore.isEdit && user) {
        id.value = user.id;
        form.firstname = user.firstname || '';
        form.lastname = user.lastname || '';
        form.username = user.username || '';
        form.password = ''; // never pre-fill — leaving it blank means "keep current"
        form.role = user.role || 'workstation';
        form.officeId = user.officeId || null;
        form.avatar = user.avatar || '';
    } else {
        id.value = null;
        form.firstname = '';
        form.lastname = '';
        form.username = '';
        form.password = '';
        form.role = 'workstation';
        form.officeId = null;
        form.avatar = '';
    }
    avatarFile.value = null;
    avatarPreviewFailed.value = false;
    errors.firstname.type = false;
    errors.lastname.type = false;
    errors.username.type = false;
    errors.password.type = false;
    errors.role.type = false;
    errors.officeId.type = false;
};

// Save the form data
const save = async () => {
    if (!validate()) return;
    PreferenceStore.isLoading = true;
    try {
        const response = id.value
            ? await api.post(`/preference/user/${id.value}/update`, form)
            : await api.post('/preference/user', form);

        PreferenceStore.dialog = false;
        PreferenceStore.isEdit = false;
        if (id.value) {
            updateRows(id.value, response.data.user);
        } else {
            rows.value.unshift(response.data.user);
        }
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error saving data:', error);
        const message = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'An error occurred while saving the user.';
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${message}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Disable a user
const disableUser = async (user) => {
    id.value = user.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/user/${user.id}/disable`);
        updateRows(user.id, response.data.user);
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error disabling user:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'An error occurred while disabling the user.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Enable a user
const enableUser = async (user) => {
    id.value = user.id;
    PreferenceStore.isLoading = true;
    try {
        const response = await api.post(`/preference/user/${user.id}/enable`);
        updateRows(user.id, response.data.user);
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">success!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
    } catch (error) {
        console.error('Error enabling user:', error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.error || 'An error occurred while enabling the user.'}<div>
            `
        });
    } finally {
        PreferenceStore.isLoading = false;
    }
};

// Update a row in place after save/disable/enable
const updateRows = (rowId, data) => {
    const index = rows.value.findIndex(u => u.id === rowId);
    if (index !== -1) {
        Object.assign(rows.value[index], data);
    }
};
</script>

<style scoped>
.up-list-card {
    max-height: calc(100vh - 220px);
    min-height: 200px;
    overflow-y: auto;
}
.up-status-section {
    align-items: flex-end;
    min-width: 110px;
}
.up-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.up-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.up-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.up-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.up-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
</style>
