<template>
    <q-dialog :model-value="needed" persistent no-esc-dismiss no-backdrop-dismiss>
        <q-card class="fp-card">
            <q-card-section>
                <div class="text-caption text-uppercase text-grey">first login</div>
                <div class="text-h6 text-weight-bold">Choose your own password</div>
                <div class="text-body2 text-grey-8 q-mt-xs">
                    Your account started with a password that others know{{ isStaff ? ' (it is the same as your username)' : '' }}.
                    Choose one that only you know before you continue.
                </div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <div class="rc-cap" :class="{ 'rc-cap--bad': errors.currentPassword }">{{ errors.currentPassword || (isStaff ? 'current password (your username)' : 'current password (the one in your email)') }}</div>
                <q-input v-model="form.currentPassword" type="password" outlined dense autocomplete="current-password" :error="!!errors.currentPassword" no-error-icon hide-bottom-space @keyup.enter="save" />

                <div class="rc-cap q-mt-md" :class="{ 'rc-cap--bad': errors.newPassword }">{{ errors.newPassword || 'new password (at least 8 characters)' }}</div>
                <q-input v-model="form.newPassword" type="password" outlined dense autocomplete="new-password" :error="!!errors.newPassword" no-error-icon hide-bottom-space @keyup.enter="save" />

                <div class="rc-cap q-mt-md" :class="{ 'rc-cap--bad': errors.confirm }">{{ errors.confirm || 'type the new password again' }}</div>
                <q-input v-model="form.confirm" type="password" outlined dense autocomplete="new-password" :error="!!errors.confirm" no-error-icon hide-bottom-space @keyup.enter="save" />
            </q-card-section>

            <q-card-actions align="between" class="q-px-md q-pb-md">
                <q-btn flat no-caps rounded color="grey-8" label="Log out" @click="authStore.logout()" />
                <q-btn unelevated no-caps rounded color="primary" icon="bi-check2" label="Save my password" :loading="loading" @click="save" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';

// Shown, and impossible to dismiss, for an account that still has the password it was given (a seeded one: see
// User.mustChangePassword in the API). The API refuses everything else until it is changed, so there is nothing to
// use behind it anyway.
const authStore = useAuthStore();
const needed = computed(() => !!authStore.user?.mustChangePassword);
const isStaff = computed(() => authStore.user?.role !== 'citizen');

const loading = ref(false);
const form = reactive({ currentPassword: '', newPassword: '', confirm: '' });
const errors = reactive({ currentPassword: '', newPassword: '', confirm: '' });

const validate = () => {
    errors.currentPassword = form.currentPassword ? '' : 'Your current password is required.';
    errors.newPassword = form.newPassword.length < 8 ? 'The new password must be at least 8 characters.'
        : form.newPassword === form.currentPassword ? 'Choose a password different from the current one.' : '';
    errors.confirm = form.confirm === form.newPassword ? '' : 'The two passwords do not match.';
    return !errors.currentPassword && !errors.newPassword && !errors.confirm;
};

const save = async () => {
    if (!validate()) return;
    loading.value = true;
    try {
        await api.post('/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
        authStore.user = { ...authStore.user, mustChangePassword: false };
        localStorage.setItem('user', JSON.stringify(authStore.user));
        Object.assign(form, { currentPassword: '', newPassword: '', confirm: '' });
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">saved!</div><div class="text-caption">Your password was changed.</div>' });
    } catch (error) {
        const fieldErrors = error.response?.data?.errors;
        if (Array.isArray(fieldErrors) && fieldErrors.length) {
            fieldErrors.forEach((e) => { if (e.path in errors) errors[e.path] = e.msg; });
        } else {
            Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to change the password.'}</div>` });
        }
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.fp-card { width: 440px; max-width: 94vw; border-radius: 16px; }
</style>
