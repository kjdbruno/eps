'use strict';

// The previous system's office codes are this app's office aliases, except the two offices this app names differently:
// Engineering (EAS there, OCE here) and the Public Information Office (CPIO there, PIO here).
const RENAMED = { EAS: 'OCE', CPIO: 'PIO' };

const aliasOf = (code) => RENAMED[code] || code;

module.exports = { aliasOf };
