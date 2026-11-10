// Text that came from somebody (a name, an email, an office, a title) must never be put into HTML as it is: an alert or a toast
// that builds HTML would run a "<script>" or "<img onerror=...>" typed into a name. Use esc() on every such value in an html: string.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
