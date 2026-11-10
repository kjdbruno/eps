import { ref, watch } from 'vue';

// A creation dialog that asks for a second look before it saves: "Review" checks the form and shows
// what is about to be stored, "Back" returns to the form, "Submit" does the real thing.
//   formErrors: the dialog's reactive { field: { type, ... } } map. A problem raised while saving
//               (the server refused a value) sends the dialog back to the form where it is marked.
export function useReview(formErrors) {
    const reviewing = ref(false);

    // validate: the dialog's own check; returns true when the form is fine. Problems are marked on the
    // form by that check, and the dialog stays on the form.
    const goReview = (validate) => {
        reviewing.value = validate ? validate() !== false : true;
        return reviewing.value;
    };

    const back = () => { reviewing.value = false; };
    const reset = () => { reviewing.value = false; };

    watch(() => Object.values(formErrors || {}).some(e => e && e.type), (has) => { if (has) reviewing.value = false; });

    return { reviewing, goReview, back, reset };
}
