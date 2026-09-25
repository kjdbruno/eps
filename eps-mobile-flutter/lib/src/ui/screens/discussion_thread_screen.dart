import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/discussion.dart';
import '../../services/discussion_service.dart';
import '../../state/auth_controller.dart';
import '../widgets/async_view.dart';
import '../widgets/format.dart';
import '../widgets/sign_in_prompt.dart';
import '../widgets/status_chip.dart';

class DiscussionThreadScreen extends StatefulWidget {
  const DiscussionThreadScreen({super.key, required this.id});
  final int id;

  @override
  State<DiscussionThreadScreen> createState() => _DiscussionThreadScreenState();
}

class _DiscussionThreadScreenState extends State<DiscussionThreadScreen> {
  final _comment = TextEditingController();
  bool _posting = false;
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
    if (_comment.text.trim().isEmpty) return;
    setState(() => _posting = true);
    try {
      await context.read<DiscussionService>().comment(
            widget.id,
            content: _comment.text.trim(),
          );
      _comment.clear();
      _reloadThread();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthed = context.watch<AuthController>().isAuthenticated;
    return Scaffold(
      appBar: AppBar(title: const Text('Discussion')),
      body: AsyncView<Discussion>(
        future: _future,
        onRetry: _reloadThread,
        builder: (context, d) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  StatusChip(d.status),
                  const Spacer(),
                  Text(
                    timeAgo(d.createdAt),
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                d.title,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                d.description,
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const Divider(height: 32),
              Text(
                '${d.comments.length} comment(s)',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 8),
              if (d.comments.isEmpty)
                const Text('Be the first to comment.')
              else
                for (final c in d.comments) _CommentTile(c),
              const SizedBox(height: 16),
              if (d.isOpen) ...[
                if (!isAuthed)
                  const SignInPrompt(message: 'Sign in to join this discussion.')
                else ...[
                  TextField(
                    controller: _comment,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      hintText: 'Share your thoughts or suggestion...',
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: _posting ? null : _post,
                    child: _posting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Post comment'),
                  ),
                ],
              ] else
                Text(
                  'This discussion is closed to new comments.',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile(this.comment);
  final DiscussionComment comment;

  @override
  Widget build(BuildContext context) {
    final initials = comment.authorName
        .trim()
        .split(RegExp(r'\s+'))
        .map((p) => p.isEmpty ? '' : p[0])
        .take(2)
        .join()
        .toUpperCase();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            child: Text(
              initials.isEmpty ? 'A' : initials,
              style: const TextStyle(fontSize: 12),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  comment.authorName,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  timeAgo(comment.createdAt),
                  style:
                      TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 4),
                Text(comment.content),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
