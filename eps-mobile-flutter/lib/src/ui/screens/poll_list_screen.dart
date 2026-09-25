import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/poll.dart';
import '../../services/poll_service.dart';
import '../../state/guest_identity.dart';
import '../../theme/app_theme.dart';
import '../widgets/eps_list_view.dart';
import '../widgets/status_badge.dart';

class PollListScreen extends StatefulWidget {
  const PollListScreen({super.key});

  @override
  State<PollListScreen> createState() => _PollListScreenState();
}

class _PollListScreenState extends State<PollListScreen> {
  final _listKey = GlobalKey<EpsListViewState<Poll>>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Polls')),
      body: EpsListView<Poll>(
        key: _listKey,
        loader: () => context
            .read<PollService>()
            .list(context.read<GuestIdentity>().token),
        noun: 'poll',
        searchHint: 'Search poll question...',
        emptyIcon: Icons.bar_chart_outlined,
        emptyText: 'No polls yet.',
        loadingText: 'Loading polls...',
        matches: (p, q) => p.question.toLowerCase().contains(q),
        rowBuilder: (context, p) => EpsListRow(
          leadingColor: AppTheme.primary,
          leadingIcon: Icons.bar_chart,
          title: p.question,
          subtitle: '${p.totalVotes} vote(s)',
          trailing: [
            StatusBadge(
              p.status,
              color: p.isOpen ? const Color(0xFF2E7D32) : Colors.grey,
            ),
            if (p.hasVoted) const SolidBadge('voted'),
          ],
          onTap: () async {
            await context.push('/polls/${p.id}');
            _listKey.currentState?.reload();
          },
        ),
      ),
    );
  }
}
