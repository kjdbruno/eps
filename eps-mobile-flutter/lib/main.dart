import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'src/api/api_client.dart';
import 'src/realtime/socket_service.dart';
import 'src/services/auth_service.dart';
import 'src/services/complaint_service.dart';
import 'src/services/discussion_service.dart';
import 'src/services/notification_service.dart';
import 'src/services/poll_service.dart';
import 'src/services/push_service.dart';
import 'src/state/auth_controller.dart';
import 'src/state/guest_identity.dart';
import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Push notifications (see push_service.dart / utils/push.js on the backend). Best-effort on
  // purpose: a device/build with no Firebase config on it (e.g. a fresh checkout before the
  // Firebase console setup described in the mobile README is done) must still run the rest of the
  // app normally, just without push — same "degrade, don't crash" convention as the backend side.
  PushService? push;
  if (!kIsWeb) {
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    } catch (e) {
      debugPrint('Firebase not configured — push notifications disabled: $e');
    }
  }

  final api = ApiClient();
  final guest = await GuestIdentity.load();
  if (Firebase.apps.isNotEmpty) {
    push = PushService(api);
    unawaited(push.initialize());
  }

  final socket = SocketService();
  final auth = AuthController(
    api: api,
    authService: AuthService(api),
    socket: socket,
    push: push,
  );
  // Not awaited — the SplashScreen is shown until `auth.isReady` flips, then the
  // router redirects onward. It holds for 3 seconds so the bouncing "e" is seen.
  unawaited(auth.bootstrap(minSplash: const Duration(seconds: 3)));

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        Provider<GuestIdentity>.value(value: guest),
        Provider<SocketService>.value(value: socket),
        Provider<ComplaintService>(create: (_) => ComplaintService(api)),
        Provider<DiscussionService>(create: (_) => DiscussionService(api)),
        Provider<PollService>(create: (_) => PollService(api)),
        Provider<NotificationService>(create: (_) => NotificationService(api)),
        ChangeNotifierProvider<AuthController>.value(value: auth),
      ],
      child: const EpsApp(),
    ),
  );
}
