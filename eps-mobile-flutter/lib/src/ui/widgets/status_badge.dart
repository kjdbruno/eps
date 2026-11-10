import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// A soft status pill — the mobile equivalent of the web portal's `pt-pill pt-st-*`:
/// tinted background, darker text, fully rounded.
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.label, {super.key, this.color});

  final String label;

  /// Override the auto colour (used for "voted" etc.).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppTheme.statusColor(label);
    final bg = color != null
        ? color!.withValues(alpha: 0.13)
        : AppTheme.statusSoft(label);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: c,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

/// Solid variant — the filled marker (e.g. "voted").
class SolidBadge extends StatelessWidget {
  const SolidBadge(this.label, {super.key, this.color = AppTheme.primary});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}
