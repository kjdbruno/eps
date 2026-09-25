import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/discussion.dart';
import '../../services/discussion_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/eps_list_view.dart';
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
    return Scaffold(
      appBar: AppBar(title: const Text('Discussions')),
      body: EpsListView<Discussion>(
        key: _listKey,
        loader: () => context.read<DiscussionService>().list(),
        noun: 'discussion',
        searchHint: 'Search title or description...',
        emptyIcon: Icons.forum_outlined,
        emptyText: 'No discussions yet.',
        loadingText: 'Loading discussions...',
        matches: (d, q) =>
            d.title.toLowerCase().contains(q) ||
            d.description.toLowerCase().contains(q),
        rowBuilder: (context, d) => EpsListRow(
          leadingColor: AppTheme.primary,
          leadingIcon: Icons.chat_bubble_outline,
          title: d.title,
          subtitle: d.description,
          subtitleMaxLines: 2,
          trailing: [
            StatusBadge(
              d.status,
              color: d.isOpen ? const Color(0xFF2E7D32) : Colors.grey,
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.chat_bubble_outline,
                  size: 12,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 3),
                Text(
                  '${d.commentCount}',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ],
          onTap: () async {
            await context.push('/discussions/${d.id}');
            _listKey.currentState?.reload();
          },
        ),
      ),
    );
  }
}
