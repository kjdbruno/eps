import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.statusSoft(status),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: AppTheme.statusColor(status),
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}
