const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, '../templates/notification.html');

// The look of each kind of update: the pill above the heading.
const KINDS = {
    update: { badge: 'Update', bg: '#E5EEFC', ink: '#2557B3' },
    done: { badge: 'Resolved', bg: '#E4F6EA', ink: '#1C6B35' },
    closed: { badge: 'Closed', bg: '#F1F2F5', ink: '#6B7488' },
    reopened: { badge: 'Reopened', bg: '#FFF4DB', ink: '#8A5B00' },
};

// which kind an update is, from its subject line
const kindOf = (subject = '') => {
    const s = subject.toLowerCase();
    if (s.includes('resolved')) return 'done';
    if (s.includes('closed')) return 'closed';
    if (s.includes('reopened')) return 'reopened';
    return 'update';
};

const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A feedback's reference number, when the message mentions one (EPS2026…), so it can stand out.
const REFERENCE = /\bEPS[A-Z0-9]{6,}\b/;

// Turns one update (a subject and a sentence or two) into the branded HTML email. Everything that
// came from a person or the database is escaped before it is placed in the page.
const renderNotification = ({ subject, content, note }) => {
    const kind = KINDS[kindOf(subject)];
    const ref = (content || '').match(REFERENCE)?.[0];
    const reference = ref ? `
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <div style="background-color:#f6f9fc; border:1px solid #e4eaf3; border-radius:12px; padding:14px 20px; text-align:center;">
                <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8493ac;">Reference no.</div>
                <div style="font-size:22px; font-weight:800; color:#1e2a44; letter-spacing:1px; padding-top:4px;">${escapeHtml(ref)}</div>
              </div>
            </td>
          </tr>
` : '';

    return fs.readFileSync(TEMPLATE, 'utf8')
        .replace(/{{ heading }}/g, escapeHtml(subject))
        .replace('{{ badge }}', kind.badge)
        .replace('{{ badgeBg }}', kind.bg)
        .replace('{{ badgeInk }}', kind.ink)
        .replace('{{ message }}', escapeHtml(content).replace(/\n/g, '<br>'))
        .replace('{{ reference }}', reference)
        .replace('{{ note }}', escapeHtml(note));
};

module.exports = { renderNotification };
