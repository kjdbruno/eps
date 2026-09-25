import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Shown while [AuthController.bootstrap] restores the persisted session. The
/// router swaps it for `/home` or `/` as soon as `isReady` flips.
///
/// This is the Flutter-side splash; the OS-level launch screen (visible before
/// the engine starts) is configured via `flutter_native_splash` — see
/// `pubspec.yaml` and run `dart run flutter_native_splash:create`.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Official ePS wordmark, copied from eps-www-quasar-external.
            Image.asset(
              'assets/branding/eps_logo.png',
              width: 240,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 8),
            Text(
              'eParticipation System',
              style: TextStyle(
                color: AppTheme.primary.withValues(alpha: 0.7),
                fontSize: 13,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 36),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation(AppTheme.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
