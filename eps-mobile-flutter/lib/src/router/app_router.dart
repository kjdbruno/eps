import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../state/auth_controller.dart';
import '../ui/screens/change_password_screen.dart';
import '../ui/screens/complaint_detail_screen.dart';
import '../ui/screens/discussion_list_screen.dart';
import '../ui/screens/discussion_thread_screen.dart';
import '../ui/screens/file_complaint_screen.dart';
import '../ui/screens/home_screen.dart';
import '../ui/screens/landing_screen.dart';
import '../ui/screens/my_complaints_screen.dart';
import '../ui/screens/poll_list_screen.dart';
import '../ui/screens/poll_vote_screen.dart';
import '../ui/screens/splash_screen.dart';
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
      // The first login of an account that still has the temporary password it was emailed
      GoRoute(
        path: '/change-password',
        builder: (_, __) => const ChangePasswordScreen(),
      ),
      // Sign in, create account, forgot password and the verification codes are slide-up sheets
      // (see ui/widgets/auth_sheet.dart), not routes.
      GoRoute(
        path: '/file-complaint',
        builder: (_, __) => const FileComplaintScreen(),
      ),

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
            routes: [
              GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
            ],
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

    // Until they choose their own password the API refuses everything else, so nothing else is shown.
    final mustChange = authed && _auth.user!.mustChangePassword;
    if (mustChange) return loc == '/change-password' ? null : '/change-password';
    if (loc == '/change-password') return authed ? '/home' : '/';

    const authEntryPoints = {'/'};

    if (authed && authEntryPoints.contains(loc)) return '/home';

    final needsAuth = loc.startsWith('/home');
    if (!authed && needsAuth) return '/';

    return null;
  }
}
