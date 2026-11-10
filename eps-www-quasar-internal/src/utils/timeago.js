import moment from 'moment';

// "now", "5m", "3h", "2d", then the date — short enough for a menu row
export const Ago = (t) => {
    if (!t) return '';
    const m = moment(t);
    const mins = moment().diff(m, 'minutes');
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return m.format(m.year() === moment().year() ? 'MMM D' : 'MMM D, YYYY');
};

// "Just now" / "5m ago" — the line under a notification
export const AgoLabel = (t) => (Ago(t) === 'now' ? 'Just now' : `${Ago(t)} ago`);
