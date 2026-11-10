import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/claim_dialog.dart';
import 'complaint_detail_screen.dart';
import 'file_complaint_screen.dart';
import '../widgets/complaint_body.dart';
import '../widgets/detail_scaffold.dart';
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
    if (await showClaimSheet(context)) _refresh();
  }

  static const _inProgress = [
    'unverified',
    'verified',
    'pending',
    'unassigned',
    'received',
    'ongoing',
  ];

  @override
  Widget build(BuildContext context) {
    return ListPage(
      heroColors: DetailColors.feedback,
      heroTag: 'My feedback',
      title: 'Feedback',
      subtitle: 'Everything you have filed, and what happened to it.',
      actions: [
        CircleAction(
          icon: Icons.link_rounded,
          label: 'Claim',
          onTap: _openClaimDialog,
        ),
        CircleAction(
          icon: Icons.add_rounded,
          label: 'File',
          filled: true,
          onTap: () async {
            if (await showFileFeedbackSheet(context)) _refresh();
          },
        ),
      ],
      child: EpsListView<Complaint>(
        live: const ['complaint'],
        accent: AppTheme.feedbackColor,
        key: _listKey,
        loader: () => context.read<ComplaintService>().myComplaints(),
        noun: 'feedback',
        searchHint: 'Search by reference number...',
        emptyIcon: Icons.description_outlined,
        emptyText: 'Nothing filed yet',
        loadingText: 'Loading feedback...',
        matches: (c, q) => c.referenceNo.toLowerCase().contains(q),
        filters: [
          EpsFilter<Complaint>('All', (_) => true),
          EpsFilter<Complaint>(
            'In progress',
            (c) => _inProgress.contains(c.status),
          ),
          EpsFilter<Complaint>('Completed', (c) => c.status == 'completed'),
          EpsFilter<Complaint>('Cancelled', (c) => c.status == 'cancelled'),
        ],
        rowBuilder: (context, c) => EpsInfoCard(
          icon: Icons.description_outlined,
          accent: c.status == 'cancelled'
              ? const Color(0xFFC10015)
              : c.status == 'completed'
                  ? const Color(0xFFD99A00)
                  : AppTheme.feedbackDeep,
          title: c.referenceNo,
          caption:
              c.content.isEmpty ? 'Feedback' : c.content.replaceAll('\n', ' '),
          badge: StatusBadge(c.status),
          facts: [
            ('Filed', shortDate(c.createdAt)),
            ('Offices', c.offices.isEmpty ? 'Not yet' : '${c.offices.length}'),
            ('Progress', '${(complaintProgress(c.status) * 100).round()}%'),
          ],
          progress: complaintProgress(c.status),
          footer: c.offices.isEmpty
              ? 'Waiting to be routed'
              : 'With ${c.offices.first.label}',
          onTap: () async {
            await showComplaintSheet(context, c.id);
            _refresh();
          },
        ),
      ),
    );
  }
}
