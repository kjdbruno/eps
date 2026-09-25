import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/otp_field.dart';

enum _Step { email, code, reset }

/// Password recovery — the mobile port of `ForgotPasswordPage.vue`, kept as one
/// screen that walks through three steps:
///   1. enter the email  → a 6-digit code is emailed
///   2. enter the code   → verified on its own (not consumed)
///   3. new password     → reset, then back to sign-in
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.email = ''});
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
        showSnack(context, 'If that email is registered, a new code has been sent.');
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
        context.go('/login');
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
      title: 'Forgot Password',
      subtitle: _subtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ..._stepFields(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          ..._stepActions(),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => context.go('/login'),
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
            decoration: const InputDecoration(labelText: 'Email'),
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
              labelText: 'New password',
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirm,
            obscureText: _obscure,
            decoration: const InputDecoration(labelText: 'Confirm new password'),
            onSubmitted: (_) => _resetPassword(),
          ),
        ];
    }
  }

  List<Widget> _stepActions() {
    final spinner = _loading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : null;

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
