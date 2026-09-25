import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/auth_scaffold.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _remember = true;
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
      if (mounted) context.go('/home');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.notVerified) {
        context.push(
          '/verify-email?email=${Uri.encodeComponent(e.emailFromBody ?? _email.text.trim())}',
        );
        return;
      }
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Sign In',
      subtitle: 'Access your feedback and account details.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _password,
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            decoration: const InputDecoration(labelText: 'Password'),
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: CheckboxListTile(
                  value: _remember,
                  onChanged: (v) {
                    final remember = v ?? true;
                    setState(() => _remember = remember);
                    context.read<AuthController>().setRememberMe(remember);
                  },
                  title: const Text('Remember me'),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  dense: true,
                ),
              ),
              TextButton(
                onPressed: () {
                  final email = _email.text.trim();
                  context.push(
                    '/forgot-password'
                    '${email.isEmpty ? '' : '?email=${Uri.encodeComponent(email)}'}',
                  );
                },
                child: const Text('Forgot password?'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
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
                : const Text('Sign in'),
          ),
          TextButton(
            onPressed: () => context.pushReplacement('/register'),
            child: const Text("Don't have an account? Sign up"),
          ),
        ],
      ),
    );
  }
}
