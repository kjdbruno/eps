import 'package:flutter/material.dart';

/// Lightweight replacement for the web client's `$q.notify` / SweetAlert toasts: a
/// rounded floating card with an icon, green for good news and red for a problem.
void showSnack(
  BuildContext context,
  String message, {
  bool error = false,
}) =>
    snackOn(ScaffoldMessenger.of(context), message, error: error);

/// Same toast on a [ScaffoldMessengerState] you kept earlier — for a message that has to appear
/// after the sheet it was raised in has closed (the sheet's own context is gone by then).
void snackOn(
  ScaffoldMessengerState messenger,
  String message, {
  bool error = false,
}) {
  messenger
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        backgroundColor:
            error ? const Color(0xFFC41E3A) : const Color(0xFF0D6D4D),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Row(
          children: [
            Icon(
              error
                  ? Icons.error_outline_rounded
                  : Icons.check_circle_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
}
