<template>
    <AuthShell
        title="Sign Up"
        subtitle="Create an account to file feedback without OTP and track them in one place."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl">
                    <div class="row q-col-gutter-sm q-mb-md">
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.firstname ? 'text-negative' : 'text-grey'">{{ RegisterErrors.firstname || 'firstname' }}</div>
                            <q-input label="Enter Firstname" outlined v-model="registerForm.firstname" :error="!!RegisterErrors.firstname" no-error-icon />
                        </div>
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.lastname ? 'text-negative' : 'text-grey'">{{ RegisterErrors.lastname || 'lastname' }}</div>
                            <q-input label="Enter Lastname" outlined v-model="registerForm.lastname" :error="!!RegisterErrors.lastname" no-error-icon />
                        </div>
                    </div>
                    <div class="q-mb-md">
                        <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.email ? 'text-negative' : 'text-grey'">{{ RegisterErrors.email || 'email' }}</div>
                        <q-input label="Enter Email" outlined v-model="registerForm.email" :error="!!RegisterErrors.email" no-error-icon />
                    </div>
                    <div class="q-mb-md">
                        <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.phoneNo ? 'text-negative' : 'text-grey'">{{ RegisterErrors.phoneNo || 'contact no.' }}</div>
                        <q-input label="Enter Contact No." outlined v-model="registerForm.phoneNo" :error="!!RegisterErrors.phoneNo" no-error-icon />
                    </div>
                    <div class="row q-col-gutter-sm q-mb-md">
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.password ? 'text-negative' : 'text-grey'">{{ RegisterErrors.password || 'password' }}</div>
                            <q-input label="Enter Password" outlined v-model="registerForm.password" type="password" :error="!!RegisterErrors.password" no-error-icon />
                        </div>
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase q-mb-xs" :class="RegisterErrors.confirmPassword ? 'text-negative' : 'text-grey'">{{ RegisterErrors.confirmPassword || 'confirm password' }}</div>
                            <q-input label="Confirm Password" outlined v-model="registerForm.confirmPassword" type="password" :error="!!RegisterErrors.confirmPassword" no-error-icon />
                        </div>
                    </div>

                    <q-btn class="full-width" unelevated color="primary" size="lg" label="create account" :loading="RegisterLoading" @click="SubmitRegister()"/>

                    <div class="text-center q-mt-md">
                        <span class="text-caption text-grey">already have an account? </span>
                        <router-link class="text-caption text-primary" to="/login">sign in</router-link>
                    </div>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">why create an account</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Skip the one-time code</q-item-label>
                                <q-item-label caption>File feedback in one step instead of waiting on an email verification each time.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">A dashboard for your feedback</q-item-label>
                                <q-item-label caption>See every feedback's status and updates in one place, no reference number needed.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Be known in the community</q-item-label>
                                <q-item-label caption>Your name shows on discussions and poll votes instead of "Anonymous."</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-shield-check" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Your details are used only for your account and to reach you about your
                            feedback, in line with the Data Privacy Act.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import AuthShell from 'src/components/AuthShell.vue';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const RegisterLoading = ref(false);
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
