import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Outlined status pill — the mobile equivalent of the external web client's
/// `<q-badge outline :color="statusColor(...)">`.
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.label, {super.key, this.color});

  final String label;

  /// Override the auto colour (used for "voted" etc.).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppTheme.statusColor(label);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: c),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: c,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

/// Solid variant — matches `<q-badge color="primary">` (e.g. the "voted" marker).
class SolidBadge extends StatelessWidget {
  const SolidBadge(this.label, {super.key, this.color = AppTheme.primary});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
