import { QCheckbox, QRadio, QToggle } from 'quasar';

// Every checkbox, radio button and toggle knob in the app is a circle with a check: filled when it is on, an outline when it
// is off (bi-check-circle-fill / bi-check-circle). Set once here as the default of the components' icon props, so a
// <q-checkbox>, <q-radio> or <q-toggle> anywhere looks the same without each one asking for it (a page can still pass its own).
const ON = 'bi-check-circle-fill';
const OFF = 'bi-check-circle';

export default () => {
    for (const component of [QCheckbox, QRadio, QToggle]) {
        component.props.checkedIcon = { type: String, default: ON };
        component.props.uncheckedIcon = { type: String, default: OFF };
    }
    QCheckbox.props.indeterminateIcon = { type: String, default: 'bi-dash-circle-fill' };
    QToggle.props.indeterminateIcon = { type: String, default: 'bi-dash-circle-fill' };
};
