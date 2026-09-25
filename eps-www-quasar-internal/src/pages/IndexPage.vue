<template>
    <q-page 
        class="full-height flex flex-center"
    >
        <q-card 
            class="justify-center items-center no-shadow q-pa-xl radius-md bg-accent" 
            style="width: 600px;"
        >
            <q-card-section>
                <div 
                    class="text-h3 text-capitalize text-dark"
                >
                    login
                </div>
            </q-card-section>
            <q-card-section>
                <div 
                    class="row q-col-gutter-sm"
                >
                    <div 
                        class="col-6"
                    >
                        <div class="text-caption text-uppercase q-mb-xs" :class="formErrors.username.type ? 'text-negative' : 'text-grey'">{{ formErrors.username.type ? formErrors.username.msg : 'username' }}</div>
                        <q-input 
                            v-model="username" 
                            :error="formErrors.username.type" 
                            outlined 
                            label="Enter Username" 
                            class="full-width" 
                            autofocus
                            @keyup.enter="login"
                        />
                    </div>
                    <div 
                        class="col-6"
                    >
                        <div class="text-caption text-uppercase q-mb-xs" :class="formErrors.password.type ? 'text-negative' : 'text-grey'">{{ formErrors.password.type ? formErrors.password.msg : 'password' }}</div>
                        <q-input 
                            v-model="password" 
                            :error-message="formErrors.password.msg"
                            :error="formErrors.password.type" 
                            :type="showPassword ? 'text' : 'password'" 
                            outlined 
                            label="Enter Password" 
                            class="full-width"
                            @keyup.enter="login"
                        >
                            <template v-slot:append>
                                <q-icon 
                                    :name="showPassword ? 'visibility' : 'visibility_off'" 
                                    class="cursor-pointer" 
                                    @click="showPassword = !showPassword" 
                                    style="font-size: 1rem;" 
                                />
                            </template>
                        </q-input>
                    </div>
                </div>
                <q-checkbox v-model="rememberMe" label="Remember me" dense class="q-mt-sm" unchecked-icon="bi-check-circle" checked-icon="bi-check-circle-fill" />
            </q-card-section>
            <q-card-section>
                <q-btn
                    unelevated
                    color="primary"
                    label="login"
                    size="lg" 
                    class="full-width" 
                    :loading="loading" 
                    @click="login"
                >
                    <template v-slot:loading>
                        <q-spinner-ios 
                            size=".5em"
                        />
                    </template>
                </q-btn>
                <q-banner 
                    v-if="errors.length"
                    class="bg-red-1 text-negative rounded-lg shadow-md banner-radius q-pa-sm q-mt-md"
                    dense
                    inline-actions
                >
                    <template v-slot:avatar>
                        <q-icon name="error" color="negative" />
                    </template>
                    <div>
                        <div 
                            v-for="(dt, index) in errors" 
                            :key="index"
                            class="text-caption"
                        >
                            {{ dt.msg }}
                        </div>
                    </div>
                </q-banner>
            </q-card-section>
        </q-card>
    </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store';
import { api } from 'src/boot/axios';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');

const showPassword = ref(false);
const rememberMe = ref(false);

const loading = ref(false);

const formErrors = reactive({
    username: { msg: null, type: null },
    password: { msg: null, type: null }
});

const errors = ref([]);

const userValidator = () => {
    let isError = false;
    if (username.value == '' || username.value == '') {
        formErrors.username.msg = 'Username is required!';
        formErrors.username.type = true;
        isError = true;
    } else {
        formErrors.username.msg = null;
        formErrors.username.type = null;
    }
    if (password.value == '' || password.value == null) {
        formErrors.password.msg = 'Password is required!'
        formErrors.password.type = true;
        isError = true;
    } else if (password.value.length > 0 && password.value.length < 4) {
        formErrors.password.msg = 'Minimum password length is 4!';
        formErrors.password.type = true;
        isError = true;
    } else {
        formErrors.password.msg = null;
        formErrors.password.type = null;
    }
    return isError;
}

const login = async () => {
    const isError = userValidator();
    if (isError) return false;
    errors.value = [];
    loading.value = true;
    try {
        await authStore.login(username.value, password.value, rememberMe.value);
        router.push('/home');
    } catch (e) {
        console.error(e);
        // Three different shapes depending on what actually failed: {errors:[{msg}]} for a
        // rejected login (wrong credentials, disabled account — see AuthController.login),
        // {error} for an unexpected 500, {message} for the rate limiter (rateLimiter.js) —
        // normalized here into the array shape the banner below already renders.
        const data = e.response?.data;
        errors.value = Array.isArray(data?.errors) && data.errors.length
            ? data.errors
            : [{ msg: data?.message || data?.error || 'Unable to log in. Please try again.' }];
    } finally {
        // This was never reset on failure at all — the "login" button's spinner just spun
        // forever after a rejected login, on top of no error message ever showing (see above).
        loading.value = false;
    }
}
</script>