import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_scaffold.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstname = TextEditingController();
  final _lastname = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    for (final c in [
      _firstname,
      _lastname,
      _email,
      _phone,
      _password,
      _confirm,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await context.read<AuthController>().register(
            firstname: _firstname.text.trim(),
            lastname: _lastname.text.trim(),
            email: _email.text.trim(),
            phoneNo: _phone.text.trim(),
            password: _password.text,
          );
      if (!mounted) return;
      showSnack(context, 'Account created. Check your email for the code.');
      context.push(
        '/verify-email?email=${Uri.encodeComponent(_email.text.trim())}',
      );
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required.' : null;

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Sign Up',
      subtitle:
          'Create an account to file feedback without OTP and track them in one place.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _firstname,
              validator: _required,
              decoration: const InputDecoration(labelText: 'First name'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _lastname,
              validator: _required,
              decoration: const InputDecoration(labelText: 'Last name'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (_required(v) != null) return 'Required.';
                final ok = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v!.trim());
                return ok ? null : 'Invalid email format.';
              },
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              validator: (v) {
                if (_required(v) != null) return 'Required.';
                final ok = RegExp(r'^(09|\+639)\d{9}$').hasMatch(v!.trim());
                return ok ? null : 'Format: 09XXXXXXXXX';
              },
              decoration: const InputDecoration(labelText: 'Contact no.'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              obscureText: true,
              validator: (v) =>
                  (v == null || v.length < 8) ? 'Min. 8 characters.' : null,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirm,
              obscureText: true,
              validator: (v) =>
                  v != _password.text ? 'Passwords do not match.' : null,
              decoration:
                  const InputDecoration(labelText: 'Confirm password'),
            ),
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
                  : const Text('Create account'),
            ),
            TextButton(
              onPressed: () => context.pushReplacement('/login'),
              child: const Text('Already have an account? Sign in'),
            ),
          ],
        ),
      ),
    );
  }
}
