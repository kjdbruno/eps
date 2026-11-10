import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/eps_loader.dart';
import '../widgets/eps_ui.dart';
import '../widgets/pill_field.dart';

/// The sign-in step of the guest sheet.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.scrollController,
    required this.onGo,
    required this.onDone,
  });

  final ScrollController scrollController;

  /// Switch the sheet to another step (create account, forgot password, verify).
  final AuthGo onGo;

  /// Signed in: close the sheet and go on to the app.
  final VoidCallback onDone;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _remember = true;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthController>();
    _email.text = auth.lastEmail;
    _remember = auth.rememberMe;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().login(
            _email.text.trim(),
            _password.text,
            remember: _remember,
          );
      if (mounted) widget.onDone();
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.notVerified) {
        widget.onGo(
          AuthStep.verifyEmail,
          email: e.emailFromBody ?? _email.text.trim(),
        );
        return;
      }
      setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not sign in. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      scrollController: widget.scrollController,
      brand: true,
      title: 'Welcome back',
      subtitle:
          'Sign in to see your feedback, join discussions\nand answer surveys.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PillField(
            controller: _email,
            hint: 'Email',
            icon: Icons.mail_outline_rounded,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
          ),
          const SizedBox(height: 12),
          PillField(
            controller: _password,
            hint: 'Password',
            icon: Icons.lock_outline_rounded,
            obscure: _obscure,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => _submit(),
            suffix: IconButton(
              icon: Icon(
                _obscure
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
                color: AppTheme.mute,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () {
                    setState(() => _remember = !_remember);
                    context.read<AuthController>().setRememberMe(_remember);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _remember
                              ? Icons.check_circle_rounded
                              : Icons.circle_outlined,
                          size: 20,
                          color:
                              _remember ? AppTheme.secondary : Colors.white70,
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Remember me',
                          style: TextStyle(color: Colors.white, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              TextButton(
                onPressed: () => widget.onGo(
                  AuthStep.forgot,
                  email: _email.text.trim(),
                ),
                child: const Text('Forgot password?'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            ErrorBox(_error!),
          ],
          const SizedBox(height: 14),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const DotsSpinner(color: Color(0xFF1D1D1D))
                : const Text('Sign in'),
          ),
          const SizedBox(height: 10),
          Center(
            child: TextButton(
              onPressed: () => widget.onGo(AuthStep.register),
              child: const Text('Create an account'),
            ),
          ),
        ],
      ),
    );
  }
}
