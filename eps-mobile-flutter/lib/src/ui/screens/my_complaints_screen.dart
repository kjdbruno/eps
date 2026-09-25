import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/app_snack.dart';
import '../widgets/eps_list_view.dart';
import '../widgets/format.dart';
import '../widgets/status_badge.dart';

class MyComplaintsScreen extends StatefulWidget {
  const MyComplaintsScreen({super.key});

  @override
  State<MyComplaintsScreen> createState() => _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends State<MyComplaintsScreen> {
  final _listKey = GlobalKey<EpsListViewState<Complaint>>();

  void _refresh() => _listKey.currentState?.reload();

  Future<void> _openClaimDialog() async {
    final refCtrl = TextEditingController();
    final otpCtrl = TextEditingController();
    final claimed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Claim feedback'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Filed feedback before signing in? Enter its reference number '
              'and access code to add it to your account.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: refCtrl,
              decoration: const InputDecoration(labelText: 'Reference no.'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: otpCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Access code (OTP)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final msg = await context.read<ComplaintService>().claim(
                      referenceNo: refCtrl.text.trim(),
                      otp: otpCtrl.text.trim(),
                    );
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
                if (mounted) showSnack(context, msg);
              } on ApiException catch (e) {
                if (dialogContext.mounted) {
                  showSnack(dialogContext, e.message, error: true);
                }
              }
            },
            child: const Text('Claim'),
          ),
        ],
      ),
    );
    refCtrl.dispose();
    otpCtrl.dispose();
    if (claimed == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Feedback'),
        actions: [
          IconButton(
            icon: const Icon(Icons.link),
            tooltip: 'Claim feedback',
            onPressed: _openClaimDialog,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/file-complaint');
          _refresh();
        },
        icon: const Icon(Icons.add),
        label: const Text('File'),
      ),
      body: EpsListView<Complaint>(
        key: _listKey,
        loader: () => context.read<ComplaintService>().myComplaints(),
        noun: 'feedback',
        searchHint: 'Search reference no...',
        emptyIcon: Icons.description_outlined,
        emptyText: 'No feedback yet.',
        loadingText: 'Loading feedback...',
        matches: (c, q) => c.referenceNo.toLowerCase().contains(q),
        rowBuilder: (context, c) => EpsListRow(
          leadingColor: AppTheme.statusColor(c.status),
          leadingIcon: Icons.description,
          title: c.referenceNo,
          subtitle: formatDate(c.createdAt),
          trailing: [StatusBadge(c.status)],
          onTap: () async {
            await context.push('/my-complaints/${c.id}');
            _refresh();
          },
        ),
      ),
    );
  }
}
