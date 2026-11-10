import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/poll.dart';
import '../../services/poll_service.dart';
import '../../state/auth_controller.dart';
import '../../state/guest_identity.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/sign_in_prompt.dart';
import '../../theme/app_theme.dart';
import '../widgets/eps_ui.dart';
import '../widgets/status_badge.dart';
import '../widgets/status_chip.dart';
import '../widgets/eps_loader.dart';

/// A survey: read the questions, answer them (short answer, paragraph, multiple choice, checkboxes), and see
/// the results once you have answered.
class PollVoteScreen extends StatefulWidget {
  const PollVoteScreen({
    super.key,
    required this.id,
    this.scrollController,
  });

  /// Set when the survey is shown in a slide-up sheet.
  final ScrollController? scrollController;
  final int id;

  @override
  State<PollVoteScreen> createState() => _PollVoteScreenState();
}

class _PollVoteScreenState extends State<PollVoteScreen> {
  // what is being answered, by question id
  final Map<int, Set<int>> _picked = {}; // multiple choice / checkboxes
  final Map<int, TextEditingController> _texts = {}; // short answer / paragraph
  final Set<int> _missing = {}; // required questions with no answer yet
  bool _sending = false;
  bool _justAnswered = false;
  String? _error;
  late Future<Poll> _future;

  String get _guestToken => context.read<GuestIdentity>().token;

  @override
  void initState() {
    super.initState();
    _future = context.read<PollService>().get(widget.id, _guestToken);
  }

  @override
  void dispose() {
    for (final c in _texts.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _textFor(PollQuestion q) =>
      _texts.putIfAbsent(q.id, TextEditingController.new);

  bool _answered(PollQuestion q) => q.type.hasChoices
      ? (_picked[q.id] ?? {}).isNotEmpty
      : _textFor(q).text.trim().isNotEmpty;

  Future<void> _submit(Poll poll) async {
    final missing = {
      for (final q in poll.questions)
        if (q.required && !_answered(q)) q.id,
    };
    setState(() {
      _missing
        ..clear()
        ..addAll(missing);
      _error = missing.isEmpty ? null : 'Please answer the questions marked *.';
    });
    if (missing.isNotEmpty) return;

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final updated = await context.read<PollService>().answer(
        widget.id,
        guestToken: _guestToken,
        answers: [
          for (final q in poll.questions)
            if (q.type.hasChoices)
              PollAnswer(q.id, optionIds: (_picked[q.id] ?? {}).toList())
            else
              PollAnswer(q.id, text: _textFor(q).text.trim()),
        ],
      );
      if (!mounted) return;
      setState(() {
        _future = Future.value(updated);
        _justAnswered = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      // shown in the sheet itself: a toast would sit behind it
      setState(() => _error = e.message);
      // already answered, or the survey closed meanwhile: load it again so it shows how it stands
      if (e.statusCode == 409 || e.statusCode == 400) {
        setState(() {
          _future = context.read<PollService>().get(widget.id, _guestToken);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not record your answers. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DetailLoader<Poll>(
      future: _future,
      colors: DetailColors.poll,
      scrollController: widget.scrollController,
      icon: Icons.bar_chart_rounded,
      onRetry: () => setState(() {
        _future = context.read<PollService>().get(widget.id, _guestToken);
      }),
      builder: (context, poll) => DetailScaffold(
        colors: DetailColors.poll,
        scrollController: widget.scrollController,
        icon: Icons.bar_chart_rounded,
        tag: 'Public survey',
        children: [
          SheetHead(
            title: poll.question,
            chip: StatusChip(poll.status),
            facts: [
              (
                Icons.how_to_vote_outlined,
                '${poll.totalVotes} response${poll.totalVotes == 1 ? '' : 's'}'
              ),
              (
                Icons.list_alt_rounded,
                '${poll.questions.length} question${poll.questions.length == 1 ? '' : 's'}'
              ),
              (
                Icons.person_outline_rounded,
                poll.hasVoted ? 'You answered' : 'Not yet'
              ),
            ],
          ),
          if (poll.description != null && poll.description!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Text(
                poll.description!,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.45,
                  color: Color(0xFF4C5C79),
                ),
              ),
            ),
          if (!poll.showResults) ..._form(poll) else ..._results(poll),
        ],
      ),
    );
  }

  // ------------------------------------------------------------------ the questions to answer

  Widget _questionCard(
    int number,
    PollQuestion q,
    Widget body, {
    bool bad = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bad ? const Color(0xFFFFFDFD) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: bad ? const Color(0xFFF3CFD2) : const Color(0xFFE6ECF5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$number',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: q.prompt,
                    children: [
                      if (q.required)
                        const TextSpan(
                          text: ' *',
                          style: TextStyle(color: Color(0xFFC0392B)),
                        ),
                    ],
                  ),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: AppTheme.ink,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 36, bottom: 10),
            child: Text(
              q.type.label,
              style: const TextStyle(fontSize: 12, color: AppTheme.mute),
            ),
          ),
          body,
          if (bad)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Please answer this question.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFFC0392B)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _choiceTile(PollQuestion q, PollOption o) {
    final multi = q.type == QuestionType.checkbox;
    final on = (_picked[q.id] ?? {}).contains(o.id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: on ? AppTheme.primary.withValues(alpha: 0.07) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: on ? AppTheme.primary : AppTheme.field,
            width: on ? 1.8 : 1.2,
          ),
        ),
        child: InkWell(
          customBorder: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          onTap: () => setState(() {
            final set = _picked.putIfAbsent(q.id, () => <int>{});
            if (multi) {
              on ? set.remove(o.id) : set.add(o.id);
            } else {
              set
                ..clear()
                ..add(o.id);
            }
            _missing.remove(q.id);
          }),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Icon(
                  multi
                      ? (on ? Icons.check_box : Icons.check_box_outline_blank)
                      : (on
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked),
                  color: on ? AppTheme.primary : AppTheme.mute,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    o.label,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _input(PollQuestion q) {
    final long = q.type == QuestionType.paragraph;
    return TextField(
      controller: _textFor(q),
      minLines: long ? 3 : 1,
      maxLines: long ? 6 : 1,
      maxLength: long ? 2000 : 500,
      textCapitalization: TextCapitalization.sentences,
      decoration: const InputDecoration(hintText: 'Your answer'),
      onChanged: (_) {
        if (_missing.contains(q.id)) setState(() => _missing.remove(q.id));
      },
    );
  }

  List<Widget> _form(Poll poll) {
    final signedIn = context.watch<AuthController>().isAuthenticated;
    if (!signedIn) {
      return [
        const SectionLabel('the questions'),
        for (var i = 0; i < poll.questions.length; i++)
          _questionCard(
            i + 1,
            poll.questions[i],
            Column(
              children: [
                for (final o in poll.questions[i].options)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.accent,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.field),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          poll.questions[i].type == QuestionType.checkbox
                              ? Icons.check_box_outline_blank
                              : Icons.radio_button_unchecked,
                          size: 20,
                          color: AppTheme.mute,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            o.label,
                            style: const TextStyle(color: Color(0xFF4C5C79)),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 4),
        const SignInPrompt(
          message: 'Sign in to answer this survey and see the results.',
        ),
      ];
    }
    return [
      const SectionLabel('your answers'),
      for (var i = 0; i < poll.questions.length; i++)
        _questionCard(
          i + 1,
          poll.questions[i],
          poll.questions[i].type.hasChoices
              ? Column(
                  children: [
                    for (final o in poll.questions[i].options)
                      _choiceTile(poll.questions[i], o),
                    if (poll.questions[i].type == QuestionType.checkbox)
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Choose all that apply.',
                          style: TextStyle(fontSize: 12, color: AppTheme.mute),
                        ),
                      ),
                  ],
                )
              : _input(poll.questions[i]),
          bad: _missing.contains(poll.questions[i].id),
        ),
      const SizedBox(height: 4),
      if (_error != null) ...[
        ErrorBox(_error!),
        const SizedBox(height: 12),
      ],
      FilledButton(
        onPressed: _sending ? null : () => _submit(poll),
        child: _sending
            ? const DotsSpinner(color: Colors.white)
            : const Text('Submit my answers'),
      ),
      const SizedBox(height: 12),
      const Center(
        child: Text(
          'One response per person. Questions marked * are required.\nResults appear once you have answered.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppTheme.mute),
        ),
      ),
    ];
  }

  // ------------------------------------------------------------------ the results

  Widget _bar(PollQuestion q, PollOption o, int? leadId) {
    final mine = q.myOptionIds.contains(o.id);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: mine ? AppTheme.primary : const Color(0xFFE6ECF5),
          width: mine ? 1.6 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  children: [
                    Text(
                      o.label,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.ink,
                      ),
                    ),
                    if (mine) const SolidBadge('your answer'),
                  ],
                ),
              ),
              Text(
                '${o.percent.toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: o.id == leadId
                      ? const Color(0xFF7F6200)
                      : AppTheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: (o.percent / 100).clamp(0, 1),
              minHeight: 10,
              backgroundColor: const Color(0xFFEEF2F8),
              color: o.id == leadId ? AppTheme.surveyColor : AppTheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${o.votes} ${o.votes == 1 ? 'person' : 'people'}',
            style: const TextStyle(fontSize: 12, color: AppTheme.mute),
          ),
        ],
      ),
    );
  }

  List<Widget> _results(Poll poll) {
    return [
      const SectionLabel('results'),
      for (var i = 0; i < poll.questions.length; i++)
        () {
          final q = poll.questions[i];
          final ranked = [...q.options]
            ..sort((a, b) => b.votes.compareTo(a.votes));
          final leadId = ranked.isNotEmpty && ranked.first.votes > 0
              ? ranked.first.id
              : null;
          return _questionCard(
            i + 1,
            q,
            q.type.hasChoices
                ? Column(
                    children: [for (final o in ranked) _bar(q, o, leadId)],
                  )
                : Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.accent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: q.myText != null
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'your answer',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: AppTheme.mute,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(q.myText!),
                            ],
                          )
                        : const Text(
                            'You did not answer this one. What people write is read by the office, not shown publicly.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: AppTheme.mute,
                            ),
                          ),
                  ),
          );
        }(),
      if (_error != null) ...[
        ErrorBox(_error!),
        const SizedBox(height: 8),
      ],
      if (poll.hasVoted)
        Center(
          child: Text(
            _justAnswered
                ? 'Thank you! Your answers were recorded.'
                : 'You have answered this survey.',
            style: const TextStyle(color: AppTheme.mute),
          ),
        ),
    ];
  }
}

/// Opens a survey as a slide-up sheet.
Future<void> showPollSheet(BuildContext context, int id) => showEpsSheet(
      context,
      (controller) => PollVoteScreen(id: id, scrollController: controller),
    );
