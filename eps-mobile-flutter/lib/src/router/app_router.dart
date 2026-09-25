import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../state/auth_controller.dart';
import '../ui/screens/account_screen.dart';
import '../ui/screens/complaint_detail_screen.dart';
import '../ui/screens/discussion_list_screen.dart';
import '../ui/screens/discussion_thread_screen.dart';
import '../ui/screens/file_complaint_screen.dart';
import '../ui/screens/forgot_password_screen.dart';
import '../ui/screens/home_screen.dart';
import '../ui/screens/landing_screen.dart';
import '../ui/screens/login_screen.dart';
import '../ui/screens/my_complaints_screen.dart';
import '../ui/screens/poll_list_screen.dart';
import '../ui/screens/poll_vote_screen.dart';
import '../ui/screens/register_screen.dart';
import '../ui/screens/splash_screen.dart';
import '../ui/screens/track_screen.dart';
import '../ui/screens/verify_complaint_screen.dart';
import '../ui/screens/verify_email_screen.dart';
import '../ui/shell/home_shell.dart';

class AppRouter {
  AppRouter(this._auth);
  final AuthController _auth;

  static final _rootKey = GlobalKey<NavigatorState>();
  static final _shellKey = GlobalKey<NavigatorState>();

  late final GoRouter router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    refreshListenable: _auth,
    redirect: _redirect,
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/', builder: (_, __) => const LandingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/verify-email',
        builder: (_, s) =>
            VerifyEmailScreen(email: s.uri.queryParameters['email'] ?? ''),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (_, s) =>
            ForgotPasswordScreen(email: s.uri.queryParameters['email'] ?? ''),
      ),

      // Guest complaint flow
      GoRoute(
        path: '/file-complaint',
        builder: (_, __) => const FileComplaintScreen(),
      ),
      GoRoute(
        path: '/verify-complaint',
        builder: (_, __) => const VerifyComplaintScreen(),
      ),
      GoRoute(path: '/track', builder: (_, __) => const TrackScreen()),

      // Detail screens — top-level, so they cover the shell when pushed.
      GoRoute(
        path: '/discussions/:id',
        builder: (_, s) =>
            DiscussionThreadScreen(id: int.parse(s.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/polls/:id',
        builder: (_, s) =>
            PollVoteScreen(id: int.parse(s.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/my-complaints/:id',
        builder: (_, s) =>
            ComplaintDetailScreen(id: int.parse(s.pathParameters['id']!)),
      ),

      // Guest-accessible list screens (also reachable, unshelled, when logged out)
      GoRoute(
        path: '/discussions',
        builder: (_, __) => const DiscussionListScreen(),
      ),
      GoRoute(path: '/polls', builder: (_, __) => const PollListScreen()),

      // Authenticated area — bottom-nav shell.
      StatefulShellRoute.indexedStack(
        parentNavigatorKey: _rootKey,
        builder: (_, __, shell) => HomeShell(shell: shell),
        branches: [
          StatefulShellBranch(
            navigatorKey: _shellKey,
            routes: [GoRoute(path: '/home', builder: (_, __) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home/complaints',
                builder: (_, __) => const MyComplaintsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home/discussions',
                builder: (_, __) => const DiscussionListScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home/polls',
                builder: (_, __) => const PollListScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home/account',
                builder: (_, __) => const AccountScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );

  String? _redirect(BuildContext context, GoRouterState state) {
    final loc = state.matchedLocation;

    // Still restoring the persisted session — hold on the splash.
    if (!_auth.isReady) return loc == '/splash' ? null : '/splash';

    // Session restored — leave the splash for the right landing spot.
    if (loc == '/splash') return _auth.isAuthenticated ? '/home' : '/';

    final authed = _auth.isAuthenticated;
    const authEntryPoints = {'/', '/login', '/register', '/verify-email'};

    if (authed && authEntryPoints.contains(loc)) return '/home';

    final needsAuth = loc.startsWith('/home');
    if (!authed && needsAuth) return '/';

    return null;
  }
}
