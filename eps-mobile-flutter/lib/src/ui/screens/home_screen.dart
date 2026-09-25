import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/notification_bell.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final name = auth.user?.firstname ?? 'there';

    return Scaffold(
      appBar: AppBar(
        title: const Text('ePS'),
        actions: const [NotificationBell()],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Welcome back, $name',
            style:
                const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Manage your feedback, join discussions, and answer polls.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),
          _ServiceCard(
            icon: Icons.description_outlined,
            color: AppTheme.primary,
            title: 'File Feedback',
            body: 'Signed in — skips OTP and goes straight to processing.',
            onTap: () => context.push('/file-complaint'),
          ),
          _ServiceCard(
            icon: Icons.forum_outlined,
            color: const Color(0xFF3D6BB5),
            title: 'Join a Discussion',
            body: 'Comment on topics the City has opened for public input.',
            onTap: () => context.go('/home/discussions'),
          ),
          _ServiceCard(
            icon: Icons.bar_chart_outlined,
            color: const Color(0xFFB8860B),
            title: 'Answer a Poll',
            body: 'One vote per person — results appear after you vote.',
            onTap: () => context.go('/home/polls'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/home/complaints'),
            icon: const Icon(Icons.list_alt),
            label: const Text('View my feedback'),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: color.withValues(alpha: 0.14),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      body,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
