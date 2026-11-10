import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/app_snack.dart';
import '../widgets/status_chip.dart';
import '../widgets/format.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/complaint_body.dart';
import '../widgets/eps_ui.dart';
import '../widgets/photo_picker.dart';
import '../widgets/sign_in_prompt.dart';
import '../widgets/eps_loader.dart';

/// Opens a feedback as a sheet that slides up over the page (like the notifications), instead
/// of a new page. Drag it down or tap the close button to dismiss it.
Future<void> showComplaintSheet(BuildContext context, int id) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    // over the whole app, so the floating navigation bar does not sit on top of the sheet
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.97,
      builder: (context, controller) =>
          ComplaintDetailScreen(id: id, scrollController: controller),
    ),
  );
}

/// A feedback's detail. Shown as a full page by default; with a [scrollController] it is the
/// content of the slide-up sheet [showComplaintSheet] opens.
class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({
    super.key,
    required this.id,
    this.scrollController,
  });

  final int id;
  final ScrollController? scrollController;

  bool get asSheet => scrollController != null;

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final _followUp = TextEditingController();
  final _cancelReason = TextEditingController();
  bool _sending = false;
  bool _cancelOpen = false;
  bool _cancelling = false;
  List<XFile> _photos = const [];
  late Future<Complaint> _future;

  ComplaintService get _service => context.read<ComplaintService>();
  int? get _uid => context.read<AuthController>().user?.id;

  @override
  void initState() {
    super.initState();
    _future = _service.detail(widget.id, currentUserId: _uid);
  }

  void _refresh() => setState(() {
        _future = _service.detail(widget.id, currentUserId: _uid);
      });

  @override
  void dispose() {
    _followUp.dispose();
    _cancelReason.dispose();
    super.dispose();
  }

  Future<void> _sendFollowUp() async {
    if (_followUp.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await _service.respond(
        complaintId: widget.id,
        content: _followUp.text.trim(),
        photos: _photos,
      );
      _followUp.clear();
      _photos = const [];
      if (mounted) showSnack(context, 'Follow-up sent.');
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _cancel() async {
    setState(() => _cancelling = true);
    try {
      await _service.cancel(widget.id, reason: _cancelReason.text);
      _cancelReason.clear();
      if (mounted) {
        setState(() => _cancelOpen = false);
        showSnack(context, 'Your feedback was cancelled.');
      }
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  /// "Cancel feedback", offered until the feedback is completed: a button that opens a small
  /// panel with an optional reason.
  Widget _cancelBlock() {
    if (!_cancelOpen) {
      return Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          onPressed: () => setState(() => _cancelOpen = true),
          icon: const Icon(Icons.cancel_outlined, size: 18),
          label: const Text('Cancel this feedback'),
          style: TextButton.styleFrom(foregroundColor: const Color(0xFFC0392B)),
        ),
      );
    }
    return InfoBlock(
      title: 'cancel this feedback',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'The offices handling it will be told and it will be closed. This cannot be undone.',
            style: TextStyle(color: Color(0xFF6B7488), height: 1.45),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _cancelReason,
            minLines: 2,
            maxLines: 4,
            maxLength: 500,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Reason (optional)'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _cancelling
                      ? null
                      : () => setState(() => _cancelOpen = false),
                  child: const Text('Keep it'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFC0392B),
                  ),
                  onPressed: _cancelling ? null : _cancel,
                  child: _cancelling
                      ? const ButtonSpinner()
                      : const Text('Cancel feedback'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _rate(int responseId, int stars) async {
    try {
      await _service.rateResponse(responseId, stars);
      if (mounted) showSnack(context, 'Thanks for rating this response!');
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  /// The body under the header: what was reported and where it stands, the ratings, and the
  /// follow-up box (or a note that it is finalized).
  List<Widget> _content(Complaint c) {
    return [
      ComplaintBody(complaint: c, showHeader: false),
      if (c.responses.any((r) => r.author?.role != 'citizen'))
        InfoBlock(
          title: 'rate these responses',
          child: Column(
            children: [
              for (final r in c.responses)
                if (r.author?.role != 'citizen')
                  _RatingRow(
                    label:
                        '${r.department} · ${r.content.length > 40 ? '${r.content.substring(0, 40)}…' : r.content}',
                    value: r.myRating,
                    onRate: (v) => _rate(r.id, v),
                  ),
            ],
          ),
        ),
      if (c.isTerminal)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F2F5),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.lock_outline_rounded,
                size: 18,
                color: Color(0xFF6B7488),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'This feedback is finalized as ${c.status.toUpperCase()} — '
                  'no further follow-ups can be added.',
                  style:
                      const TextStyle(color: Color(0xFF6B7488), height: 1.45),
                ),
              ),
            ],
          ),
        )
      else
        InfoBlock(
          title: 'add a follow-up',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _followUp,
                minLines: 4,
                maxLines: 7,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText:
                      'Add more details, or ask about the status of your feedback...',
                ),
              ),
              const SizedBox(height: 12),
              PhotoPicker(onChanged: (p) => _photos = p),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _sending ? null : _sendFollowUp,
                icon: _sending
                    ? const ButtonSpinner()
                    : const Icon(Icons.send_rounded, size: 18),
                label: Text(_sending ? 'Sending...' : 'Send follow-up'),
              ),
            ],
          ),
        ),
      if (!c.isTerminal) _cancelBlock(),
    ];
  }

  /// The slide-up version: a blue header (grab handle, reference, status, a close button) over a
  /// white, scrolling body — the same shape as the notifications sheet.
  Widget _sheet(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      clipBehavior: Clip.antiAlias,
      child: SheetFrame(
        child: FutureBuilder<Complaint>(
          future: _future,
          builder: (context, snap) {
            final c = snap.data;
            return Column(
              children: [
                // ---- the header, which doubles as the grab area ----
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(20, 10, 12, 18),
                  decoration:
                      const BoxDecoration(gradient: AppTheme.heroGradient),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 44,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.45),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Text(
                            'FEEDBACK',
                            style: TextStyle(
                              color: AppTheme.secondary,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const Spacer(),
                          if (c != null) StatusChip(c.status),
                          IconButton(
                            color: Colors.white,
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                      Text(
                        c?.referenceNo ?? 'Loading…',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                      if (c != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Filed ${timeAgo(c.createdAt)}  ·  ${c.offices.isEmpty ? 'Not yet routed' : c.offices.first.label}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // ---- the body ----
                Expanded(
                  child: snap.connectionState == ConnectionState.waiting
                      ? const EpsLoader()
                      : snap.hasError
                          ? ListView(
                              controller: widget.scrollController,
                              children: [
                                EmptyState(
                                  icon: Icons.cloud_off_rounded,
                                  title: 'Could not load',
                                  text: snap.error is ApiException
                                      ? (snap.error as ApiException).message
                                      : 'Something went wrong.',
                                  action: OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      minimumSize: const Size(140, 46),
                                    ),
                                    onPressed: _refresh,
                                    child: const Text('Retry'),
                                  ),
                                ),
                              ],
                            )
                          : EpsRefresh(
                              onRefresh: () async => _refresh(),
                              child: ListView(
                                controller: widget.scrollController,
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding:
                                    const EdgeInsets.fromLTRB(20, 18, 20, 32),
                                children: _content(c!),
                              ),
                            ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Complaint threads, follow-ups and response ratings are account-only.
    if (!context.watch<AuthController>().isAuthenticated) {
      return widget.asSheet
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: SignInPrompt(
                message:
                    'Sign in to view this feedback, post a follow-up, or rate a response.',
              ),
            )
          : Scaffold(
              appBar: AppBar(title: const Text('Feedback')),
              body: const Padding(
                padding: EdgeInsets.all(16),
                child: SignInPrompt(
                  message:
                      'Sign in to view this feedback, post a follow-up, or rate a response.',
                ),
              ),
            );
    }
    if (widget.asSheet) return _sheet(context);
    return DetailLoader<Complaint>(
      future: _future,
      colors: DetailColors.feedback,
      icon: Icons.description_rounded,
      onRetry: _refresh,
      builder: (context, c) => DetailScaffold(
        colors: DetailColors.feedback,
        icon: Icons.description_rounded,
        tag: 'Feedback',
        onRefresh: () async => _refresh(),
        children: [
          SheetHead(
            title: c.referenceNo,
            chip: StatusChip(c.status),
            facts: [
              (Icons.schedule, 'Filed ${timeAgo(c.createdAt)}'),
              (
                Icons.account_tree_outlined,
                c.offices.isEmpty ? 'Not yet routed' : c.offices.first.label,
              ),
            ],
          ),
          const SizedBox(height: 18),
          ..._content(c),
        ],
      ),
    );
  }
}

class _RatingRow extends StatelessWidget {
  const _RatingRow({
    required this.label,
    required this.value,
    required this.onRate,
  });

  final String label;
  final int value;
  final ValueChanged<int> onRate;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, height: 1.4)),
          Row(
            children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: Icon(
                    i <= value ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                  ),
                  onPressed: () => onRate(i),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
