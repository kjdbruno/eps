import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../services/complaint_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/eps_ui.dart';
import '../widgets/otp_field.dart';
import '../widgets/eps_loader.dart';

class VerifyComplaintScreen extends StatefulWidget {
  const VerifyComplaintScreen({
    super.key,
    required this.scrollController,
    required this.onDone,
  });

  final ScrollController scrollController;

  /// "Done": close the sheet.
  final VoidCallback onDone;

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
      if (mounted) setState(() => _referenceNo = ref);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      scrollController: widget.scrollController,
      title: 'Verify Feedback',
      icon: Icons.verified_outlined,
      subtitle: 'Enter the one-time pin (OTP) emailed to you after filing.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OtpField(key: _otpKey, onCompleted: (_) => _submit()),
          if (_error != null) ...[
            const SizedBox(height: 12),
            ErrorBox(_error!),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const DotsSpinner(color: Color(0xFF1D1D1D))
                : const Text('Submit'),
          ),
          if (_referenceNo != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 30,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Feedback verified',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'YOUR REFERENCE NO.',
                    style: TextStyle(
                      color: AppTheme.secondary,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  SelectableText(
                    _referenceNo!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Save this — you will need it, with your code, to add the feedback to your account.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 14),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppTheme.secondary,
                      foregroundColor: const Color(0xFF1D1D1D),
                    ),
                    onPressed: widget.onDone,
                    child: const Text('Done'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
