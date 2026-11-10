import { ref, computed } from 'vue';

// The page-by-page logic of a Preference dialog (office, user, holiday): which page is open, which pages can be opened,
// and moving between them. Creating goes step by step: a page opens only once every page before it is complete.
// Editing starts from a complete record, so every page is free.
//
//   const wizard = usePrefWizard({ order: () => (isEdit.value ? ['details'] : ['details', 'review']), stepDone, isEdit, onBlocked })
//
//   order      the pages, in order (a function, because editing has no review page)
//   stepDone   (key) => whether that page is complete
//   isEdit     a ref: true while an existing record is being edited
//   onBlocked  (key) => called when "next" is pressed on a page that is not complete (mark what is missing)
export const usePrefWizard = ({ order, stepDone, isEdit, onBlocked }) => {
    const page = ref(order()[0]);

    const isOpen = (key) => {
        const list = order();
        return isEdit.value || list.slice(0, list.indexOf(key)).every(stepDone);
    };
    const index = computed(() => Math.max(0, order().indexOf(page.value)));
    const go = (key) => {
        if (order().includes(key) && isOpen(key)) page.value = key;
    };
    const stepBy = (dir) => {
        const next = order()[index.value + dir];
        if (!next) return;
        // going forward asks the page you are on to be complete: what is missing is marked, and you stay
        if (dir > 0 && !isEdit.value && !stepDone(page.value)) {
            onBlocked?.(page.value);
            return;
        }
        page.value = next;
    };
    const reset = () => {
        page.value = order()[0];
    };

    return { page, isOpen, index, go, stepBy, reset };
};
