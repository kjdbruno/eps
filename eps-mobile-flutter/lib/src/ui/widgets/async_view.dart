import 'package:flutter/material.dart';

import '../../api/api_exception.dart';
import 'eps_ui.dart';
import 'eps_loader.dart';

/// Standard loading / error / retry wrapper around a one-shot [Future].
/// Pair with a `Key` bump or a rebuilt future to refresh.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.future,
    required this.builder,
    this.onRetry,
  });

  final Future<T> future;
  final Widget Function(BuildContext context, T data) builder;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const EpsLoader();
        }
        if (snap.hasError) {
          final err = snap.error;
          final message =
              err is ApiException ? err.message : 'Something went wrong.';
          return _ErrorState(message: message, onRetry: onRetry);
        }
        return builder(context, snap.data as T);
      },
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: EmptyState(
        icon: Icons.cloud_off_rounded,
        title: 'Could not load',
        text: message,
        action: onRetry == null
            ? null
            : OutlinedButton(
                style:
                    OutlinedButton.styleFrom(minimumSize: const Size(140, 46)),
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
      ),
    );
  }
}
