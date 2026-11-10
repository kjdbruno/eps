import 'package:flutter/material.dart';

import '../widgets/eps_loader.dart';

/// Shown while [AuthController.bootstrap] restores the persisted session. The
/// router swaps it for `/home` or `/` as soon as `isReady` flips.
///
/// This is the Flutter-side splash: just the bouncing ePS "e". The OS-level launch screen
/// (visible before the engine starts) is configured via `flutter_native_splash` — see
/// `pubspec.yaml` and run `dart run flutter_native_splash:create`.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.white,
      body: EpsLoader(size: 76),
    );
  }
}
