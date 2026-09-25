import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/async_view.dart';
import '../widgets/complaint_body.dart';
import '../widgets/photo_picker.dart';
import '../widgets/sign_in_prompt.dart';

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({super.key, required this.id});
  final int id;

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final _followUp = TextEditingController();
  bool _sending = false;
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

  Future<void> _rate(int responseId, int stars) async {
    try {
      await _service.rateResponse(responseId, stars);
      if (mounted) showSnack(context, 'Thanks for rating this response!');
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Complaint threads, follow-ups and response ratings are account-only.
    if (!context.watch<AuthController>().isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Feedback')),
        body: const Padding(
          padding: EdgeInsets.all(16),
          child: SignInPrompt(
            message: 'Sign in to view this feedback, post a follow-up, or rate a response.',
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Feedback')),
      body: AsyncView<Complaint>(
        future: _future,
        onRetry: _refresh,
        builder: (context, c) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ComplaintBody(complaint: c),
              if (c.responses.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  'RATE THESE RESPONSES',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade600,
                  ),
                ),
                for (final r in c.responses)
                  if (r.author?.role != 'citizen')
                    _RatingRow(
                      label: '${r.department} · ${r.content.length > 40 ? '${r.content.substring(0, 40)}…' : r.content}',
                      value: r.myRating,
                      onRate: (v) => _rate(r.id, v),
                    ),
              ],
              const SizedBox(height: 24),
              if (c.isTerminal)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'This feedback is finalized as ${c.status.toUpperCase()} — '
                    'no further follow-ups can be added.',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                )
              else ...[
                const Text(
                  'Add a follow-up',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _followUp,
                  minLines: 3,
                  maxLines: 6,
                  decoration: const InputDecoration(
                    hintText:
                        'Add more details, or ask about the status of your feedback...',
                  ),
                ),
                const SizedBox(height: 10),
                PhotoPicker(onChanged: (p) => _photos = p),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _sending ? null : _sendFollowUp,
                  child: _sending
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Send follow-up'),
                ),
              ],
            ],
          );
        },
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
          Text(label, style: const TextStyle(fontSize: 13)),
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
