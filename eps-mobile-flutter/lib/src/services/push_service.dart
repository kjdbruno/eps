import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';

import '../api/api_client.dart';

/// Must be a TOP-LEVEL (or static) function — FirebaseMessaging.onBackgroundMessage runs it in a
/// separate isolate, which can't close over anything from the rest of the app. There's nothing to
/// do here: a background/terminated push already gets its system-tray notification from FCM
/// itself (the payload carries a `notification` block — see utils/push.js), this handler just
/// exists so the plugin has somewhere to dispatch to. Kept for cases that need to react to a
/// silent/data-only push while the app isn't running, which this app doesn't send today.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

/// FCM push notifications — the counterpart to SocketService's in-app live updates (see
/// utils/push.js on the backend for the sending side). Reaches the device even when the app is
/// closed/backgrounded; the socket only works while it's open and connected.
///
/// NOTE: foreground local-notification display (flutter_local_notifications) is temporarily
/// removed. FCM still auto-displays a system notification when the app is backgrounded or
/// terminated; a push that arrives while the app is open in the foreground is currently silent
/// (still delivered to onMessage below, just not shown as a tray notification).
class PushService {
  PushService(this._api);
  final ApiClient _api;

  bool _initialized = false;
  String? _registeredToken;

  /// Call once, early (main.dart) — wires up the notification-tap handler. Does NOT request
  /// permission or register a token; that only happens once someone is actually signed in (see
  /// [registerCurrentToken]), so a guest browsing anonymously is never prompted for it.
  Future<void> initialize({void Function(Map<String, dynamic> data)? onTap}) async {
    if (_initialized || kIsWeb) return;
    _initialized = true;

    // Tapped a push that opened the app from background, or (getInitialMessage) from fully
    // terminated.
    FirebaseMessaging.onMessageOpenedApp.listen((message) => onTap?.call(message.data));
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) onTap?.call(initial.data);
  }

  /// Call right after a successful login/register/email-verification — prompts for notification
  /// permission (a no-op if already answered before) and registers this device's current FCM
  /// token with the backend. Failures here are swallowed: push is a nice-to-have layered on top
  /// of the in-app/socket notifications, never something that should block signing in.
  Future<void> registerCurrentToken() async {
    if (kIsWeb) return; // Web push needs a service worker + VAPID key — out of scope here.
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _send(token);

      // A token can rotate at any time (reinstall, app data cleared, FCM's own housekeeping) —
      // re-register automatically whenever that happens rather than silently going dark.
      FirebaseMessaging.instance.onTokenRefresh.listen(_send);
    } catch (e) {
      debugPrint('Push registration skipped: $e');
    }
  }

  Future<void> _send(String token) async {
    try {
      await _api.post<dynamic>(
        '/device-token',
        body: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
      );
      _registeredToken = token;
    } catch (e) {
      debugPrint('Failed to register device token: $e');
    }
  }

  /// Call right before clearing the session (logout) — stops this device from receiving this
  /// account's pushes the moment they sign out, rather than until FCM itself notices the app is
  /// gone. Best-effort: a failure here must never block logout.
  Future<void> unregister() async {
    if (kIsWeb || _registeredToken == null) return;
    final token = _registeredToken;
    _registeredToken = null;
    try {
      await _api.delete<dynamic>('/device-token', body: {'token': token});
    } catch (e) {
      debugPrint('Failed to unregister device token: $e');
    }
  }
}
