# ePS Mobile (Flutter)

Citizen-facing mobile app for the **Community Engagement Platform / eParticipation System**.
It is the mobile counterpart of `eps-www-quasar-external` and talks to the same
`eps-api-express-js` backend (REST under `/api` + a Socket.IO channel).

## What's here

This folder contains the Dart source (`lib/`) and configuration. The platform
folders (`android/`, `ios/`, …) and generated files are **not** committed — generate
them once after installing Flutter (see below).

Feature parity with the external web client:

| Area | Screens |
|---|---|
| Auth | landing, register, verify email (OTP), sign in |
| Complaints (guest) | file complaint, verify complaint OTP, track by reference + code |
| Complaints (account) | my complaints, complaint detail + follow-up + rate response, claim |
| Discussions | list, thread, comment (guest name or signed-in) |
| Polls | list, vote, results |
| Realtime | socket auth + `force_logout` + notification count |
| Push notifications | FCM — see "Firebase / push notifications" below |

## Prerequisites

1. Install the Flutter SDK (stable, Dart >= 3.5): <https://docs.flutter.dev/get-started/install>
   On Windows, add `flutter\bin` to `PATH`, then `flutter doctor`.
2. Android Studio (SDK + an emulator) and/or Xcode for iOS.

## First-time setup

From this directory:

```bash
flutter create . --project-name eps_mobile --org ph.gov.sanfernandocity --platforms=android,ios,web
flutter pub get
dart run flutter_native_splash:create   # regenerates the OS launch screen
```

`flutter create .` fills in the native projects without touching `lib/` or `pubspec.yaml`.
The native splash config lives in `pubspec.yaml` (`flutter_native_splash:`) and the mark
is `assets/branding/splash_logo.png`; the in-app splash is
`lib/src/ui/screens/splash_screen.dart`.

## Configuration

All config is passed at build/run time via `--dart-define` (see `lib/src/config/env.dart`):

| key | default | notes |
|---|---|---|
| `EPS_API_BASE_URL` | `http://10.0.2.2:1000` | Android emulator alias for the host's `localhost`. Use the LAN IP or the deployed URL on a real device. |
| `EPS_API_KEY` | _(the dev key)_ | must equal `API_KEY` in the backend `.env` (`validateApiKey` header `api`). |

Run against a local backend from the Android emulator:

```bash
flutter run --dart-define=EPS_API_BASE_URL=http://10.0.2.2:1000 --dart-define=EPS_API_KEY=REPLACE_WITH_BACKEND_API_KEY
```

Convenience files (gitignored):

- `dart_define.json` — emulator (`http://10.0.2.2:1000`)
- `dart_define.device.json` — physical device (PC's LAN IP, e.g. `http://192.168.4.16:1000`)

```bash
flutter run --dart-define-from-file=dart_define.json          # emulator
flutter run --dart-define-from-file=dart_define.device.json   # USB / wireless phone
```

### Testing on a physical Android phone

1. On the phone: Settings → About phone → tap **Build number** 7× → back → **Developer options** → enable **USB debugging**.
2. Plug into the PC with a data cable; accept the "Allow USB debugging?" prompt (tick "always allow").
3. `flutter devices` should list the phone.
4. Phone + PC on the **same Wi-Fi**; backend running (`npm run dev`).
5. Confirm the LAN IP in `dart_define.device.json` matches `ipconfig` (Wi-Fi IPv4). Update if your network changed.
6. `flutter run --dart-define-from-file=dart_define.device.json`

Cleartext `http://` to the dev backend is enabled for **debug/profile builds only**
(`android/app/src/{debug,profile}/AndroidManifest.xml`). Release builds must use `https://`.

Wireless (Android 11+): Developer options → **Wireless debugging** → *Pair device with pairing code*,
then `adb pair <ip:port>` and `adb connect <ip:port>`, then unplug USB.

## Building a release app

All builds bake in the API config, so always pass a `--dart-define-from-file`.
`dart_define.prod.json` (gitignored) holds the production URL + key — fill in the
real key first.

### 1. Create a signing key (one-time)

```bash
keytool -genkey -v -keystore %USERPROFILE%\eps-upload-keystore.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `android/key.properties` (gitignored):

```properties
storeFile=C:/Users/Administrator/eps-upload-keystore.jks
storePassword=your-store-password
keyAlias=upload
keyPassword=your-key-password
```

`android/app/build.gradle.kts` picks this up automatically; without it, release
builds fall back to debug signing (fine for internal testing, not for the Play Store).

### 2. Build

```bash
# Play Store upload (Android App Bundle)
flutter build appbundle --release --dart-define-from-file=dart_define.prod.json
#   → build/app/outputs/bundle/release/app-release.aab

# Direct install / sideload (APK, split per CPU to keep size down)
flutter build apk --release --split-per-abi --dart-define-from-file=dart_define.prod.json
#   → build/app/outputs/flutter-apk/app-<abi>-release.apk

# Single universal APK (larger, installs anywhere)
flutter build apk --release --dart-define-from-file=dart_define.prod.json
```

Release builds have no cleartext-HTTP exception, so `EPS_API_BASE_URL` must be `https://`.

### iOS

`flutter build ipa --release --dart-define-from-file=dart_define.prod.json` — needs
a Mac with Xcode and an Apple Developer account; open `ios/Runner.xcworkspace` to set
the bundle id and signing team.

## Firebase / push notifications

The in-app notification bell (socket-pushed, `NotificationService`/`SocketService`) works with no
setup. Real **push** notifications — the kind that show up even when the app is closed or
backgrounded — go through **Firebase Cloud Messaging (FCM)** and need a one-time Firebase project.
Without it, everything else still works exactly as before: `main.dart` catches the missing
config and `push_service.dart` is simply never engaged (see `utils/push.js` in the backend for
the same "degrade, don't crash" handling server-side).

1. Create a Firebase project at <https://console.firebase.google.com> (free — the Spark plan
   covers FCM entirely).
2. Add an **Android app**: package name `ph.gov.sanfernandocity.eps_mobile`. Download
   `google-services.json` and put it at `android/app/google-services.json` (gitignored — it's a
   per-project credential, not a secret exactly, but still doesn't belong in git history).
3. Add an **iOS app**: bundle ID `ph.gov.sanfernandocity.epsMobile`. Download
   `GoogleService-Info.plist` and add it to `ios/Runner` **via Xcode** (`ios/Runner.xcworkspace` →
   right-click Runner → Add Files) so it's registered as a build resource — dropping the raw file
   into the folder without doing this through Xcode won't be picked up by the build. iOS push
   additionally needs an APNs authentication key (Apple Developer account → Certificates, IDs &
   Profiles → Keys) uploaded under Firebase Project Settings → Cloud Messaging → Apple app
   configuration — there's no way around that being a manual, Mac + Apple-Developer-account step.
4. Backend: Firebase console → Project Settings → Service Accounts → Generate new private key →
   point the API's `FIREBASE_SERVICE_ACCOUNT_PATH` (or `FIREBASE_SERVICE_ACCOUNT`) at it. See the
   comment block above those two lines in `eps-api-express-js/.env`.
5. `flutter pub get`, then run normally — `android/app/build.gradle.kts` only applies the
   `google-services` Gradle plugin when it finds `google-services.json`, so Android build/run
   works before step 2 too, just without push.

Once all of that's in place: signing in registers this device's FCM token
(`POST /device-token`); every notification the backend already creates (`utils/notifySocket.js`)
pushes to it automatically — no per-notification-type wiring needed. Signing out unregisters it.

## After `flutter create .` — native tweaks

These edits live in the generated folders, so redo them if you regenerate:

**Android** (`android/app/src/main/AndroidManifest.xml`)
- App name: `android:label="ePS"` on `<application>` (Flutter defaults it to `eps_mobile`).
- `android:usesCleartextTraffic="true"` is added to the **debug/profile** manifests
  (`android/app/src/{debug,profile}/AndroidManifest.xml`) so those builds can reach a
  plain-`http` LAN backend; release builds require HTTPS.
- `INTERNET` permission is already included by the Flutter template.
- `android/app/build.gradle.kts`: `ndkVersion` commented out; release signing block reading
  `android/key.properties`; `google-services` plugin applied conditionally (only when
  `google-services.json` is present — see "Firebase / push notifications" above).
- `android/settings.gradle.kts`: `com.google.gms.google-services` added to the `plugins {}` block
  (`apply false` — actually applied in `app/build.gradle.kts`, conditionally).
- `android/gradle.properties`: `kotlin.incremental=false` (cross-drive Pub cache).
- `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` (mandatory location on filing feedback — see
  `file_complaint_screen.dart`) and `POST_NOTIFICATIONS` (push) permissions, plus the default FCM
  notification channel/icon `<meta-data>` — all in `AndroidManifest.xml`.

**iOS** (`ios/Runner/Info.plist`)
- App name: `CFBundleDisplayName` and `CFBundleName` → `ePS`.
- `image_picker` needs `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription`.
- `NSLocationWhenInUseUsageDescription` (mandatory location on filing feedback).
- `UIBackgroundModes: [remote-notification]` (push). `GoogleService-Info.plist` itself has to be
  re-added via Xcode after a regen — see "Firebase / push notifications" above.
- For a plain-`http` dev backend, add an ATS exception for your host.

## Project layout

```
lib/
  main.dart                     app bootstrap + provider wiring
  src/
    config/env.dart             dart-define reader
    config/app_config.dart      derived URLs (apiBaseUrl, socketUrl)
    api/api_client.dart         Dio instance + interceptors (api key, bearer, 401 handling)
    api/api_exception.dart      normalized error type
    realtime/socket_service.dart Socket.IO lifecycle (mirrors boot/socket.js)
    models/                     plain data classes (user, complaint, discussion, poll)
    services/                   one class per backend resource
    state/
      auth_controller.dart      ChangeNotifier — mirrors stores/auth-store.js
      guest_identity.dart       persisted guest token for anonymous poll votes
    router/app_router.dart      GoRouter + auth redirect
    theme/app_theme.dart        brand palette (#204888 primary, #FFC900 secondary)
    ui/
      screens/                  one file per screen
      widgets/                  shared building blocks
```

## Notes on the backend contract

- Every request sends header `api: <EPS_API_KEY>`; authenticated requests add
  `Authorization: Bearer <jwt>` (JWT lifetime is 4h — a 401 clears auth and bounces to landing).
- Guest complaint filing is a two-step OTP flow: `POST /complaint/otp/send` (multipart)
  then `POST /complaint/otp/validate` with the 6-digit code → reference number.
- Signed-in filing skips OTP: `POST /complaint/account` (multipart).
- Poll votes for guests are de-duplicated by a client-generated `guestToken` (persisted).
- Push: `POST /device-token` registers this device's FCM token on login (`{ token, platform }`);
  `DELETE /device-token` (`{ token }`) unregisters it on logout. See "Firebase / push
  notifications" above.
