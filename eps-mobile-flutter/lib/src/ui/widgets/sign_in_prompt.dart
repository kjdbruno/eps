import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'auth_scaffold.dart';
import 'auth_sheet.dart';

/// Shown in place of a write action (comment box, vote form, follow-up) when the
/// viewer isn't signed in. Viewing stays open to guests; participating does not.
class SignInPrompt extends StatelessWidget {
  const SignInPrompt({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF2F6FD), Color(0xFFE8EFFB)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFB8C4D9)),
      ),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.14),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(
              Icons.lock_person_outlined,
              color: AppTheme.primary,
              size: 26,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppTheme.ink,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () => showAuthSheet(context),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 44),
                  ),
                  child: const Text('Sign in'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: () =>
                      showAuthSheet(context, step: AuthStep.register),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 44),
                  ),
                  child: const Text('Sign up'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
