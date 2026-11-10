#!/usr/bin/env node
// Builds the whole EPS suite into one folder that can be copied to the server.
//
//   node build-release.mjs --backend https://api.example.gov.ph
//
// What it makes (default: ./release):
//   release/api/              the API: source, package.json and lock file, pm2 file, .env.example. On the server: npm ci --omit=dev
//   release/web/internal/     the staff app (static files)
//   release/web/external/     the citizen portal (static files)
//   release/web/kiosk/        the feedback kiosk (static files)
//   release/DEPLOY.md         the steps to put it on a server, and a web-server sample
//
// The web apps have the address of the API and the API key built INTO them, so they are built here for the server they are going to,
// not copied from a development machine. Options:
//   --backend <url>    the public address of the API, e.g. https://api.example.gov.ph      (required; or EPS_BACKEND_URL)
//   --kiosk-backend    a different API address for the kiosk, if it reaches the API another way (default: --backend)
//   --api-key <key>    the API key; it must be the API_KEY of the API's .env. Default: the value in eps-api-express-js/.env
//   --out <dir>        where to write the release (default: ./release)
//   --only <list>      comma separated: api,internal,external,kiosk (default: all)
//   --install          also run "npm ci --omit=dev" inside release/api, so the node_modules can be copied along (same operating system as
//                      the server; it downloads Chrome for the PDF reports, which is large)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback = '') => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const out = path.resolve(root, opt('out', 'release'));
const only = opt('only', 'api,internal,external,kiosk').split(',').map(s => s.trim()).filter(Boolean);
const backend = (opt('backend') || process.env.EPS_BACKEND_URL || '').replace(/\/+$/, '');
const kioskBackend = (opt('kiosk-backend') || backend).replace(/\/+$/, '');
const apiDir = path.join(root, 'eps-api-express-js');

const readEnvValue = (file, key) => {
    try {
        const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.startsWith(`${key}=`));
        return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : '';
    } catch { return ''; }
};
const apiKey = opt('api-key') || process.env.EPS_API_KEY || readEnvValue(path.join(apiDir, '.env'), 'API_KEY');

const fail = (message) => { console.error(`\n✖ ${message}\n`); process.exit(1); };
const step = (message) => console.log(`\n▶ ${message}`);
const run = (cmd, cmdArgs, cwd, env = {}) => {
    const r = spawnSync(cmd, cmdArgs, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) fail(`"${cmd} ${cmdArgs.join(' ')}" failed in ${path.relative(root, cwd) || '.'}`);
};
const copyDir = (from, to, skip = () => false) => {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const src = path.join(from, entry.name);
        const dst = path.join(to, entry.name);
        if (skip(src, entry)) continue;
        if (entry.isDirectory()) copyDir(src, dst, skip); else fs.copyFileSync(src, dst);
    }
};

// ---------------------------------------------------------------- checks
const wantsWeb = ['internal', 'external', 'kiosk'].some(a => only.includes(a));
if (wantsWeb && !/^https?:\/\//.test(backend)) fail('Give the public address of the API: --backend https://api.example.gov.ph');
if (wantsWeb && /localhost|127\.0\.0\.1/.test(backend)) console.warn('⚠ The backend address points at this machine: the apps built from it will only work here.');
if (wantsWeb && apiKey.length < 16) fail('No API key found (at least 16 characters). Pass --api-key, or set API_KEY in eps-api-express-js/.env.');
if (wantsWeb && /^http:\/\//.test(backend)) console.warn('⚠ The backend address is plain http: use https for a real deployment.');

// only what is rebuilt is replaced, so --only api leaves the web folders of an earlier run alone
fs.mkdirSync(path.join(out, 'web'), { recursive: true });
if (only.includes('api')) fs.rmSync(path.join(out, 'api'), { recursive: true, force: true });
for (const k of ['internal', 'external', 'kiosk']) if (only.includes(k)) fs.rmSync(path.join(out, 'web', k), { recursive: true, force: true });

// ---------------------------------------------------------------- the web apps
const WEB = [
    { key: 'internal', dir: 'eps-www-quasar-internal', url: backend },
    { key: 'external', dir: 'eps-www-quasar-external', url: backend },
    { key: 'kiosk', dir: 'eps-www-quasar-kiosk', url: kioskBackend },
];
for (const app of WEB.filter(a => only.includes(a.key))) {
    step(`Building ${app.key} (${app.dir}) for ${app.url}`);
    const appDir = path.join(root, app.dir);
    if (!fs.existsSync(path.join(appDir, 'node_modules'))) run('npm', ['ci'], appDir);
    run('npx', ['quasar', 'build'], appDir, {
        EPS_BACKEND_URL: app.url,
        EPS_API_KEY: apiKey,
        EPS_DIST_DIR: path.join(out, 'web', app.key),
    });
    if (!fs.existsSync(path.join(out, 'web', app.key, 'index.html'))) fail(`${app.key}: the build produced no index.html in ${path.join(out, 'web', app.key)}`);
}

// ---------------------------------------------------------------- the API
if (only.includes('api')) {
    step('Collecting the API');
    const to = path.join(out, 'api');
    const skipTop = new Set(['node_modules', 'dist', 'logs', '.env', 'webpack.config.js']);
    copyDir(apiDir, to, (src, entry) => {
        const rel = path.relative(apiDir, src).replace(/\\/g, '/');
        if (!rel.includes('/') && skipTop.has(entry.name)) return true;
        if (entry.name === '.git' || entry.name.endsWith('.log')) return true;
        // what people uploaded stays on the server: only the default avatar goes along
        if (rel.startsWith('public/uploads/') && entry.isFile() && entry.name !== 'avatar.png') return true;
        return false;
    });
    fs.mkdirSync(path.join(to, 'public', 'uploads'), { recursive: true });
    fs.mkdirSync(path.join(to, 'logs'), { recursive: true });
    // npm start used to run an old bundled copy in dist/: it runs the server itself
    const pkgFile = path.join(to, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    pkg.scripts = { ...pkg.scripts, start: 'node server.js' };
    fs.writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
    if (flag('install')) {
        step('Installing the API\'s production dependencies (npm ci --omit=dev)');
        run('npm', ['ci', '--omit=dev'], to);
    }
}

// ---------------------------------------------------------------- the steps
fs.writeFileSync(path.join(out, 'DEPLOY.md'), `# Deploying this release

Built ${new Date().toISOString()} for **${backend || '(API only)'}**.

\`\`\`
api/        the API (Node.js 20+)         -> runs on port 1000 behind a reverse proxy
web/internal/   staff app   (static files)  -> e.g. https://feedback.example.gov.ph
web/external/   citizen portal (static)     -> e.g. https://portal.example.gov.ph
web/kiosk/      feedback kiosk (static)     -> e.g. https://kiosk.example.gov.ph
\`\`\`

## 1. The API

1. Copy \`api/\` to the server. ${flag('install') ? 'Its node_modules are included (built on the same operating system).' : 'On the server, inside it: \`npm ci --omit=dev\`'}
2. Copy \`.env.example\` to \`.env\` and fill it in. The server **will not start in production** while \`JWT_SECRET\` is short, \`CORS_ORIGINS\` is
   missing, \`PORTAL_URL\` is on localhost and so on; it says what to fix. \`API_KEY\` must be the key the web apps were built with.
3. Create the database and a MySQL account that only has rights on it, then:
   \`\`\`
   npx sequelize-cli db:migrate
   \`\`\`
   A **new** database also needs its starting data, in this order (they are in \`seeders/\`):
   \`\`\`
   npx sequelize-cli db:seed --seed 20250313033155-OfficeSeeder.js
   npx sequelize-cli db:seed --seed 20250526040047-UserSeeder.js
   npx sequelize-cli db:seed --seed 20260901030000-OfficeMandateSeeder.js
   npx sequelize-cli db:seed --seed 20260901070000-HolidaySeeder.js
   npx sequelize-cli db:seed --seed 20261028030000-CannedMessageSeeder.js
   \`\`\`
   The first sign-in is \`SuperAdministrator\`; it must choose its own password at once.

   Bringing over the old system's clients and feedback is optional and separate: \`20261028010000-LegacyUserSeeder.js\`, then
   \`20261028020000-LegacyFeedbackSeeder.js\`. They read \`seeders/data/\`, which holds **people's names and emails**: keep that folder private
   and delete it from the server once the seeding is done. Do **not** run the Demo seeders on a live system.
4. Start it: \`pm2 start ecosystem.config.js --env production\` then \`pm2 save\`. (\`npm start\` runs \`node server.js\` too.)
5. \`pm2 install pm2-logrotate\` so the log files do not grow without end.

## 2. The web apps

Each folder under \`web/\` is plain static files: put it on any web server. They use "history" routing, so **every path that is not a file
must answer with index.html**. nginx:

\`\`\`
server {
    listen 443 ssl http2;
    server_name feedback.example.gov.ph;           # one block per app (internal, external, kiosk)
    root /var/www/eps/web/internal;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }   # file names carry a hash
    location = /index.html { add_header Cache-Control "no-cache"; }
}
\`\`\`

The API sits behind its own block (\`location / { proxy_pass http://127.0.0.1:1000; }\`) with the WebSocket upgrade headers
(\`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";\`) and \`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\`.
Set \`TRUST_PROXY=1\` in the API's .env. On IIS, use the URL Rewrite rule "fall back to /index.html" for each site.

## 3. The mobile app

Not part of this folder. Build it with the same API address:
\`\`\`
flutter build apk --release --dart-define=EPS_API_BASE_URL=${backend || 'https://api.example.gov.ph'} --dart-define=EPS_API_KEY=<the API_KEY of the API>
\`\`\`

## 4. After it is up

* Sign in as \`SuperAdministrator\`, choose a new password, and create the real accounts under Preference > User.
* Sign in with a wrong password once: it must stay on the sign-in page and say so.
* To update later: build a new release, copy it over, \`npx sequelize-cli db:migrate\` (it only runs what is new), \`pm2 restart eps-api\`.
`);

step('Done');
console.log(`Release written to ${out}`);
for (const k of only) console.log(`  ✔ ${k}`);
console.log('Read DEPLOY.md in that folder for the steps.');
