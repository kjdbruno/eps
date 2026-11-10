// The placeholders a canned message (or any reply typed by hand) can carry. They are filled in with the feedback's own data when a
// message is picked and again when it is sent, so a "{firstname}" typed by hand works the same as one in a canned message.
// `sample` is what the preference page shows them as.
export const CANNED_TOKENS = [
    { token: '{firstname}', label: 'first name', hint: 'The citizen\'s first name', sample: 'Maria' },
    { token: '{lastname}', label: 'last name', hint: 'The citizen\'s last name', sample: 'Garcia' },
    { token: '{name}', label: 'full name', hint: 'The citizen\'s first and last name', sample: 'Maria Garcia' },
    { token: '{email}', label: 'email', hint: 'The email address on the feedback', sample: 'maria@example.com' },
    { token: '{phone}', label: 'phone', hint: 'The contact number on the feedback', sample: '0917 123 4567' },
    { token: '{reference}', label: 'reference no.', hint: 'The feedback\'s reference number', sample: 'EPS20261026L0314' },
    { token: '{office}', label: 'my office', hint: 'The office of whoever sends it', sample: 'CICTO' },
    { token: '{offices}', label: 'all offices', hint: 'Every office the feedback is routed to', sample: 'CICTO, OCM' },
    { token: '{staff}', label: 'sender', hint: 'The name of whoever sends it', sample: 'Juan Dela Cruz' },
    { token: '{status}', label: 'status', hint: 'The status of the feedback now', sample: 'ongoing' },
    { token: '{filed}', label: 'date filed', hint: 'The day the feedback was filed', sample: 'Oct 26, 2026' },
    { token: '{deadline}', label: 'deadline', hint: 'The day the feedback is due', sample: 'Oct 30, 2026' },
    { token: '{today}', label: 'today', hint: 'Today\'s date', sample: 'Oct 28, 2026' },
];

const titleCase = (s) => String(s || '').trim().toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase());

// values: { token without braces: text }. A token with no value stays as typed, so it is seen (and can be fixed) rather than vanishing.
export const fillTokens = (text, values) => String(text ?? '').replace(/\{(\w+)\}/g, (all, key) => {
    const v = values[String(key).toLowerCase()];
    return v === undefined || v === null || v === '' ? all : v;
});

export const sampleValues = () => Object.fromEntries(CANNED_TOKENS.map(t => [t.token.slice(1, -1), t.sample]));

// the values of one feedback, as ComplaintStore.details holds it; `me` is the signed-in staff user
export const feedbackValues = (details, me, moment) => {
    const d = details?.complaintDetail;
    const first = titleCase(d?.user?.firstname ?? d?.guestFirstName);
    const last = titleCase(d?.user?.lastname ?? d?.guestLastName);
    const offices = (details?.complaintOffices || []).filter(co => co.isActive).map(co => co.office?.alias || co.office?.name).filter(Boolean);
    const date = (v) => (v ? moment(v).format('MMM D, YYYY') : '');
    return {
        firstname: first || 'Citizen',
        lastname: last,
        name: `${first} ${last}`.trim() || 'Citizen',
        email: d?.user?.citizen?.email || d?.guestEmail || '',
        phone: d?.user?.citizen?.phoneNo || d?.guestPhone || '',
        reference: details?.referenceNo || '',
        office: me?.staff?.office?.alias || 'our office',
        offices: offices.join(', '),
        staff: `${titleCase(me?.firstname)} ${titleCase(me?.lastname)}`.trim(),
        status: details?.status || '',
        filed: date(details?.createdAt),
        deadline: date(details?.resolutionDeadline),
        today: moment().format('MMM D, YYYY'),
    };
};
