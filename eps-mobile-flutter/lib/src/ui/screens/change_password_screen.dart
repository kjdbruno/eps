import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/eps_loader.dart';
import '../widgets/eps_ui.dart';
import '../widgets/pill_field.dart';

/// Where an account that still has the temporary password it was emailed ends up after its first
/// login (see `User.mustChangePassword` in the API, which refuses everything else until the
/// password is changed). The router keeps the account here until it has chosen its own.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_current.text.isEmpty) {
      return 'Enter the temporary password from your email.';
    }
    if (_new.text.length < 8) {
      return 'The new password must be at least 8 characters.';
    }
    if (_new.text == _current.text) {
      return 'Choose a password different from the temporary one.';
    }
    if (_new.text != _confirm.text) return 'The two passwords do not match.';
    return null;
  }

  Future<void> _submit() async {
    final problem = _validate();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // the router moves on to the app once the flag is cleared
      await context.read<AuthController>().changePassword(
            _current.text,
            _new.text,
          );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not change the password. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _eye() => IconButton(
        icon: Icon(
          _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          size: 20,
          color: AppTheme.mute,
        ),
        onPressed: () => setState(() => _obscure = !_obscure),
      );

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context);
    final onDark = base.copyWith(
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppTheme.secondary,
          foregroundColor: const Color(0xFF1D1D1D),
          disabledBackgroundColor: AppTheme.secondary.withValues(alpha: 0.5),
          minimumSize: const Size.fromHeight(56),
          shape: const StadiumBorder(),
          elevation: 0,
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );

    return Scaffold(
      backgroundColor: AppTheme.deep,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF2A5AAE), AppTheme.primary, AppTheme.deep],
          ),
        ),
        child: SafeArea(
          child: Theme(
            data: onDark,
            child: ListView(
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(28, 40, 28, 28),
              children: [
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(
                      Icons.key_rounded,
                      color: AppTheme.primary,
                      size: 30,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Choose your password',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your account started with a temporary password from\nyour email. Choose one that only you know.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontSize: 13,
                    height: 1.55,
                  ),
                ),
                const SizedBox(height: 26),
                PillField(
                  controller: _current,
                  hint: 'Temporary password (from your email)',
                  icon: Icons.lock_outline_rounded,
                  obscure: _obscure,
                  autofillHints: const [AutofillHints.password],
                  suffix: _eye(),
                ),
                const SizedBox(height: 12),
                PillField(
                  controller: _new,
                  hint: 'New password',
                  icon: Icons.lock_rounded,
                  obscure: _obscure,
                  autofillHints: const [AutofillHints.newPassword],
                ),
                const SizedBox(height: 12),
                PillField(
                  controller: _confirm,
                  hint: 'Confirm new password',
                  icon: Icons.lock_rounded,
                  obscure: _obscure,
                  autofillHints: const [AutofillHints.newPassword],
                  onSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 10),
                Text(
                  'Use at least 8 characters.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 12,
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  ErrorBox(_error!),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const DotsSpinner(color: Color(0xFF1D1D1D))
                      : const Text('Save my password'),
                ),
                const SizedBox(height: 10),
                Center(
                  child: TextButton(
                    onPressed: _loading
                        ? null
                        : () => context.read<AuthController>().logout(),
                    child: const Text('Not now? Log out'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
