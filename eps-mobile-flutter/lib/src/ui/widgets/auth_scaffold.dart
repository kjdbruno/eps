import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// The steps of the guest sheet (see `auth_sheet.dart`): one modal that walks between them.
enum AuthStep { login, register, forgot, verifyEmail }

/// Asks the sheet to show another step ([email] carries the address the next step is about).
typedef AuthGo = void Function(AuthStep step, {String email});

/// The dark-blue slide-up sheet the guest screens (sign in, create account, forgot password,
/// verify) share: a grab handle and a close button, the logo or an icon, a big title and a line
/// of text, then the form. Buttons turn gold and links white so they read on the blue.
///
/// [scrollController] is the sheet's (see `showEpsSheet`), so dragging the content drags the sheet.
/// The host wraps it in a `SheetFrame`, so a toast raised by a step shows on the sheet.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.child,
    required this.scrollController,
    this.subtitle,
    this.icon = Icons.person_outline,
    this.brand = false,
  });

  final String title;
  final String? subtitle;
  final IconData icon;

  /// Show the ePS logo above the title instead of [icon].
  final bool brand;
  final Widget child;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context);
    // On the blue sheet: gold filled buttons, white outlined/text buttons, white pill-ish fields.
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
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: BorderSide(color: Colors.white.withValues(alpha: 0.55)),
          minimumSize: const Size.fromHeight(54),
          shape: const StadiumBorder(),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        filled: true,
        fillColor: Colors.white,
        errorStyle: const TextStyle(color: Color(0xFFFFC9C9)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: const BorderSide(color: AppTheme.secondary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: const BorderSide(color: Color(0xFFFF9B9B), width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: const BorderSide(color: Color(0xFFFF9B9B), width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
      ),
    );

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF2A5AAE), AppTheme.primary, AppTheme.deep],
        ),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned(
            left: -120,
            bottom: -140,
            child: Container(
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.07),
              ),
            ),
          ),
          Positioned(
            right: -80,
            top: -90,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.secondary.withValues(alpha: 0.12),
              ),
            ),
          ),
          ListView(
            controller: scrollController,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(28, 34, 28, 28),
            children: [
              Center(
                child: brand
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: _badge(20),
                        child: Image.asset(
                          'assets/branding/eps_logo.png',
                          height: 38,
                        ),
                      )
                    : Container(
                        width: 64,
                        height: 64,
                        decoration: _badge(22),
                        child: Icon(icon, color: AppTheme.primary, size: 30),
                      ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 8),
                Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontSize: 13,
                    height: 1.55,
                  ),
                ),
              ],
              const SizedBox(height: 26),
              Theme(data: onDark, child: child),
            ],
          ),
          // the grab handle and the close button float over the top of the content
          Positioned(
            top: 10,
            left: 0,
            right: 0,
            child: IgnorePointer(
              child: Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 4,
            right: 6,
            child: IconButton(
              color: Colors.white,
              tooltip: 'Close',
              icon: const Icon(Icons.close_rounded),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
    );
  }

  BoxDecoration _badge(double radius) => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.22),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ],
      );
}
