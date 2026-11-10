// A picture and a page for each kind of EPS notification, from what it says (the content strings
// are written by the API controllers: new complaint, new comment on a discussion, new poll, new response...).
const KINDS = [
    { test: /discussion|comment/, icon: 'bi-people-fill', tone: '', to: '/discussion' },
    { test: /poll|vote/, icon: 'bi-bar-chart-line-fill', tone: 'warn', to: '/poll' },
    { test: /response|replied|follow-up/, icon: 'bi-reply-fill', tone: 'ok', to: '/complaint' },
    { test: /complaint|feedback/, icon: 'bi-chat-quote-fill', tone: '', to: '/complaint' },
];

const kindOf = (n) => {
    const text = String(n?.content || '').toLowerCase();
    return KINDS.find(k => k.test.test(text)) || null;
};

export const NotificationIcon = (n) => {
    const k = kindOf(n);
    return { name: k?.icon || 'bi-bell-fill', tone: k?.tone || '' };
};

// the page a notification is about, or null when there is no obvious one
export const NotificationLink = (n) => kindOf(n)?.to || null;
