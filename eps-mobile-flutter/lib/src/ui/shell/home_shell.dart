import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Bottom-nav container for the authenticated area. The web client uses a top
/// header with links; on mobile these become tabs.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  static const _tabs = [
    (icon: Icons.home_outlined, active: Icons.home, label: 'Home'),
    (
      icon: Icons.description_outlined,
      active: Icons.description,
      label: 'Feedback',
    ),
    (icon: Icons.forum_outlined, active: Icons.forum, label: 'Discussions'),
    (icon: Icons.bar_chart_outlined, active: Icons.bar_chart, label: 'Polls'),
    (icon: Icons.person_outline, active: Icons.person, label: 'Account'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(
          i,
          initialLocation: i == shell.currentIndex,
        ),
        destinations: [
          for (final t in _tabs)
            NavigationDestination(
              icon: Icon(t.icon),
              selectedIcon: Icon(t.active),
              label: t.label,
            ),
        ],
      ),
    );
  }
}
