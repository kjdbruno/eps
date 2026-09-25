import 'package:flutter/material.dart';

import '../../models/complaint.dart';
import '../../theme/app_theme.dart';
import 'evidence_gallery.dart';
import 'format.dart';
import 'status_chip.dart';

/// Read-only rendering of a complaint — status, content, evidence, assigned
/// offices, staff updates and history. Shared by the track result and the
/// account complaint-detail screen.
class ComplaintBody extends StatelessWidget {
  const ComplaintBody({super.key, required this.complaint});
  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final c = complaint;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                c.referenceNo,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            StatusChip(c.status),
          ],
        ),
        Text(
          'filed ${formatDate(c.createdAt)}',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        _label('Feedback'),
        Text(c.content),
        if (c.files.isNotEmpty) ...[
          const SizedBox(height: 16),
          _label('Evidence'),
          EvidenceGallery(files: c.files),
        ],
        if (c.offices.isNotEmpty) ...[
          const SizedBox(height: 16),
          _label('Assigned offices'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final o in c.offices)
                Chip(
                  backgroundColor:
                      AppTheme.statusColor(o.status).withValues(alpha: 0.14),
                  label: Text('${o.label} — ${o.status}'),
                  labelStyle: TextStyle(
                    color: AppTheme.statusColor(o.status),
                    fontSize: 12,
                  ),
                ),
            ],
          ),
        ],
        if (_officeSatisfaction(c).isNotEmpty) ...[
          const SizedBox(height: 20),
          _label('Your satisfaction'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in _officeSatisfaction(c)) _SatisfactionChip(s),
            ],
          ),
        ],
        if (c.responses.isNotEmpty) ...[
          const SizedBox(height: 20),
          _label('Updates'),
          for (final r in c.responses) _ResponseTile(r),
        ],
        if (c.history.isNotEmpty) ...[
          const SizedBox(height: 20),
          _label('History'),
          for (final h in c.history)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(h.description),
                  Text(
                    formatDate(h.createdAt),
                    style:
                        TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
        ],
      ],
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
            color: Colors.grey,
          ),
        ),
      );

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
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(10),
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
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(10),
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
                  style:
                      TextStyle(fontSize: 11, color: Colors.grey.shade600),
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
