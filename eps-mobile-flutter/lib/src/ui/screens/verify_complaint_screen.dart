import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../services/complaint_service.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/otp_field.dart';

class VerifyComplaintScreen extends StatefulWidget {
  const VerifyComplaintScreen({super.key});

  @override
  State<VerifyComplaintScreen> createState() => _VerifyComplaintScreenState();
}

class _VerifyComplaintScreenState extends State<VerifyComplaintScreen> {
  final _otpKey = GlobalKey<OtpFieldState>();
  bool _loading = false;
  String? _error;
  String? _referenceNo;

  Future<void> _submit() async {
    final code = _otpKey.currentState?.value ?? '';
    if (code.length != 6) {
      setState(() => _error = 'Enter the full 6-digit OTP.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ref =
          await context.read<ComplaintService>().validateComplaintOtp(code);
      setState(() => _referenceNo = ref);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Verify Feedback',
      subtitle: 'Enter the one-time pin (OTP) emailed to you after filing.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OtpField(key: _otpKey, onCompleted: (_) => _submit()),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
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
                : const Text('Submit'),
          ),
          if (_referenceNo != null) ...[
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      'REFERENCE NO.',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      _referenceNo!,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => context.push('/track'),
                      child: const Text('Track this feedback →'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
