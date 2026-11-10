import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../widgets/auth_sheet.dart';
import 'file_complaint_screen.dart';

/// The guest index page: one dark, full-screen page — a stack of "cards" showing what the app
/// does, a big promise, and two buttons underneath (Sign in, File feedback). Nothing else.
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1636),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF14264F), Color(0xFF0B1636)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, box) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: box.maxHeight),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 14, 24, 22),
                    child: Column(
                      children: [
                        // ---- brand ----
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Image.asset(
                            'assets/branding/eps_logo.png',
                            height: 24,
                          ),
                        ),

                        // ---- the cards ----
                        const Spacer(),
                        const SizedBox(height: 300, child: _CardStack()),
                        const Spacer(),

                        // ---- the promise ----
                        // the citizen web app's tagline, with its golden "city."
                        const Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(text: 'Your voice,\nyour '),
                              TextSpan(
                                text: 'city.',
                                style: TextStyle(color: AppTheme.secondary),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 34,
                            height: 1.15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Report a concern, join the conversation and vote on '
                          'the decisions that shape the City — in a couple of '
                          'minutes, from any device.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            height: 1.55,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: 26),

                        // ---- the two buttons ----
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.55),
                            ),
                            minimumSize: const Size.fromHeight(56),
                          ),
                          onPressed: () => showAuthSheet(context),
                          child: const Text('Sign in'),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.secondary,
                            foregroundColor: const Color(0xFF1D1D1D),
                            minimumSize: const Size.fromHeight(56),
                            elevation: 0,
                          ),
                          onPressed: () => showFileFeedbackSheet(context),
                          child: const Text('File feedback'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Two tilted cards (a feedback and a poll), like the card stack of a wallet app.
class _CardStack extends StatelessWidget {
  const _CardStack();

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Positioned(
          bottom: 10,
          child: Transform.rotate(
            angle: -0.12,
            child: Container(
              width: 250,
              height: 158,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF3FA),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 30,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SURVEY',
                    style: TextStyle(
                      fontSize: 11,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.mute,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Should the plaza stay open late?',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.ink,
                    ),
                  ),
                  SizedBox(height: 10),
                  _MiniBar(0.68, AppTheme.primary, 'Yes · 68%'),
                  SizedBox(height: 6),
                  _MiniBar(0.32, AppTheme.surveyColor, 'No · 32%'),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          top: 8,
          child: Transform.rotate(
            angle: 0.1,
            child: Container(
              width: 270,
              height: 170,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.feedbackColor,
                    AppTheme.feedbackDeep,
                    Color(0xFF2A74BE),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.5),
                    blurRadius: 34,
                    offset: const Offset(0, 16),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -50,
                    top: -50,
                    child: Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'FEEDBACK',
                            style: TextStyle(
                              color: AppTheme.secondary,
                              fontSize: 11,
                              letterSpacing: 1.4,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text(
                              'ONGOING',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Streetlight not working',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Text(
                        'Routed to the right office',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          for (var i = 0; i < 4; i++) ...[
                            if (i > 0) const SizedBox(width: 5),
                            Expanded(
                              child: Container(
                                height: 5,
                                decoration: BoxDecoration(
                                  color: i < 3
                                      ? AppTheme.secondary
                                      : Colors.white.withValues(alpha: 0.25),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MiniBar extends StatelessWidget {
  const _MiniBar(this.value, this.color, this.label);
  final double value;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 22,
      decoration: BoxDecoration(
        color: const Color(0xFFDDE5F3),
        borderRadius: BorderRadius.circular(8),
      ),
      alignment: Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: value,
        child: Container(
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            maxLines: 1,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: color == AppTheme.secondary
                  ? const Color(0xFF1D1D1D)
                  : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
