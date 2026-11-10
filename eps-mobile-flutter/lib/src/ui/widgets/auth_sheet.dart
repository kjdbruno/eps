import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../screens/forgot_password_screen.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/verify_complaint_screen.dart';
import '../screens/verify_email_screen.dart';
import 'auth_scaffold.dart';
import 'detail_scaffold.dart';

/// Opens the guest sheet: sign in, create account, forgot password and verify-your-email are
/// steps of one slide-up modal, so moving between them never leaves the page underneath.
/// Signing in (or verifying the email) closes it and goes on to the app.
Future<void> showAuthSheet(
  BuildContext context, {
  AuthStep step = AuthStep.login,
  String email = '',
}) =>
    showEpsSheet<void>(
      context,
      (controller) => _AuthSheet(
        scrollController: controller,
        step: step,
        email: email,
      ),
    );

class _AuthSheet extends StatefulWidget {
  const _AuthSheet({
    required this.scrollController,
    required this.step,
    required this.email,
  });

  final ScrollController scrollController;
  final AuthStep step;
  final String email;

  @override
  State<_AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends State<_AuthSheet> {
  late AuthStep _step = widget.step;
  late String _email = widget.email;

  void _go(AuthStep step, {String email = ''}) {
    setState(() {
      _step = step;
      _email = email;
    });
    // a new step starts at the top
    if (widget.scrollController.hasClients) widget.scrollController.jumpTo(0);
  }

  /// Signed in: close the sheet, then into the app.
  void _done() {
    final router = GoRouter.of(context);
    Navigator.of(context).pop();
    router.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.scrollController;
    return SheetFrame(
      // one step at a time: the steps share the sheet's scroll controller, so no cross-fade
      child: KeyedSubtree(
        key: ValueKey(_step),
        child: switch (_step) {
          AuthStep.login =>
            LoginScreen(scrollController: c, onGo: _go, onDone: _done),
          AuthStep.register => RegisterScreen(scrollController: c, onGo: _go),
          AuthStep.forgot => ForgotPasswordScreen(
              scrollController: c,
              onGo: _go,
              email: _email,
            ),
          AuthStep.verifyEmail => VerifyEmailScreen(
              scrollController: c,
              email: _email,
              onDone: _done,
            ),
        },
      ),
    );
  }
}

/// Opens the sheet where the one-time code emailed after a guest files feedback is entered.
Future<void> showVerifyComplaintSheet(BuildContext context) {
  return showEpsSheet<void>(
    context,
    (controller) => SheetFrame(
      child: Builder(
        builder: (inner) => VerifyComplaintScreen(
          scrollController: controller,
          onDone: () => Navigator.of(inner).pop(),
        ),
      ),
    ),
  );
}
