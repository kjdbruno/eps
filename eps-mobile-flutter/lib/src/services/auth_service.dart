import '../api/api_client.dart';
import '../models/json_utils.dart';
import '../models/user.dart';

class AuthResult {
  AuthResult({required this.user, required this.token});
  final AppUser user;
  final String token;
}

/// Wraps the `/api/citizen/*` and `/api/logout` endpoints. Mirrors the actions
/// in `stores/auth-store.js`.
class AuthService {
  AuthService(this._api);
  final ApiClient _api;

  /// `POST /citizen/register` → `{ message }` (201). An OTP is emailed; the
  /// caller should then send the user to the verify-email screen.
  Future<String> register({
    required String firstname,
    required String lastname,
    required String email,
    required String phoneNo,
    required String password,
  }) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/register',
      body: {
        'firstname': firstname,
        'lastname': lastname,
        'email': email,
        'phoneNo': phoneNo,
        'password': password,
      },
    );
    return asString(res.data?['message'], fallback: 'Registration successful.');
  }

  /// `POST /citizen/verify` → `{ user, token }` — the account is now signed in.
  Future<AuthResult> verifyEmail(String email, String code) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/verify',
      body: {'email': email, 'code': code},
    );
    return _parse(res.data);
  }

  /// `POST /citizen/resend` → `{ message }`.
  Future<String> resendVerification(String email) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/resend',
      body: {'email': email},
    );
    return asString(res.data?['message'], fallback: 'Verification code resent.');
  }

  // ---- password reset (3 steps, mirrors ForgotPasswordPage.vue) -------------

  /// Step 1 — `POST /citizen/forgot-password`. Enumeration-safe: the response is
  /// the same whether or not the email is registered.
  Future<String> forgotPassword(String email) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/forgot-password',
      body: {'email': email},
    );
    return asString(
      res.data?['message'],
      fallback: 'If that email is registered, a reset code has been sent.',
    );
  }

  /// Step 2 — `POST /citizen/verify-reset-code`. Checks the 6-digit code without
  /// consuming it, so a wrong/expired code is caught before asking for a new
  /// password. Throws [ApiException] on an invalid code.
  Future<void> verifyResetCode(String email, String code) async {
    await _api.post<dynamic>(
      '/citizen/verify-reset-code',
      body: {'email': email, 'code': code},
    );
  }

  /// Step 3 — `POST /citizen/reset-password`. Does NOT sign the user in; they log
  /// in again with the new password (and are signed out everywhere else).
  Future<String> resetPassword(
    String email,
    String code,
    String newPassword,
  ) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/reset-password',
      body: {'email': email, 'code': code, 'newPassword': newPassword},
    );
    return asString(
      res.data?['message'],
      fallback: 'Password reset. Please sign in with your new password.',
    );
  }

  /// `POST /citizen/login` → `{ user, token }`.
  ///
  /// A 403 with `notVerified: true` surfaces as an [ApiException] whose
  /// `notVerified` getter is true — the caller routes to verify-email.
  Future<AuthResult> login(String email, String password) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/citizen/login',
      body: {'email': email, 'password': password},
    );
    return _parse(res.data);
  }

  /// Best-effort server logout — the client clears its own state regardless.
  Future<void> logout() async {
    try {
      await _api.post<dynamic>('/logout');
    } catch (_) {
      // ignored — token may already be dead
    }
  }

  AuthResult _parse(Map<String, dynamic>? data) {
    final map = asMap(data);
    return AuthResult(
      user: AppUser.fromJson(asMap(map['user'])),
      token: asString(map['token']),
    );
  }
}
