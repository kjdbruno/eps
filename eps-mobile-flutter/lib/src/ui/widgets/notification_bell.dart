import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/app_notification.dart';
import '../../services/complaint_service.dart';
import '../../services/notification_service.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../screens/complaint_detail_screen.dart';
import 'app_snack.dart';
import 'eps_ui.dart';
import 'format.dart';
import 'eps_loader.dart';

/// App-bar bell + unread badge. Tapping opens the notifications tray and marks
/// everything seen. The badge is live over the socket; the tray list comes from
/// `GET /notification` (read + unread) so items stay visible after you've read
/// them — the socket only ever pushes the *unread* set.
class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key, this.iconColor});

  /// Override the bell's colour (e.g. white on a dark button).
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final count =
        context.select<AuthController, int>((a) => a.notificationCount);
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: Icon(Icons.notifications_outlined, color: iconColor),
          tooltip: 'Notifications',
          onPressed: () => _open(context),
        ),
        // something new: a dot on the icon's top-right corner — no number
        if (count > 0)
          Positioned(
            right: 7,
            top: 7,
            child: IgnorePointer(
              child: Container(
                width: 11,
                height: 11,
                decoration: BoxDecoration(
                  color: const Color(0xFFC10015),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.8),
                ),
              ),
            ),
          ),
      ],
    );
  }

  /// The reference number a notification is about ("... your feedback EPS2026..."), if it names one.
  static final _ref = RegExp(r'EPS[A-Z0-9]{6,}');

  /// Opens the feedback a notification is about, from the account's own list.
  Future<void> _openComplaint(BuildContext context, String ref) async {
    final service = context.read<ComplaintService>();
    try {
      final mine = await service.myComplaints();
      if (!context.mounted) return;
      final match = mine.where((c) => c.referenceNo == ref);
      if (match.isEmpty) {
        showSnack(
          context,
          'That feedback is not in your account.',
          error: true,
        );
        return;
      }
      await showComplaintSheet(context, match.first.id);
    } on ApiException catch (e) {
      if (context.mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _open(BuildContext context) async {
    final auth = context.read<AuthController>();
    final service = context.read<NotificationService>();

    // Snapshot the live (unread) list so there's something to show instantly,
    // before we mark anything read.
    final seed = List<AppNotification>.of(auth.notifications);

    final ref = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      // over the whole app, so the floating navigation bar does not sit on top of the tray
      useRootNavigator: true,
      builder: (_) => _NotificationsSheet(
        seed: seed,
        service: service,
        // Run after the history has loaded, so the list is on screen before the
        // badge clears (marking read makes the socket push back an empty list).
        onSeen: () {
          auth.markNotificationsSeen();
          service.markAllRead().catchError((_) {});
        },
        refOf: (n) => _ref.firstMatch(n.content)?.group(0),
      ),
    );
    // Tapped a notification about a feedback: close the tray, then open that feedback.
    if (ref != null && context.mounted) await _openComplaint(context, ref);
  }
}

class _NotificationsSheet extends StatefulWidget {
  const _NotificationsSheet({
    required this.seed,
    required this.service,
    required this.onSeen,
    required this.refOf,
  });

  final List<AppNotification> seed;
  final NotificationService service;
  final VoidCallback onSeen;

  /// The feedback reference a notification is about, or null if it names none.
  final String? Function(AppNotification n) refOf;

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
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Row(
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  if (_items.any((n) => !n.isRead))
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5EEFC),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        '${_items.where((n) => !n.isRead).length} new',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                ],
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
      return const EpsLoader();
    }
    if (_items.isEmpty) {
      return Center(
        child: EmptyState(
          icon: _failed
              ? Icons.cloud_off_rounded
              : Icons.notifications_off_outlined,
          title: _failed ? 'Could not load' : "You're all caught up",
          text: _failed
              ? 'Pull down to try again.'
              : 'Updates on your feedback will show up here.',
        ),
      );
    }
    return EpsRefresh(
      onRefresh: _load,
      child: ListView.separated(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final n = _items[i];
          final ref = widget.refOf(n);
          return InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: ref == null ? null : () => Navigator.of(context).pop(ref),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: n.isRead ? Colors.white : const Color(0xFFEAF1FF),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: n.isRead ? AppTheme.line : const Color(0xFFCFE0FB),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  IconBox(
                    n.isRead
                        ? Icons.notifications_none_rounded
                        : Icons.notifications_active_rounded,
                    size: 40,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          n.content,
                          style: TextStyle(
                            fontSize: 13.5,
                            height: 1.4,
                            fontWeight:
                                n.isRead ? FontWeight.w500 : FontWeight.w800,
                            color: n.isRead
                                ? const Color(0xFF3A4A68)
                                : AppTheme.ink,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          timeAgo(n.createdAt),
                          style: TextStyle(
                            fontSize: 11.5,
                            color: n.isRead ? AppTheme.mute : AppTheme.primary,
                            fontWeight:
                                n.isRead ? FontWeight.w400 : FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!n.isRead)
                    Container(
                      margin: const EdgeInsets.only(left: 8, top: 14),
                      width: 9,
                      height: 9,
                      decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                    )
                  else if (ref != null)
                    const Padding(
                      padding: EdgeInsets.only(left: 6, top: 12),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: AppTheme.mute,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
