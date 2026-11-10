import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_scaffold.dart';
import '../../theme/app_theme.dart';
import '../widgets/pill_field.dart';
import '../widgets/eps_loader.dart';

/// The create-account step of the guest sheet.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.scrollController,
    required this.onGo,
  });

  final ScrollController scrollController;

  /// Switch the sheet to another step (verify the email, back to sign in).
  final AuthGo onGo;

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
  bool _obscure = true;
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
      widget.onGo(AuthStep.verifyEmail, email: _email.text.trim());
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
      scrollController: widget.scrollController,
      brand: true,
      title: 'Create your account',
      subtitle:
          'File feedback without the one-time code and keep everything in one place.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ---- the form ----
            PillField(
              controller: _firstname,
              hint: 'First name',
              icon: Icons.person_outline_rounded,
              validator: _required,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.givenName],
            ),
            const SizedBox(height: 12),
            PillField(
              controller: _lastname,
              hint: 'Last name',
              icon: Icons.badge_outlined,
              validator: _required,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.familyName],
            ),
            const SizedBox(height: 12),
            PillField(
              controller: _email,
              hint: 'Email',
              icon: Icons.mail_outline_rounded,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              validator: (v) {
                if (_required(v) != null) return 'Required.';
                final ok =
                    RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v!.trim());
                return ok ? null : 'Invalid email format.';
              },
            ),
            const SizedBox(height: 12),
            PillField(
              controller: _phone,
              hint: 'Contact no. (09XXXXXXXXX)',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              validator: (v) {
                if (_required(v) != null) return 'Required.';
                final ok = RegExp(r'^(09|\+639)\d{9}$').hasMatch(v!.trim());
                return ok ? null : 'Format: 09XXXXXXXXX';
              },
            ),
            const SizedBox(height: 12),
            PillField(
              controller: _password,
              hint: 'Password (8+ characters)',
              icon: Icons.lock_outline_rounded,
              obscure: _obscure,
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) =>
                  (v == null || v.length < 8) ? 'Min. 8 characters.' : null,
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
            const SizedBox(height: 12),
            PillField(
              controller: _confirm,
              hint: 'Confirm password',
              icon: Icons.lock_rounded,
              obscure: _obscure,
              autofillHints: const [AutofillHints.newPassword],
              onSubmitted: (_) => _submit(),
              validator: (v) =>
                  v != _password.text ? 'Passwords do not match.' : null,
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const DotsSpinner(color: Color(0xFF1D1D1D))
                  : const Text('Create account'),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: () => widget.onGo(AuthStep.login),
                child: const Text('Sign in'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
