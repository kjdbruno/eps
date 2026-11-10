// pm2 process file for the whole EPS suite (dev mode, hot reload).
//
//   pm2 start ecosystem.config.js            start everything
//   pm2 start ecosystem.config.js --only eps-api     start one app
//   pm2 restart ecosystem.config.js          restart everything
//   pm2 stop ecosystem.config.js             stop everything (keeps them listed)
//   pm2 delete ecosystem.config.js           stop and remove them from pm2
//   pm2 logs [eps-api]                       tail logs
//   pm2 save                                 remember this list for `pm2 resurrect`
//
// Ports: API 1000 (from eps-api-express-js/.env), citizen web 9000, staff dashboard 9001,
// feedback kiosk 9002. The Flutter app (eps-mobile-flutter) is not a Node process, so it is
// run from Flutter tooling, not pm2.
const path = require('path');

const root = __dirname;

// Local Quasar CLI entry (same thing `quasar dev` runs), so no global install or .cmd shim is
// needed — pm2 on Windows can't launch .cmd files directly.
const quasarDev = (dir, name, port) => ({
    name,
    cwd: path.join(root, dir),
    script: path.join(root, dir, 'node_modules', '@quasar', 'app-vite', 'bin', 'quasar.js'),
    args: `dev --port ${port}`,
    env: { NO_BROWSER_OPEN: '1' }, // see `open:` in each quasar.config.js
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
});

module.exports = {
    apps: [
        {
            name: 'eps-api',
            cwd: path.join(root, 'eps-api-express-js'),
            script: 'server.js', // reads PORT/DB/etc. from eps-api-express-js/.env
            watch: ['server.js', 'controllers', 'routes', 'models', 'middlewares', 'utils', 'sockets'],
            ignore_watch: ['node_modules', 'public/uploads', 'dist', 'migrations', 'logs'],
            watch_delay: 1000,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,
        },
        quasarDev('eps-www-quasar-external', 'eps-external', 9000),
        quasarDev('eps-www-quasar-internal', 'eps-internal', 9001),
        quasarDev('eps-www-quasar-kiosk', 'eps-kiosk', 9002),
    ],
};
