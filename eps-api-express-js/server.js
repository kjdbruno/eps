require('dotenv').config();
// refuse to start in production with settings that leave the system open (see utils/startupChecks.js)
require('./utils/startupChecks')();
const express = require('express');
const compression = require('compression');
const { maskServerErrors, errorHandler, notFound } = require('./middlewares/serverErrors');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const { Sequelize } = require('sequelize');
const path = require('path');
const app = express();
const server = http.createServer(app);

// Behind a reverse proxy (nginx, IIS...) every request would look as if it came from the proxy, so the rate limits (sign-in, codes)
// would count all visitors together. TRUST_PROXY is how many proxies sit in front of this server (1 is usual); with it set, the
// real visitor address is read from X-Forwarded-For. Left unset, the address of the connection is used, as before.
if (process.env.TRUST_PROXY) {
  const hops = process.env.TRUST_PROXY.trim();
  app.set('trust proxy', /^\d+$/.test(hops) ? Number(hops) : hops === 'true');
}

// `origin: '*'` + `credentials: true` together is an invalid/dangerous combination — most
// browsers reject sending credentials to a wildcard origin, and where one doesn't, it defeats the
// point of CORS entirely. Set CORS_ORIGINS (comma-separated) to the real frontend origin(s) —
// e.g. "https://feedback.sanfernandocity.gov.ph,http://localhost:9000" — to get a real allowlist
// with credentials support. Left unset, OR explicitly set to "*", this falls back to the wide-open
// `*`, but WITHOUT `credentials: true` (this app authenticates via a Bearer token/API key header
// it attaches itself, not cookies, so credentialed CORS was never actually needed).
//
// The literal string "*" has to be special-cased here — the `cors` package only treats a bare
// string `'*'` as "allow everything"; an ARRAY containing just `'*'` (which is what
// `"*".split(',')` produces) instead makes it check whether the request's real Origin
// string-equals "*", which no browser's Origin header ever does, so every single origin — kiosk,
// external, internal, all of them — got rejected. That's the bug that broke the kiosk's CORS just
// now: someone set CORS_ORIGINS=* expecting the old wildcard behavior back.
const corsOriginsList = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null;
const corsOrigins = corsOriginsList && !corsOriginsList.includes('*') ? corsOriginsList : null;
if (!corsOrigins) {
  console.warn('CORS_ORIGINS is not set (or is "*") — falling back to origin "*" (no credentials). Set CORS_ORIGINS to a comma-separated allowlist in .env for real per-origin CORS.');
}

const io = socketIo(server, {
  pingInterval: 25000,
  pingTimeout: 5000,
    cors: corsOrigins
      ? { origin: corsOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'], credentials: true }
      : { origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }
});

// the controllers tell connected screens when data changes (see utils/realtime.js)
require('./utils/realtime').setIo(io);

// Middleware
// crossOriginResourcePolicy defaults to 'same-origin', which would block the internal/external
// Quasar apps (a different origin, by design — see the CORS setup above) from loading anything
// this server serves directly: avatar images under /uploads, generated PDFs, etc. Everything
// else helmet sets by default (X-Content-Type-Options, frameguard, HSTS, etc.) is safe as-is for
// a pure JSON/asset API with no HTML pages of its own.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOrigins
  ? { origin: corsOrigins, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], credentials: true }
  : { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }
));
// answers are sent compressed (the lists and reports are large JSON)
app.use(compression());
// a 5xx never tells a visitor what the database said (production only, see middlewares/serverErrors.js)
app.use(maskServerErrors);
// Photos and files are uploaded as multipart (limited per file in the routes), so a JSON body has no reason to be big: 50 MB let
// anybody tie the server up with one request. The report PDF export is the largest one that is sent as JSON.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  logging: false
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  })
  .finally(() => {
    console.log('🔄 Sequelize authentication attempt completed');
  });

// Routes
const AuthRoutes = require('./routes/AuthRoutes');
const AuthController = require('./controllers/AuthController');
const Auth = AuthController(io);
app.use('/api', AuthRoutes(Auth));

const UserRoutes = require('./routes/UserRoutes');
const UserController = require('./controllers/UserController');
const User = UserController(io);
app.use('/api/preference/user', UserRoutes(User));
app.use('/api/preference/office', require('./routes/OfficeRoutes'));
app.use('/api/preference/complainttype', require('./routes/ComplaintTypeRoutes'));
app.use('/api/preference/holiday', require('./routes/HolidayRoutes'));
app.use('/api/preference/canned', require('./routes/CannedMessageRoutes'));
app.use('/api/preference/clients', require('./routes/ClientAccountRoutes'));
app.use('/api/change-password', require('./routes/PasswordRoutes'));
app.use('/api/feedback', require('./routes/FeedbackRoutes'))
app.use('/api/nav-badges', require('./routes/NavBadgeRoutes'))
app.use('/api/notification', require('./routes/NotificationRoutes'))
app.use('/api/device-token', require('./routes/DeviceTokenRoutes'))

// avatars: cached for a week by the browser, never a directory listing or a hidden file
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), { maxAge: '7d', index: false, dotfiles: 'deny' }));

const ComplaintRoutes = require('./routes/ComplaintRoutes');
const ComplaintController = require('./controllers/ComplaintController');
const Complaint = ComplaintController(io);
app.use('/api/complaint', ComplaintRoutes(Complaint));

const CitizenRoutes = require('./routes/CitizenRoutes');
app.use('/api/citizen', CitizenRoutes(Complaint));

const ResponseRoutes = require('./routes/ResponseRoutes');
const ResponseController = require('./controllers/ResponseController');
const ComplaintResponse = ResponseController(io);
app.use('/api/response', ResponseRoutes(ComplaintResponse));

app.use('/api/report', require('./routes/ReportRoutes'));

const KioskRatingRoutes = require('./routes/KioskRatingRoutes');
const KioskRatingController = require('./controllers/KioskRatingController');
const KioskRating = KioskRatingController(io);
app.use('/api/rating', KioskRatingRoutes(KioskRating));

const DiscussionRoutes = require('./routes/DiscussionRoutes');
const DiscussionController = require('./controllers/DiscussionController');
const DiscussionCtrl = DiscussionController(io);
app.use('/api/discussion', DiscussionRoutes(DiscussionCtrl));

const PollRoutes = require('./routes/PollRoutes');
const PollController = require('./controllers/PollController');
const PollCtrl = PollController(io);
app.use('/api/poll', PollRoutes(PollCtrl));

const TeamRoutes = require('./routes/TeamRoutes');
const TeamController = require('./controllers/TeamController');
const Team = TeamController(io);
app.use('/api/team', TeamRoutes(Team));

const MessageRoutes = require('./routes/MessageRoutes');
const MessageController = require('./controllers/MessageController');
const MessageCtrl = MessageController(io);
app.use('/api/messages', MessageRoutes(MessageCtrl));

require('./sockets')(io);

// anything that matched nothing, and anything that was thrown: a short JSON answer (never a stack trace)
app.use(notFound);
app.use(errorHandler);

// // Assuming your 'backend' folder is a direct sibling of 'frontend' within 'my-app/'
// // and this server.js/app.js is directly within 'backend/' or 'backend/dist/'
// const frontendBuildPath = path.join(__dirname, '..', '..', 'feedback-internal-quasar', 'dist', 'spa'); // Adjust as necessary

// // If 'app.js' is inside 'backend/dist/', then it's two levels up:
// // const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');

// console.log(`Serving frontend static files from: ${frontendBuildPath}`);
// app.use(express.static(frontendBuildPath));

// // --- Handle Frontend Client-Side Routing (e.g., React Router) ---
// // For any unhandled requests, serve the main index.html file
// // This allows client-side routing to take over for paths like /about, /dashboard, etc.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendBuildPath, 'index.html'));
// });
// const feedbackPath = path.join(__dirname, '..', '..', 'feedback-internal-quasar', 'dist', 'spa');
// app.use(express.static(feedbackPath));

// const kioskPath = path.join(__dirname, '..', '..', 'feedback-kiosk-quasar', 'dist', 'spa');
// app.use(express.static(kioskPath));

// app.use((req, res, next) => {
//   const host = req.hostname;
//   if (host.includes('kiosk')) {
//     res.sendFile(path.join(kioskPath, 'index.html'));
//   } else {
//     res.sendFile(path.join(feedbackPath, 'index.html'));
//     }
// });
// Main frontend
// const feedbackPath = path.join(__dirname, "..", "..", "eps-www-quasar-internal", "dist", "spa");
// const kioskPath = path.join(__dirname, "..", "..", "eps-kiosk-quasar", "dist", "spa");

// // 🚀 Serve static assets FIRST
// app.use("/", express.static(feedbackPath));
// app.use("/kiosk", express.static(kioskPath));

// // 🚀 History fallback for kiosk
// app.get("/kiosk/*", (req, res) => {
//   res.sendFile(path.join(kioskPath, "index.html"));
// });

// // 🚀 History fallback for main app
// app.get("/*", (req, res) => {
//   res.sendFile(path.join(feedbackPath, "index.html"));
// });

// Start server
server.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
