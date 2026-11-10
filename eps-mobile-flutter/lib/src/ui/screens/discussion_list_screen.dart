import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/discussion.dart';
import '../../services/discussion_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/eps_list_view.dart';
import 'discussion_thread_screen.dart';
import '../widgets/format.dart';
import '../widgets/status_badge.dart';

class DiscussionListScreen extends StatefulWidget {
  const DiscussionListScreen({super.key});

  @override
  State<DiscussionListScreen> createState() => _DiscussionListScreenState();
}

class _DiscussionListScreenState extends State<DiscussionListScreen> {
  final _listKey = GlobalKey<EpsListViewState<Discussion>>();

  @override
  Widget build(BuildContext context) {
    return ListPage(
      heroColors: DetailColors.discussion,
      heroTag: 'Join in',
      title: 'Discussions',
      subtitle: 'Topics the City has opened for public input.',
      child: EpsListView<Discussion>(
        live: const ['discussion'],
        key: _listKey,
        accent: AppTheme.discussionColor,
        loader: () => context.read<DiscussionService>().list(),
        noun: 'discussion',
        searchHint: 'Search title or description...',
        emptyIcon: Icons.forum_outlined,
        emptyText: 'No discussions yet',
        loadingText: 'Loading discussions...',
        matches: (d, q) =>
            d.title.toLowerCase().contains(q) ||
            d.description.toLowerCase().contains(q),
        filters: [
          EpsFilter<Discussion>('All', (_) => true),
          EpsFilter<Discussion>('Open', (d) => d.isOpen),
          EpsFilter<Discussion>('Closed', (d) => !d.isOpen),
        ],
        rowBuilder: (context, d) => EpsInfoCard(
          icon: Icons.chat_bubble_outline_rounded,
          accent: d.isOpen ? AppTheme.discussionColor : AppTheme.mute,
          title: d.title,
          caption: d.description.isEmpty
              ? 'Discussion'
              : d.description.replaceAll('\n', ' '),
          badge: StatusBadge(d.status),
          facts: [
            ('Opened', shortDate(d.createdAt)),
            ('Comments', '${d.commentCount}'),
            ('Status', d.isOpen ? 'Open' : 'Closed'),
          ],
          footer:
              d.isOpen ? 'Tap to read and join in' : 'Closed to new comments',
          onTap: () async {
            await showDiscussionSheet(context, d.id);
            _listKey.currentState?.reload();
          },
        ),
      ),
    );
  }
}
