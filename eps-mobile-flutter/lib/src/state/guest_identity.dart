import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// A random id generated once per install and persisted — the mobile equivalent
/// of `src/utils/guestToken.js`. Lets an anonymous user vote on a poll while
/// still blocking a second vote from the same device. Soft guard, not identity.
class GuestIdentity {
  GuestIdentity._(this._token);

  static const _key = 'epsGuestToken';
  final String _token;
  String get token => _token;

  static Future<GuestIdentity> load() async {
    final prefs = await SharedPreferences.getInstance();
    var value = prefs.getString(_key);
    if (value == null || value.isEmpty) {
      value = _uuidV4();
      await prefs.setString(_key, value);
    }
    return GuestIdentity._(value);
  }

  static String _uuidV4() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    String hex(int start, int end) => bytes
        .sublist(start, end)
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }
}
