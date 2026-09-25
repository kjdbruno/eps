import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/poll.dart';
import '../../services/poll_service.dart';
import '../../state/auth_controller.dart';
import '../../state/guest_identity.dart';
import '../widgets/async_view.dart';
import '../widgets/sign_in_prompt.dart';
import '../widgets/status_chip.dart';

class PollVoteScreen extends StatefulWidget {
  const PollVoteScreen({super.key, required this.id});
  final int id;

  @override
  State<PollVoteScreen> createState() => _PollVoteScreenState();
}

class _PollVoteScreenState extends State<PollVoteScreen> {
  int? _selected;
  bool _voting = false;
  late Future<Poll> _future;

  String get _guestToken => context.read<GuestIdentity>().token;

  @override
  void initState() {
    super.initState();
    _future = context.read<PollService>().get(widget.id, _guestToken);
  }

  Future<void> _vote() async {
    if (_selected == null) return;
    setState(() => _voting = true);
    try {
      final updated = await context.read<PollService>().vote(
            widget.id,
            optionId: _selected!,
            guestToken: _guestToken,
          );
      setState(() => _future = Future.value(updated));
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _voting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Poll')),
      body: AsyncView<Poll>(
        future: _future,
        onRetry: () => setState(() {
          _future = context.read<PollService>().get(widget.id, _guestToken);
        }),
        builder: (context, poll) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  StatusChip(poll.status),
                  const Spacer(),
                  Text(
                    '${poll.totalVotes} vote(s)',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                poll.question,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              if (!poll.showResults)
                ..._participation(poll)
              else
                ..._results(poll),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _participation(Poll poll) {
    if (!context.watch<AuthController>().isAuthenticated) {
      return const [
        SignInPrompt(message: 'Sign in to cast your vote and see the results.'),
      ];
    }
    return [
      RadioGroup<int>(
        groupValue: _selected,
        onChanged: (v) => setState(() => _selected = v),
        child: Column(
          children: [
            for (final o in poll.options)
              RadioListTile<int>(
                contentPadding: EdgeInsets.zero,
                value: o.id,
                title: Text(o.label),
              ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: (_selected == null || _voting) ? null : _vote,
        child: _voting
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text('Submit vote'),
      ),
    ];
  }

  List<Widget> _results(Poll poll) {
    return [
      for (final o in poll.options)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      o.label,
                      style: TextStyle(
                        fontWeight: o.id == poll.myOptionId
                            ? FontWeight.bold
                            : FontWeight.normal,
                        color: o.id == poll.myOptionId
                            ? Theme.of(context).colorScheme.primary
                            : null,
                      ),
                    ),
                  ),
                  Text(
                    '${o.votes} (${o.percent.toStringAsFixed(0)}%)',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: (o.percent / 100).clamp(0, 1),
                  minHeight: 10,
                  backgroundColor: Colors.grey.shade200,
                ),
              ),
            ],
          ),
        ),
      if (poll.hasVoted)
        Text(
          'Thanks for voting!',
          style: TextStyle(color: Colors.grey.shade600),
        ),
    ];
  }
}
