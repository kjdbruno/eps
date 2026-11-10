<template>
    <AuthShell
        title="Sign Up"
        subtitle="Create an account to file feedback without OTP and follow them in one place."
        auth
        icon="bi-person-plus"
        headline="Create your citizen account"
        lead="It takes less than a minute and no existing feedback is needed."
        :steps="SIDE_STEPS"
    >
        <form class="lgn-stack" @submit.prevent="SubmitRegister()">
            <div class="lgn-sec"><span>your name</span></div>
            <div class="lgn-grid">
                <div>
                    <q-input v-model="registerForm.firstname" outlined rounded dense hide-bottom-space no-error-icon placeholder="First name" :error="!!RegisterErrors.firstname" autocomplete="given-name" autofocus />
                    <div class="lgn-err" v-if="RegisterErrors.firstname">{{ RegisterErrors.firstname }}</div>
                </div>
                <div>
                    <q-input v-model="registerForm.lastname" outlined rounded dense hide-bottom-space no-error-icon placeholder="Last name" :error="!!RegisterErrors.lastname" autocomplete="family-name" />
                    <div class="lgn-err" v-if="RegisterErrors.lastname">{{ RegisterErrors.lastname }}</div>
                </div>
            </div>

            <div class="lgn-sec"><span>how to reach you</span></div>
            <div>
                <q-input v-model="registerForm.email" type="email" outlined rounded dense hide-bottom-space no-error-icon placeholder="Email address" :error="!!RegisterErrors.email" autocomplete="email">
                    <template #prepend><q-icon name="bi-envelope" size="18px" /></template>
                </q-input>
                <div class="lgn-err" v-if="RegisterErrors.email">{{ RegisterErrors.email }}</div>
            </div>
            <div>
                <q-input v-model="registerForm.phoneNo" outlined rounded dense hide-bottom-space no-error-icon placeholder="Contact no. (09XXXXXXXXX)" :error="!!RegisterErrors.phoneNo" autocomplete="tel">
                    <template #prepend><q-icon name="bi-telephone" size="18px" /></template>
                </q-input>
                <div class="lgn-err" v-if="RegisterErrors.phoneNo">{{ RegisterErrors.phoneNo }}</div>
            </div>

            <div class="lgn-sec"><span>your password</span></div>
            <div class="lgn-grid">
                <div>
                    <q-input v-model="registerForm.password" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Password" :error="!!RegisterErrors.password" autocomplete="new-password">
                        <template #append><q-icon :name="showPassword ? 'bi-eye' : 'bi-eye-slash'" size="18px" class="cursor-pointer" @click="showPassword = !showPassword" /></template>
                    </q-input>
                    <div class="lgn-err" v-if="RegisterErrors.password">{{ RegisterErrors.password }}</div>
                </div>
                <div>
                    <q-input v-model="registerForm.confirmPassword" :type="showPassword ? 'text' : 'password'" outlined rounded dense hide-bottom-space no-error-icon placeholder="Confirm password" :error="!!RegisterErrors.confirmPassword" autocomplete="new-password" />
                    <div class="lgn-err" v-if="RegisterErrors.confirmPassword">{{ RegisterErrors.confirmPassword }}</div>
                </div>
            </div>
            <div class="lgn-hint">Use at least 8 characters.</div>

            <q-btn type="submit" unelevated rounded no-caps color="primary" label="Create account" class="lgn-btn full-width" :loading="RegisterLoading" />
        </form>

        <div class="lgn-help">
            Already have an account?
            <router-link class="lgn-link lgn-link--b" to="/login">Sign in</router-link>
        </div>

        <div class="lgn-note">
            <q-icon name="bi-shield-check" size="18px" />
            <div>Your details are used only for your account and to reach you about your feedback, in line with the Data Privacy Act.</div>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "Skip the one-time code",
        "text": "File feedback in one step instead of waiting on an email verification each time."
    },
    {
        "title": "A dashboard for your feedback",
        "text": "See every feedback's status and updates in one place, no reference number needed."
    },
    {
        "title": "Be known in the community",
        "text": "Your name shows on discussions and survey responses instead of \"Anonymous.\""
    }
];
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import AuthShell from 'src/components/AuthShell.vue';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const RegisterLoading = ref(false);
const showPassword = ref(false);
const registerForm = reactive({
    firstname: '', lastname: '', email: '', phoneNo: '', password: '', confirmPassword: ''
});
const RegisterErrors = reactive({
    firstname: '', lastname: '', email: '', phoneNo: '', password: '', confirmPassword: ''
});

const validateRegister = () => {
    let isError = false;
    Object.keys(RegisterErrors).forEach(k => { RegisterErrors[k] = ''; });

    if (!registerForm.firstname) { RegisterErrors.firstname = 'Firstname is required.'; isError = true; }
    if (!registerForm.lastname) { RegisterErrors.lastname = 'Lastname is required.'; isError = true; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!registerForm.email) { RegisterErrors.email = 'Email is required.'; isError = true; }
    else if (!emailRegex.test(registerForm.email)) { RegisterErrors.email = 'Invalid email format.'; isError = true; }

    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!registerForm.phoneNo) { RegisterErrors.phoneNo = 'Contact no. is required.'; isError = true; }
    else if (!phoneRegex.test(registerForm.phoneNo)) { RegisterErrors.phoneNo = 'Invalid contact no. format.'; isError = true; }

    if (!registerForm.password) { RegisterErrors.password = 'Password is required.'; isError = true; }
    else if (registerForm.password.length < 8) { RegisterErrors.password = 'Min. 8 characters.'; isError = true; }

    if (registerForm.confirmPassword !== registerForm.password) { RegisterErrors.confirmPassword = 'Passwords do not match.'; isError = true; }

    return !isError;
};

const SubmitRegister = async () => {
    if (!validateRegister()) return;
    RegisterLoading.value = true;
    try {
        await authStore.register({
            firstname: registerForm.firstname,
            lastname: registerForm.lastname,
            email: registerForm.email,
            phoneNo: registerForm.phoneNo,
            password: registerForm.password,
        });
        $q.notify({ type: 'positive', message: 'Account created. Please check your email for the verification code.' });
        router.push({ path: '/verify-email', query: { email: registerForm.email } });
    } catch (e) {
        const apiError = e.response?.data?.errors?.[0];
        $q.notify({ type: 'negative', message: apiError?.msg || e.response?.data?.message || 'Registration failed.' });
    } finally {
        RegisterLoading.value = false;
    }
};
</script>
