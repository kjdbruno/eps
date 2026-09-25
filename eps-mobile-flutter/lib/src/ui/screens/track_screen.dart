import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/complaint_body.dart';

class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key});

  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  final _ref = TextEditingController();
  final _otp = TextEditingController();
  bool _loading = false;
  String? _error;
  Complaint? _result;

  @override
  void dispose() {
    _ref.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_ref.text.trim().isEmpty || _otp.text.trim().isEmpty) {
      setState(() => _error = 'Reference number and access code are both required.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final complaint = await context
          .read<ComplaintService>()
          .track(_ref.text.trim(), _otp.text.trim());
      setState(() => _result = complaint);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Track My Feedback',
      subtitle: 'Look up your feedback using its reference number and access code.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _ref,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Reference no.',
              hintText: 'e.g. EPS20260825ABCDE',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _otp,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Access code (OTP)',
              hintText: '6-digit code sent to your email',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Track'),
          ),
          if (_result != null) ...[
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: ComplaintBody(complaint: _result!),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
