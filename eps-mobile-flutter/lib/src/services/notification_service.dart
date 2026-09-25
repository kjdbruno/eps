import '../api/api_client.dart';
import '../models/app_notification.dart';
import '../models/json_utils.dart';

class NotificationService {
  NotificationService(this._api);
  final ApiClient _api;

  /// `GET /notification` — recent notifications (read + unread), newest first.
  /// The socket only pushes unread ones, so this is what the tray reads so seen
  /// items stay visible.
  Future<List<AppNotification>> list({int limit = 30}) async {
    final res = await _api.get<Map<String, dynamic>>(
      '/notification',
      query: {'limit': limit},
    );
    return asMapList(res.data?['data'])
        .map(AppNotification.fromJson)
        .toList();
  }

  /// `POST /notification/read` — mark all as read (HTTP fallback for the socket
  /// `readNotification` emit).
  Future<void> markAllRead() async {
    await _api.post<dynamic>('/notification/read');
  }
}
