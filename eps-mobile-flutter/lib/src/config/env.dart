/// Compile-time configuration, supplied with `--dart-define` /
/// `--dart-define-from-file=dart_define.json`.
///
/// Mirrors the web client's `VITE_BACKEND_URL` / `VITE_API_KEY` (see
/// `eps-www-quasar-external/.env` and `src/boot/axios.js`).
class Env {
  const Env._();

  /// Backend origin, WITHOUT the trailing `/api`.
  ///
  /// `10.0.2.2` is the Android emulator's alias for the host machine's
  /// `localhost`; override for a physical device or a deployed backend.
  static const String apiBaseUrl = String.fromEnvironment(
    'EPS_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:1000',
  );

  /// Must match `API_KEY` in the backend `.env` — sent as the `api` header on
  /// every request (`AuthMiddleware.validateApiKey`).
  static const String apiKey = String.fromEnvironment(
    'EPS_API_KEY',
    defaultValue:
        '7fcb21ea7e5b4a2dbe30cb18730aeaf5d5e5c7ce45f962376355c1c4f07c8362',
  );
}
