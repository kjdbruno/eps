import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../models/app_notification.dart';
import '../models/user.dart';
import '../realtime/socket_service.dart';
import '../services/auth_service.dart';
import '../services/push_service.dart';

/// App-wide auth + session state. Maps to `stores/auth-store.js`:
/// `token` / `user` / `isAuthenticated`, with the socket connecting/disconnecting
/// as that state flips.
///
/// "Remember me" governs whether the session survives an app restart: when on
/// (the default), the token goes to the keystore and the profile to prefs so
/// `bootstrap()` can restore it; when off, both live only in memory for this run.
class AuthController extends ChangeNotifier {
  AuthController({
    required ApiClient api,
    required AuthService authService,
    required SocketService socket,
    PushService? push,
  })  : _api = api,
        _auth = authService,
        _socket = socket,
        _push = push {
    _api.tokenProvider = () => _token;
    _api.onUnauthorized = _onUnauthorized;
    _api.onPasswordChangeRequired = _onPasswordChangeRequired;
    _socket.onForceLogout = _handleForceLogout;
    _socket.onNotifications = _setNotifications;
  }

  void _handleForceLogout(String reason) => _onUnauthorized();

  static const _tokenKey = 'token';
  static const _userKey = 'user';
  static const _rememberKey = 'remember_me';
  static const _lastEmailKey = 'last_email';

  final ApiClient _api;
  final AuthService _auth;
  final SocketService _socket;
  // Nullable (and optional in the constructor) so this class stays testable without a real
  // Firebase app behind it — push registration is just skipped when absent.
  final PushService? _push;
  final _secure = const FlutterSecureStorage();

  bool _ready = false;
  String? _token;
  AppUser? _user;
  bool _rememberMe = true;
  String _lastEmail = '';
  int _notificationCount = 0;
  List<AppNotification> _notifications = const [];

  /// Persisted session has been read — the router can stop showing a splash.
  bool get isReady => _ready;
  bool get isAuthenticated => _token != null && _user != null;
  AppUser? get user => _user;

  /// Last state of the "Remember me" checkbox, and the email to pre-fill.
  bool get rememberMe => _rememberMe;
  String get lastEmail => _lastEmail;

  /// Unread count, pushed live over the socket while signed in.
  int get notificationCount => _notificationCount;
  List<AppNotification> get notifications => _notifications;

  /// Restore a persisted session (if "Remember me" was on) on launch. The splash stays up for at
  /// least [minSplash], so the loader is seen even when the session is read instantly.
  Future<void> bootstrap({Duration minSplash = Duration.zero}) async {
    final started = Stopwatch()..start();
    try {
      final prefs = await SharedPreferences.getInstance();
      _rememberMe = prefs.getBool(_rememberKey) ?? true;
      _lastEmail = prefs.getString(_lastEmailKey) ?? '';

      _token = await _secure.read(key: _tokenKey);
      final rawUser = prefs.getString(_userKey);
      if (rawUser != null) {
        _user = AppUser.fromJson(jsonDecode(rawUser) as Map<String, dynamic>);
      }
    } catch (_) {
      _token = null;
      _user = null;
    }
    if (isAuthenticated) {
      _socket.connect(_token!);
      unawaited(_push?.registerCurrentToken());
    }
    final remaining = minSplash - started.elapsed;
    if (remaining > Duration.zero) await Future<void>.delayed(remaining);
    _ready = true;
    notifyListeners();
  }

  Future<void> login(
    String email,
    String password, {
    bool remember = true,
  }) async {
    final result = await _auth.login(email, password);
    await _persistSession(result.user, result.token, remember, email);
  }

  Future<String> register({
    required String firstname,
    required String lastname,
    required String email,
    required String phoneNo,
    required String password,
  }) =>
      _auth.register(
        firstname: firstname,
        lastname: lastname,
        email: email,
        phoneNo: phoneNo,
        password: password,
      );

  Future<void> verifyEmail(String email, String code) async {
    final result = await _auth.verifyEmail(email, code);
    // A freshly created / verified account stays signed in across restarts.
    await _persistSession(result.user, result.token, true, email);
  }

  /// First login of an account with a temporary password: choose its own. On success the router
  /// lets the account on to the app.
  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _auth.changePassword(currentPassword, newPassword);
    await _setMustChangePassword(false);
  }

  Future<String> resendVerification(String email) =>
      _auth.resendVerification(email);

  Future<String> forgotPassword(String email) => _auth.forgotPassword(email);

  Future<void> verifyResetCode(String email, String code) =>
      _auth.verifyResetCode(email, code);

  Future<String> resetPassword(String email, String code, String newPassword) =>
      _auth.resetPassword(email, code, newPassword);

  Future<void> logout() async {
    // Before the token that authenticates it goes away — DELETE /device-token needs it.
    await _push?.unregister();
    await _auth.logout();
    await _clearSession();
  }

  /// Persist the checkbox state so it survives to the next login screen.
  Future<void> setRememberMe(bool value) async {
    if (value == _rememberMe) return;
    _rememberMe = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_rememberKey, value);
  }

  /// Call when the user opens the notifications sheet — tells the server to mark
  /// this user's notifications read; the next `loadNotifications` push confirms 0.
  void markNotificationsSeen() {
    final id = _user?.id;
    if (id != null) _socket.markNotificationsRead(id);
    if (_notificationCount != 0) {
      _notificationCount = 0;
      notifyListeners();
    }
  }

  // ---- internals -----------------------------------------------------------

  Future<void> _persistSession(
    AppUser user,
    String token,
    bool remember,
    String email,
  ) async {
    _token = token;
    _user = user;
    _rememberMe = remember;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_rememberKey, remember);

    if (remember) {
      _lastEmail = email;
      await _secure.write(key: _tokenKey, value: token);
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      await prefs.setString(_lastEmailKey, email);
    } else {
      // Session-only: make sure no earlier "remembered" session lingers on disk.
      _lastEmail = '';
      await _secure.delete(key: _tokenKey);
      await prefs.remove(_userKey);
      await prefs.remove(_lastEmailKey);
    }

    _socket.connect(token);
    unawaited(_push?.registerCurrentToken());
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _token = null;
    _user = null;
    _notificationCount = 0;
    _notifications = const [];
    _socket.disconnect();
    await _secure.delete(key: _tokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    notifyListeners();
  }

  /// Keeps the flag on the persisted profile too (only when the session is remembered).
  Future<void> _setMustChangePassword(bool value) async {
    final user = _user;
    if (user == null || user.mustChangePassword == value) return;
    _user = user.withPasswordChanged(value);
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_userKey)) {
      await prefs.setString(_userKey, jsonEncode(_user!.toJson()));
    }
    notifyListeners();
  }

  void _onPasswordChangeRequired() {
    if (isAuthenticated) unawaited(_setMustChangePassword(true));
  }

  void _onUnauthorized() {
    if (!isAuthenticated) return;
    _clearSession();
  }

  void _setNotifications(int count, List<AppNotification> items) {
    _notificationCount = count;
    _notifications = items;
    notifyListeners();
  }
}
