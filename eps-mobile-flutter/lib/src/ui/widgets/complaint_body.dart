import 'package:flutter/material.dart';

import '../../models/complaint.dart';
import '../../theme/app_theme.dart';
import 'eps_ui.dart';
import 'status_badge.dart';
import 'evidence_gallery.dart';
import 'format.dart';
import 'status_chip.dart';

/// Read-only rendering of a complaint — status, content, evidence, assigned
/// offices, staff updates and history, shown in the feedback detail.
class ComplaintBody extends StatelessWidget {
  const ComplaintBody({
    super.key,
    required this.complaint,
    this.showHeader = true,
  });
  final Complaint complaint;

  /// The blue reference card at the top; the detail page shows it in its own header instead.
  final bool showHeader;

  @override
  Widget build(BuildContext context) {
    final c = complaint;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showHeader) ...[
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppTheme.heroGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'FEEDBACK',
                      style: TextStyle(
                        color: AppTheme.secondary,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                      ),
                    ),
                    const Spacer(),
                    StatusChip(c.status),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  c.referenceNo,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Filed ${formatDate(c.createdAt)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],
        InfoBlock(
          title: 'where it stands',
          child: _Progress(_steps(c)),
        ),
        InfoBlock(
          title: 'what you reported',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                c.content,
                style: const TextStyle(height: 1.55, color: Color(0xFF3A4A68)),
              ),
              if (c.files.isNotEmpty) ...[
                const SizedBox(height: 14),
                EvidenceGallery(files: c.files),
              ],
            ],
          ),
        ),
        InfoBlock(
          title: 'handled by',
          child: c.offices.isEmpty
              ? const Text(
                  'Not yet assigned to any office.',
                  style: TextStyle(color: AppTheme.mute),
                )
              : Column(
                  children: [
                    for (var i = 0; i < c.offices.length; i++) ...[
                      if (i > 0) const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              c.offices[i].label,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          StatusBadge(c.offices[i].status),
                        ],
                      ),
                    ],
                  ],
                ),
        ),
        if (_officeSatisfaction(c).isNotEmpty)
          InfoBlock(
            title: 'your satisfaction',
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final s in _officeSatisfaction(c)) _SatisfactionChip(s),
              ],
            ),
          ),
        if (c.responses.isNotEmpty) ...[
          SectionLabel('updates', trailing: '${c.responses.length}'),
          for (final r in c.responses) _ResponseTile(r),
        ],
        if (c.history.isNotEmpty)
          InfoBlock(
            title: 'history',
            child: Column(
              children: [
                for (var i = 0; i < c.history.length; i++)
                  Padding(
                    padding: EdgeInsets.only(
                      bottom: i == c.history.length - 1 ? 0 : 12,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          margin: const EdgeInsets.only(top: 5),
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                c.history[i].description,
                                style: const TextStyle(height: 1.4),
                              ),
                              Text(
                                formatDate(c.history[i].createdAt),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.mute,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  /// "Where it stands": the path a feedback takes, each step done / current / still to
  /// come. A cancelled one stops where it reached and shows a red cross after it.
  static List<_Step> _steps(Complaint c) {
    final active = c.offices;
    final answered = c.responses.any((r) => r.author?.role != 'citizen');
    final reached = [
      true, // filed
      c.status != 'unverified', // verified
      active.isNotEmpty, // routed to an office
      active
          .any((o) => ['received', 'ongoing', 'completed'].contains(o.status)),
      answered ||
          active.any((o) => ['ongoing', 'completed'].contains(o.status)),
      c.status == 'completed', // done
    ];
    const defs = [
      ('Filed', Icons.send_outlined),
      ('Verified', Icons.verified_outlined),
      ('Routed', Icons.account_tree_outlined),
      ('Received', Icons.inbox_outlined),
      ('Responded', Icons.chat_outlined),
      ('Done', Icons.flag_outlined),
    ];
    final lastDone = reached.lastIndexOf(true);
    final steps = <_Step>[
      for (var i = 0; i < defs.length; i++)
        _Step(
          defs[i].$1,
          defs[i].$2,
          i <= lastDone
              ? _StepState.done
              : (i == lastDone + 1 && c.status != 'cancelled'
                  ? _StepState.now
                  : _StepState.todo),
        ),
    ];
    if (c.status == 'cancelled') {
      steps.add(const _Step('Cancelled', Icons.close_rounded, _StepState.bad));
    }
    return steps;
  }

  /// Average of the stars this citizen left on each office's responses, per
  /// office — the "overall rating" for that office on this complaint.
  static List<_OfficeSatisfaction> _officeSatisfaction(Complaint c) {
    final byOffice = <String, List<int>>{};
    for (final r in c.responses) {
      if (r.author?.role == 'citizen') continue; // own follow-ups aren't rated
      if (r.myRating <= 0) continue;
      byOffice.putIfAbsent(r.department, () => []).add(r.myRating);
    }
    return byOffice.entries.map((e) {
      final avg = e.value.reduce((a, b) => a + b) / e.value.length;
      return _OfficeSatisfaction(e.key, avg, e.value.length);
    }).toList();
  }
}

class _OfficeSatisfaction {
  _OfficeSatisfaction(this.label, this.avg, this.count);
  final String label;
  final double avg;
  final int count;
}

class _SatisfactionChip extends StatelessWidget {
  const _SatisfactionChip(this.s);
  final _OfficeSatisfaction s;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.accent,
        border: Border.all(color: AppTheme.line),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.label.toUpperCase(),
            style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Text(
                s.avg.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 4),
              _Stars(s.avg),
              const SizedBox(width: 4),
              Text(
                '(${s.count})',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Read-only 5-star row supporting a fractional value (for averages).
class _Stars extends StatelessWidget {
  const _Stars(this.value);
  final double value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final filled = value >= i + 1;
        final half = !filled && value > i + 0.25;
        return Icon(
          filled
              ? Icons.star
              : half
                  ? Icons.star_half
                  : Icons.star_border,
          size: 15,
          color: Colors.amber,
        );
      }),
    );
  }
}

class _ResponseTile extends StatelessWidget {
  const _ResponseTile(this.response);
  final ComplaintResponse response;

  @override
  Widget build(BuildContext context) {
    final r = response;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE6ECF5)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppTheme.primary,
                child: Text(
                  r.author?.initials ?? '?',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.author?.fullName ?? 'City Hall',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${r.department} · ${timeAgo(r.createdAt)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(r.content),
          if (r.files.isNotEmpty) ...[
            const SizedBox(height: 8),
            EvidenceGallery(files: r.files),
          ],
          if (r.myRating > 0) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  'You rated ',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
                _Stars(r.myRating.toDouble()),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

enum _StepState { done, now, todo, bad }

class _Step {
  const _Step(this.label, this.icon, this.state);
  final String label;
  final IconData icon;
  final _StepState state;
}

class _Progress extends StatelessWidget {
  const _Progress(this.steps);
  final List<_Step> steps;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == 0
                            ? Colors.transparent
                            : (steps[i].state == _StepState.todo
                                ? const Color(0xFFDCE4F0)
                                : (steps[i].state == _StepState.bad
                                    ? const Color(0xFFC10015)
                                    : AppTheme.primary)),
                      ),
                    ),
                    _dot(steps[i]),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: Colors.transparent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  steps[i].label.toUpperCase(),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  style: TextStyle(
                    fontSize: 7.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                    color: steps[i].state == _StepState.todo
                        ? AppTheme.body
                        : AppTheme.ink,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _dot(_Step s) {
    final done = s.state == _StepState.done;
    final bad = s.state == _StepState.bad;
    final now = s.state == _StepState.now;
    final color = bad ? const Color(0xFFC10015) : AppTheme.primary;
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: (done || bad) ? color : Colors.white,
        border: Border.all(
          color: (done || bad || now) ? color : const Color(0xFFDCE4F0),
          width: 2,
        ),
        boxShadow: now
            ? [BoxShadow(color: color.withValues(alpha: 0.18), spreadRadius: 4)]
            : null,
      ),
      child: Icon(
        done ? Icons.check_rounded : s.icon,
        size: 14,
        color: (done || bad)
            ? Colors.white
            : (now ? color : const Color(0xFF9AA7BA)),
      ),
    );
  }
}

/// How far along a feedback is, 0..1, from its status alone — the six steps of the
/// "where it stands" path (filed, verified, routed, received, responded, done).
double complaintProgress(String status) {
  switch (status) {
    case 'unverified':
      return 1 / 6;
    case 'verified':
      return 2 / 6;
    case 'unassigned':
      return 2 / 6;
    case 'pending':
      return 3 / 6;
    case 'received':
      return 4 / 6;
    case 'ongoing':
      return 5 / 6;
    case 'completed':
      return 1;
    default:
      return 0.05;
  }
}
