import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/discussion.dart';
import '../../models/user.dart';
import '../../services/discussion_service.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/format.dart';
import '../widgets/sign_in_prompt.dart';
import '../widgets/eps_ui.dart';
import '../widgets/status_chip.dart';
import '../widgets/eps_loader.dart';

class DiscussionThreadScreen extends StatefulWidget {
  const DiscussionThreadScreen({
    super.key,
    required this.id,
    this.scrollController,
  });

  /// Set when the discussion is shown in a slide-up sheet.
  final ScrollController? scrollController;
  final int id;

  @override
  State<DiscussionThreadScreen> createState() => _DiscussionThreadScreenState();
}

class _DiscussionThreadScreenState extends State<DiscussionThreadScreen> {
  final _comment = TextEditingController();
  bool _posting = false;
  String? _error;
  late Future<Discussion> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<DiscussionService>().get(widget.id);
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  void _reloadThread() => setState(() {
        _future = context.read<DiscussionService>().get(widget.id);
      });

  Future<void> _post() async {
    final text = _comment.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _posting = true;
      _error = null;
    });
    try {
      await context.read<DiscussionService>().comment(widget.id, content: text);
      if (!mounted) return;
      _comment.clear();
      // load the thread again (the old one stays on screen meanwhile), then show the new comment
      final fresh = context.read<DiscussionService>().get(widget.id);
      setState(() {
        _future = fresh;
      });
      await fresh;
      _scrollToEnd();
    } on ApiException catch (e) {
      if (!mounted) return;
      // shown above the comment box: a toast would sit behind the sheet
      setState(() => _error = e.message);
      // closed meanwhile (400) or no longer yours (403): load it again so it shows how it stands
      if (e.statusCode == 400 || e.statusCode == 403) _reloadThread();
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not post your comment. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  /// After the thread has been rebuilt with the new comment, bring the end of it into view.
  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final c = widget.scrollController;
      if (c == null || !c.hasClients) return;
      c.animateTo(
        c.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final isAuthed = context.watch<AuthController>().isAuthenticated;
    return DetailLoader<Discussion>(
      future: _future,
      colors: DetailColors.discussion,
      scrollController: widget.scrollController,
      icon: Icons.forum_rounded,
      onRetry: _reloadThread,
      builder: (context, d) => DetailScaffold(
        colors: DetailColors.discussion,
        scrollController: widget.scrollController,
        icon: Icons.forum_rounded,
        tag: 'Public discussion',
        onRefresh: () async => _reloadThread(),
        bottomBar: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppTheme.line)),
          ),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          child: SafeArea(
            top: false,
            child: !d.isOpen
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F2F5),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'This discussion is closed to new comments.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF6B7488), fontSize: 13),
                    ),
                  )
                : !isAuthed
                    ? const SignInPrompt(
                        message: 'Sign in to join this discussion.',
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_error != null) ...[
                            ErrorBox(_error!),
                            const SizedBox(height: 8),
                          ],
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _comment,
                                  minLines: 1,
                                  maxLines: 4,
                                  textCapitalization:
                                      TextCapitalization.sentences,
                                  decoration: InputDecoration(
                                    hintText: 'Share your thoughts...',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(28),
                                      borderSide: const BorderSide(
                                        color: AppTheme.field,
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(28),
                                      borderSide: const BorderSide(
                                        color: AppTheme.field,
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(28),
                                      borderSide: const BorderSide(
                                        color: AppTheme.primary,
                                        width: 1.5,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filled(
                                onPressed: _posting ? null : _post,
                                icon: _posting
                                    ? const DotsSpinner(color: Colors.white)
                                    : const Icon(Icons.send_rounded, size: 20),
                              ),
                            ],
                          ),
                        ],
                      ),
          ),
        ),
        children: [
          SheetHead(
            title: d.title,
            chip: StatusChip(d.status),
            facts: [
              (Icons.schedule, 'Opened ${timeAgo(d.createdAt)}'),
              (
                Icons.chat_bubble_outline,
                '${d.comments.length} comment${d.comments.length == 1 ? '' : 's'}'
              ),
            ],
          ),
          if (d.description.trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            ReadMore(d.description),
          ],
          SheetSection('Conversation', trailing: '${d.comments.length}'),
          if (d.comments.isEmpty)
            const EmptyState(
              icon: Icons.forum_outlined,
              title: 'No comments yet',
              text: 'Be the first to share a thought or suggestion.',
            )
          else
            for (final c in d.comments) _CommentTile(c),
        ],
      ),
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile(this.comment);
  final DiscussionComment comment;

  static const _tones = [
    Color(0xFF204888),
    Color(0xFF1C6B35),
    Color(0xFF8A5B00),
    Color(0xFF6A3FA0),
    Color(0xFFA52E22),
    Color(0xFF0F7C8C),
  ];

  @override
  Widget build(BuildContext context) {
    final name = titleCase(comment.authorName);
    final initials = name
        .split(RegExp(r'\s+'))
        .map((p) => p.isEmpty ? '' : p[0])
        .take(2)
        .join()
        .toUpperCase();
    final tone =
        _tones[name.codeUnits.fold<int>(0, (a, b) => a + b) % _tones.length];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 19,
            backgroundColor: tone,
            child: Text(
              initials.isEmpty ? 'A' : initials,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                border: Border.all(color: const Color(0xFFE6ECF5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        timeAgo(comment.createdAt),
                        style:
                            const TextStyle(fontSize: 11, color: AppTheme.mute),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    comment.content,
                    style:
                        const TextStyle(height: 1.5, color: Color(0xFF3A4A68)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Opens a discussion as a slide-up sheet.
Future<void> showDiscussionSheet(BuildContext context, int id) => showEpsSheet(
      context,
      (controller) =>
          DiscussionThreadScreen(id: id, scrollController: controller),
    );
