import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/complaint.dart';
import '../../services/complaint_service.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../widgets/auth_sheet.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/eps_ui.dart';
import 'file_complaint_screen.dart';

/// Opens the profile as a slide-up sheet, like every other module.
Future<void> showProfileSheet(BuildContext context) => showEpsSheet<void>(
      context,
      (controller) => ProfileSheet(
        scrollController: controller,
        // the page that opened the sheet stays mounted: what the sheet opens next hangs off it
        parentContext: context,
      ),
    );

/// The profile: a blue header with a gold-ringed avatar, a strip of three numbers about your
/// feedback, then your details, shortcuts and help as soft panels, ending in "Log out".
class ProfileSheet extends StatefulWidget {
  const ProfileSheet({
    super.key,
    required this.scrollController,
    required this.parentContext,
  });

  final ScrollController scrollController;
  final BuildContext parentContext;

  @override
  State<ProfileSheet> createState() => _ProfileSheetState();
}

class _ProfileSheetState extends State<ProfileSheet> {
  late Future<List<Complaint>> _future;

  static const _active = [
    'unverified',
    'verified',
    'pending',
    'unassigned',
    'received',
    'ongoing',
  ];

  @override
  void initState() {
    super.initState();
    _future = context
        .read<ComplaintService>()
        .myComplaints()
        .catchError((_) => <Complaint>[]);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;

    // a destination from inside the sheet: close it first, then go
    final router = GoRouter.of(context);
    void leaveTo(void Function() go) {
      Navigator.of(context).pop();
      go();
    }

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.accent,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      clipBehavior: Clip.antiAlias,
      child: SheetFrame(
        child: Stack(
          children: [
            ListView(
              controller: widget.scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              children: [
                // ---- the header ----
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(22, 0, 22, 74),
                      decoration: const BoxDecoration(
                        gradient: AppTheme.heroGradient,
                        borderRadius: BorderRadius.vertical(
                          bottom: Radius.circular(36),
                        ),
                      ),
                      child: Column(
                        children: [
                          const SizedBox(height: 30),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'PROFILE',
                              style: TextStyle(
                                color: AppTheme.secondary,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.6,
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppTheme.secondary,
                                width: 3,
                              ),
                            ),
                            child: CircleAvatar(
                              radius: 42,
                              backgroundColor: Colors.white,
                              child: Text(
                                user?.initials ?? '?',
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            user?.fullName ?? '',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.secondary.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text(
                              'CITIZEN',
                              style: TextStyle(
                                color: AppTheme.secondary,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // the three numbers, overlapping the header's lower edge
                    Positioned(
                      left: 20,
                      right: 20,
                      bottom: -44,
                      child: FutureBuilder<List<Complaint>>(
                        future: _future,
                        builder: (context, snap) {
                          final all = snap.data ?? const <Complaint>[];
                          final waiting =
                              snap.connectionState == ConnectionState.waiting;
                          String n(int v) => waiting ? '–' : '$v';
                          return Container(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(26),
                              border: Border.all(color: AppTheme.line),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.deep.withValues(alpha: 0.12),
                                  blurRadius: 22,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                _Stat(n(all.length), 'Filed'),
                                const _VDivider(),
                                _Stat(
                                  n(
                                    all
                                        .where(
                                          (c) => _active.contains(c.status),
                                        )
                                        .length,
                                  ),
                                  'In progress',
                                ),
                                const _VDivider(),
                                _Stat(
                                  n(
                                    all
                                        .where((c) => c.status == 'completed')
                                        .length,
                                  ),
                                  'Completed',
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 62),

                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 36),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ---- shortcuts ----
                      const _Group('Shortcuts'),
                      Row(
                        children: [
                          _Tile(
                            Icons.rate_review_rounded,
                            'My feedback',
                            () => leaveTo(() => router.go('/home/complaints')),
                          ),
                          const SizedBox(width: 12),
                          _Tile(
                            Icons.add_comment_rounded,
                            'File new',
                            () => leaveTo(
                              () => showFileFeedbackSheet(widget.parentContext),
                            ),
                            gold: true,
                          ),
                        ],
                      ),

                      // ---- details ----
                      const _Group('Your details'),
                      _Panel(
                        children: [
                          if (user?.email != null)
                            _Row(
                              Icons.mail_outline_rounded,
                              'Email',
                              user!.email!,
                            ),
                          if (user?.phoneNo != null)
                            _Row(
                              Icons.phone_outlined,
                              'Contact no.',
                              user!.phoneNo!,
                            ),
                        ],
                      ),

                      // ---- help ----
                      const _Group('Help'),
                      _Panel(
                        children: [
                          _Row(
                            Icons.verified_outlined,
                            'Verify feedback',
                            'Confirm one you just filed',
                            onTap: () => leaveTo(
                              () => showVerifyComplaintSheet(
                                widget.parentContext,
                              ),
                            ),
                          ),
                          const _Row(
                            Icons.alternate_email_rounded,
                            'Contact us',
                            'cicto@sanfernandocity.gov.ph',
                          ),
                        ],
                      ),

                      // ---- log out ----
                      const SizedBox(height: 22),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppTheme.secondary,
                          foregroundColor: const Color(0xFF1D1D1D),
                          minimumSize: const Size.fromHeight(54),
                          elevation: 0,
                        ),
                        onPressed: () {
                          final auth = context.read<AuthController>();
                          Navigator.of(context).pop();
                          auth.logout();
                        },
                        icon: const Icon(Icons.logout_rounded, size: 20),
                        label: const Text('Log out'),
                      ),
                      const SizedBox(height: 14),
                      const Center(
                        child: Text(
                          'ePS · eParticipation System',
                          style: TextStyle(fontSize: 11, color: AppTheme.mute),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            // the grab handle and the close button float over the header
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
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label);

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.primary,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 11.5, color: AppTheme.mute),
          ),
        ],
      ),
    );
  }
}

class _VDivider extends StatelessWidget {
  const _VDivider();

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 34, color: AppTheme.line);
}

class _Group extends StatelessWidget {
  const _Group(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 22, 4, 10),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppTheme.ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// A square shortcut: an icon tile and its name.
class _Tile extends StatelessWidget {
  const _Tile(this.icon, this.label, this.onTap, {this.gold = false});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool gold;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: gold ? AppTheme.secondary : Colors.white,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: gold ? AppTheme.secondary : AppTheme.line,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 26,
                  color: gold ? const Color(0xFF1D1D1D) : AppTheme.primary,
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: gold ? const Color(0xFF1D1D1D) : AppTheme.ink,
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

/// A rounded panel of rows with hairlines between them.
class _Panel extends StatelessWidget {
  const _Panel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 68, endIndent: 16),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.icon, this.title, this.subtitle, {this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Row(
          children: [
            IconBox(icon, size: 42),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppTheme.mute),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              const Icon(Icons.chevron_right_rounded, color: AppTheme.mute),
          ],
        ),
      ),
    );
  }
}
