import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../../theme/app_theme.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/eps_ui.dart';
import '../widgets/otp_field.dart';
import '../widgets/eps_loader.dart';

enum _Step { email, code, reset }

/// Password recovery — the mobile port of `ForgotPasswordPage.vue`, kept as one
/// screen that walks through three steps:
///   1. enter the email  → a 6-digit code is emailed
///   2. enter the code   → verified on its own (not consumed)
///   3. new password     → reset, then back to sign-in
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({
    super.key,
    required this.scrollController,
    required this.onGo,
    this.email = '',
  });

  final ScrollController scrollController;

  /// Switch the sheet to another step (back to sign in).
  final AuthGo onGo;
  final String email;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _otpKey = GlobalKey<OtpFieldState>();
  late final _email = TextEditingController(text: widget.email);
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  _Step _step = _Step.email;
  String _code = '';
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  AuthController get _auth => context.read<AuthController>();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String get _subtitle => switch (_step) {
        _Step.email => "Enter your email and we'll send you a reset code.",
        _Step.code => 'Enter the 6-digit code sent to ${_email.text.trim()}.',
        _Step.reset => 'Choose a new password for your account.',
      };

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendCode({bool resend = false}) async {
    if (_email.text.trim().isEmpty) {
      setState(() => _error = 'Please enter your email address.');
      return;
    }
    await _run(() async {
      await _auth.forgotPassword(_email.text.trim());
      if (!mounted) return;
      if (resend) {
        _otpKey.currentState?.clear();
        showSnack(
          context,
          'If that email is registered, a new code has been sent.',
        );
      } else {
        setState(() => _step = _Step.code);
      }
    });
  }

  Future<void> _verifyCode() async {
    final code = _otpKey.currentState?.value ?? '';
    if (code.length != 6) {
      setState(() => _error = 'Please enter the full 6-digit code.');
      return;
    }
    await _run(() async {
      await _auth.verifyResetCode(_email.text.trim(), code);
      if (!mounted) return;
      setState(() {
        _code = code;
        _step = _Step.reset;
      });
    });
  }

  Future<void> _resetPassword() async {
    if (_password.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters.');
      return;
    }
    if (_password.text != _confirm.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    await _run(() async {
      try {
        final msg = await _auth.resetPassword(
          _email.text.trim(),
          _code,
          _password.text,
        );
        if (!mounted) return;
        showSnack(context, msg);
        widget.onGo(AuthStep.login, email: _email.text.trim());
      } on ApiException catch (e) {
        // The code passed step 2 but can still have expired (15-min TTL) — send
        // them back to re-enter a fresh one rather than stranding them here.
        if (e.statusCode == 400 && mounted) {
          setState(() {
            _step = _Step.code;
            _error = e.message;
          });
          _otpKey.currentState?.clear();
          return;
        }
        rethrow;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      scrollController: widget.scrollController,
      title: 'Forgot Password',
      icon: Icons.key_rounded,
      subtitle: _subtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // where you are: email, code, new password
          Row(
            children: [
              for (final i in [0, 1, 2]) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(
                  child: Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: i <= _step.index
                          ? AppTheme.secondary
                          : Colors.white.withValues(alpha: 0.28),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 18),
          ..._stepFields(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            ErrorBox(_error!),
          ],
          const SizedBox(height: 20),
          ..._stepActions(),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () =>
                widget.onGo(AuthStep.login, email: _email.text.trim()),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    );
  }

  List<Widget> _stepFields() {
    switch (_step) {
      case _Step.email:
        return [
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(
              hintText: 'Email',
              prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
            ),
            onSubmitted: (_) => _sendCode(),
          ),
        ];
      case _Step.code:
        return [OtpField(key: _otpKey, onCompleted: (_) => _verifyCode())];
      case _Step.reset:
        return [
          TextField(
            controller: _password,
            obscureText: _obscure,
            decoration: InputDecoration(
              hintText: 'New password',
              prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirm,
            obscureText: _obscure,
            decoration: const InputDecoration(
              hintText: 'Confirm new password',
              prefixIcon: Icon(Icons.lock_rounded, size: 20),
            ),
            onSubmitted: (_) => _resetPassword(),
          ),
        ];
    }
  }

  List<Widget> _stepActions() {
    final spinner =
        _loading ? const DotsSpinner(color: Color(0xFF1D1D1D)) : null;

    switch (_step) {
      case _Step.email:
        return [
          FilledButton(
            onPressed: _loading ? null : _sendCode,
            child: spinner ?? const Text('Send reset code'),
          ),
        ];
      case _Step.code:
        return [
          FilledButton(
            onPressed: _loading ? null : _verifyCode,
            child: spinner ?? const Text('Verify code'),
          ),
          TextButton(
            onPressed: _loading ? null : () => _sendCode(resend: true),
            child: const Text('Send another code'),
          ),
        ];
      case _Step.reset:
        return [
          FilledButton(
            onPressed: _loading ? null : _resetPassword,
            child: spinner ?? const Text('Reset password'),
          ),
        ];
    }
  }
}
