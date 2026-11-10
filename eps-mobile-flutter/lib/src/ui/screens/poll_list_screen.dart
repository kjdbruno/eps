import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/poll.dart';
import '../../services/poll_service.dart';
import '../../state/guest_identity.dart';
import '../../theme/app_theme.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/eps_list_view.dart';
import 'poll_vote_screen.dart';
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
    return ListPage(
      heroColors: DetailColors.poll,
      heroTag: 'Have your say',
      title: 'Surveys',
      subtitle: 'Questions the City is asking, on decisions it is weighing.',
      child: EpsListView<Poll>(
        live: const ['poll'],
        key: _listKey,
        accent: AppTheme.surveyColor,
        loader: () => context
            .read<PollService>()
            .list(context.read<GuestIdentity>().token),
        noun: 'survey',
        searchHint: 'Search surveys...',
        emptyIcon: Icons.bar_chart_outlined,
        emptyText: 'No surveys yet',
        loadingText: 'Loading surveys...',
        matches: (p, q) => p.question.toLowerCase().contains(q),
        filters: [
          EpsFilter<Poll>('All', (_) => true),
          EpsFilter<Poll>('Open', (p) => p.isOpen),
          EpsFilter<Poll>('Closed', (p) => !p.isOpen),
        ],
        rowBuilder: (context, p) => EpsInfoCard(
          icon: Icons.bar_chart_rounded,
          accent: p.isOpen ? AppTheme.surveyDeep : AppTheme.mute,
          title: p.question,
          caption: 'Survey',
          badge:
              p.hasVoted ? const SolidBadge('answered') : StatusBadge(p.status),
          facts: [
            ('Responses', '${p.totalVotes}'),
            ('Questions', '${p.questions.length}'),
            ('You', p.hasVoted ? 'Answered' : 'Not yet'),
          ],
          footer: p.isOpen
              ? (p.hasVoted ? 'See how it is going' : 'Tap to answer')
              : 'Closed — see the results',
          onTap: () async {
            await showPollSheet(context, p.id);
            _listKey.currentState?.reload();
          },
        ),
      ),
    );
  }
}
