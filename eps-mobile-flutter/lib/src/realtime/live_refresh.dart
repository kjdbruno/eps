import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import 'socket_service.dart';

/// Keeps a screen current without anyone pulling to refresh: when the server says one of [modules] changed, [refresh]
/// runs (after a short pause, so a burst of changes loads once). Call [cancel] from `dispose`.
///
///   _live = LiveRefresh.listen(context, ['poll'], _refreshQuietly);
///
/// An empty list means any change. A screen with no connection to listen on (a signed-out visitor, or a test) simply
/// never refreshes.
class LiveRefresh {
  LiveRefresh._(this._sub);

  StreamSubscription<String>? _sub;
  Timer? _timer;

  static LiveRefresh listen(
    BuildContext context,
    List<String> modules,
    FutureOr<void> Function() refresh, {
    Duration wait = const Duration(milliseconds: 700),
  }) {
    final SocketService socket;
    try {
      socket = context.read<SocketService>();
    } catch (_) {
      return LiveRefresh._(null);
    }
    final live = LiveRefresh._(null);
    live._sub = socket.changes.listen((module) {
      // '*' means the connection came back: anything may have changed meanwhile
      if (module != '*' && modules.isNotEmpty && !modules.contains(module)) {
        return;
      }
      live._timer?.cancel();
      live._timer = Timer(wait, () {
        try {
          final result = refresh();
          if (result is Future) result.catchError((_) {});
        } catch (_) {}
      });
    });
    return live;
  }

  void cancel() {
    _timer?.cancel();
    _sub?.cancel();
  }
}
