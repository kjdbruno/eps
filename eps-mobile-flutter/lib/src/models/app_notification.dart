import 'json_utils.dart';

/// A row from the backend `Notification` table, delivered over the socket as
/// `loadNotifications(count, list)` (see `utils/notifySocket.js`).
class AppNotification {
  AppNotification({
    required this.id,
    required this.content,
    required this.isRead,
    required this.createdAt,
  });

  final int id;
  final String content;
  final bool isRead;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: asInt(json['id']),
        content: asString(json['content']),
        isRead: asBool(json['isRead']),
        createdAt: asDate(json['createdAt']),
      );
}
