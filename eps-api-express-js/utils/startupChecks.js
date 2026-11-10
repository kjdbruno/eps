// Checks the settings that decide how safe a deployment is, once, when the server starts.
//
// In production (NODE_ENV=production) a setting that leaves the system open stops the server from starting, with a message that says
// what to change. Anywhere else the same things are only warned about, so a developer is not blocked on a laptop.
//
//   JWT_SECRET    signs every login: at least 32 random characters. node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
//   API_KEY       the key the apps send with every public request: at least 16 characters
//   CORS_ORIGINS  the exact addresses of the apps (comma separated), never "*"
//   PORTAL_URL    the citizen portal's public address, which is put in the emails
const isProd = process.env.NODE_ENV === 'production';

module.exports = () => {
    const problems = [];
    const warnings = [];
    const flag = (message, hard = true) => (hard && isProd ? problems : warnings).push(message);

    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32) flag(`JWT_SECRET is ${secret ? `only ${secret.length} characters` : 'not set'}: use at least 32 random characters, or a login token can be forged.`);

    const key = process.env.API_KEY || '';
    if (key.length < 16) flag(`API_KEY is ${key ? `only ${key.length} characters` : 'not set'}: use at least 16.`);

    const origins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    if (!origins.length || origins.includes('*')) flag('CORS_ORIGINS is not set (or is "*"): list the exact addresses of the apps, so other sites cannot call the API from a browser.');
    else if (isProd && origins.some(o => /localhost|127\.0\.0\.1/.test(o))) flag('CORS_ORIGINS still lists localhost: remove it for production.', false);

    if (isProd && /localhost|127\.0\.0\.1/.test(process.env.PORTAL_URL || '')) flag('PORTAL_URL points at localhost: the emails would send citizens to a page they cannot open.');
    if (isProd && !process.env.TRUST_PROXY) warnings.push('TRUST_PROXY is not set: behind a reverse proxy (nginx, IIS) every visitor looks like the proxy, so the rate limits count everybody together. Set it to the number of proxies in front (usually 1).');
    if (isProd && process.env.DB_USER === 'root') warnings.push('The database user is root: use an account that only has rights on this database.');
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) warnings.push('MAIL_USER / MAIL_PASS are not set: no email (verification codes, account details) can be sent.');

    warnings.forEach(w => console.warn(`[security] ${w}`));
    if (problems.length) {
        problems.forEach(p => console.error(`[security] ${p}`));
        console.error('[security] The server will not start in production with these settings. Fix them in .env and start it again.');
        process.exit(1);
    }
};
