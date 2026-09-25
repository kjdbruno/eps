import 'env.dart';

/// Derived endpoints. Keep all URL composition here so screens/services never
/// hand-build paths.
class AppConfig {
  const AppConfig._();

  static String get _origin => _trimmed(Env.apiBaseUrl);

  /// REST base — the Express app mounts everything under `/api`.
  static String get apiBaseUrl => '$_origin/api';

  /// Socket.IO connects to the bare origin (see `server.js` / `boot/socket.js`).
  static String get socketUrl => _origin;

  /// Uploaded files (avatars, evidence) are served from `/uploads` on the origin;
  /// the API returns root-relative paths like `/uploads/xxx.jpg`.
  static String resolveAsset(String? pathOrUrl) {
    if (pathOrUrl == null || pathOrUrl.isEmpty) return '';
    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    return '$_origin$pathOrUrl';
  }

  static String _trimmed(String url) =>
      url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
