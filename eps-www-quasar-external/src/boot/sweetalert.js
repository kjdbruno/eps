// quasar-frontend/src/boot/sweetalert.js

import { boot } from 'quasar/wrappers';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import 'sweetalert2/src/sweetalert2.scss';

// Define your Toast mixin
const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

// Export it directly
export { Toast }; // <-- ADD THIS LINE

// This part makes it available as this.$toast in components (for options API)
export default boot(({ app }) => {
    app.config.globalProperties.$toast = Toast;
});