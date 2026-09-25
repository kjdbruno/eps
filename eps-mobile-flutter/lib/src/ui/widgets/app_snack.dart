import 'package:flutter/material.dart';

/// Lightweight replacement for the web client's `$q.notify` / SweetAlert toasts.
void showSnack(
  BuildContext context,
  String message, {
  bool error = false,
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor:
            error ? Theme.of(context).colorScheme.error : const Color(0xFF2E7D32),
      ),
    );
}
