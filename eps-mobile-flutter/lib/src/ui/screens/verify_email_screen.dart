import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/eps_ui.dart';
import '../widgets/otp_field.dart';
import '../widgets/eps_loader.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({
    super.key,
    required this.email,
    required this.scrollController,
    required this.onDone,
  });

  final String email;
  final ScrollController scrollController;

  /// Verified (and so signed in): close the sheet and go on to the app.
  final VoidCallback onDone;

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _otpKey = GlobalKey<OtpFieldState>();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    final code = _otpKey.currentState?.value ?? '';
    if (code.length != 6) {
      setState(() => _error = 'Enter the full 6-digit code.');
      return;
    }
    if (widget.email.isEmpty) {
      setState(() => _error = 'Email is missing — sign in or register again.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().verifyEmail(widget.email, code);
      if (mounted) widget.onDone();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    try {
      await context.read<AuthController>().resendVerification(widget.email);
      if (mounted) showSnack(context, 'A new code has been sent.');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      scrollController: widget.scrollController,
      title: 'Verify Email',
      icon: Icons.mark_email_read_outlined,
      subtitle: 'Enter the 6-digit code sent to '
          '${widget.email.isEmpty ? 'your email' : widget.email}.',
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
                : const Text('Verify'),
          ),
          TextButton(onPressed: _resend, child: const Text('Resend code')),
        ],
      ),
    );
  }
}
