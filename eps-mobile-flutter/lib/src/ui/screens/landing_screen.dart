import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  static const _services = [
    (
      icon: Icons.description_outlined,
      title: 'Feedback',
      body:
          "Report a concern — it's routed to the right city department automatically.",
      route: '/file-complaint',
      cta: 'File Feedback',
    ),
    (
      icon: Icons.forum_outlined,
      title: 'Discussion',
      body: 'Join the conversation on topics the City has opened for public input.',
      route: '/discussions',
      cta: 'Join a Discussion',
    ),
    (
      icon: Icons.bar_chart_outlined,
      title: 'Poll',
      body: 'Answer short polls and help shape decisions the City is weighing.',
      route: '/polls',
      cta: 'Answer a Poll',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(24, 48, 24, 40),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppTheme.primary, Color(0xFF3D6BB5)],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ePARTICIPATION SYSTEM',
                      style: TextStyle(
                        color: AppTheme.secondary,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Your voice, your city',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Report concerns, discuss what matters, and answer polls '
                      'that help shape decisions for the City.',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.secondary,
                        foregroundColor: Colors.black,
                      ),
                      onPressed: () => context.push('/file-complaint'),
                      child: const Text('File Feedback'),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white70),
                        minimumSize: const Size.fromHeight(50),
                      ),
                      onPressed: () => context.push('/login'),
                      child: const Text('Sign In'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    for (final s in _services)
                      Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: Icon(s.icon, color: AppTheme.primary, size: 32),
                          title: Text(
                            s.title,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(s.body),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push(s.route),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.push('/verify-complaint'),
                            child: const Text('Verify feedback'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.push('/track'),
                            child: const Text('Track status'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => context.push('/register'),
                      child: const Text("Don't have an account? Sign up"),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
