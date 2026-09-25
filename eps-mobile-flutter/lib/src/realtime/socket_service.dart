import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';
import '../models/app_notification.dart';

/// Socket.IO lifecycle, mirroring `src/boot/socket.js`:
///  - connect only while authenticated, `emit('authenticate' | 'register', { token })`
///  - server pushes `loadNotifications(count, list)` to the user's own sockets
///  - server pushes `force_logout` when the JWT dies — we surface that as a callback
class SocketService {
  io.Socket? _socket;

  void Function(int count, List<AppNotification> items)? onNotifications;
  void Function(String reason)? onForceLogout;

  bool get isConnected => _socket?.connected ?? false;

  void connect(String token) {
    disconnect();

    final socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    socket.onConnect((_) {
      socket.emit('authenticate', {'token': token});
      socket.emit('register', {'token': token});
    });

    socket.on('loadNotifications', (data) {
      // Server emits `emit('loadNotifications', count, list)` — the Dart client
      // delivers a multi-arg emit as a List.
      int count = 0;
      List<AppNotification> items = const [];
      if (data is List) {
        if (data.isNotEmpty) count = _asInt(data[0]);
        if (data.length > 1 && data[1] is List) {
          items = (data[1] as List)
              .whereType<Map>()
              .map((m) => AppNotification.fromJson(m.cast<String, dynamic>()))
              .toList();
        }
      } else {
        count = _asInt(data);
      }
      onNotifications?.call(count, items);
    });

    socket.on('force_logout', (data) {
      final reason =
          data is Map ? (data['reason']?.toString() ?? 'unknown') : 'unknown';
      onForceLogout?.call(reason);
    });

    socket.connect();
    _socket = socket;
  }

  void markNotificationsRead(int userId) {
    _socket?.emit('readNotification', {'id': userId});
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  static int _asInt(Object? v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse('$v') ?? 0;
  }
}
