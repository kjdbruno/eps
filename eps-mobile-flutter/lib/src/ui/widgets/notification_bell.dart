import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/app_notification.dart';
import '../../services/notification_service.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import 'format.dart';

/// App-bar bell + unread badge. Tapping opens the notifications tray and marks
/// everything seen. The badge is live over the socket; the tray list comes from
/// `GET /notification` (read + unread) so items stay visible after you've read
/// them — the socket only ever pushes the *unread* set.
class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context) {
    final count = context.select<AuthController, int>((a) => a.notificationCount);
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          tooltip: 'Notifications',
          onPressed: () => _open(context),
        ),
        if (count > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                count > 9 ? '9+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ),
          ),
      ],
    );
  }

  void _open(BuildContext context) {
    final auth = context.read<AuthController>();
    final service = context.read<NotificationService>();

    // Snapshot the live (unread) list so there's something to show instantly,
    // before we mark anything read.
    final seed = List<AppNotification>.of(auth.notifications);

    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => _NotificationsSheet(
        seed: seed,
        service: service,
        // Run after the history has loaded, so the list is on screen before the
        // badge clears (marking read makes the socket push back an empty list).
        onSeen: () {
          auth.markNotificationsSeen();
          service.markAllRead().catchError((_) {});
        },
      ),
    );
  }
}

class _NotificationsSheet extends StatefulWidget {
  const _NotificationsSheet({
    required this.seed,
    required this.service,
    required this.onSeen,
  });

  final List<AppNotification> seed;
  final NotificationService service;
  final VoidCallback onSeen;

  @override
  State<_NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<_NotificationsSheet> {
  late List<AppNotification> _items = widget.seed;
  bool _loading = true;
  bool _failed = false;
  bool _seenFired = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final history = await widget.service.list();
      if (!mounted) return;
      setState(() {
        _items = history;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      // Keep the socket seed on screen if the fetch fails.
      setState(() {
        _loading = false;
        _failed = _items.isEmpty;
      });
    } finally {
      if (!_seenFired) {
        _seenFired = true;
        widget.onSeen();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (context, controller) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Text(
                'Notifications',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(height: 1),
            Expanded(child: _body(controller)),
          ],
        );
      },
    );
  }

  Widget _body(ScrollController controller) {
    if (_items.isEmpty && _loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _failed
                ? "Couldn't load notifications. Pull to try again."
                : "You're all caught up.",
            style: const TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        controller: controller,
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, i) {
          final n = _items[i];
          return ListTile(
            leading: Icon(
              n.isRead
                  ? Icons.notifications_none
                  : Icons.notifications_active,
              color: n.isRead ? Colors.grey : AppTheme.primary,
            ),
            title: Text(n.content),
            subtitle: Text(timeAgo(n.createdAt)),
          );
        },
      ),
    );
  }
}
