import 'package:intl/intl.dart';

final _dateFmt = DateFormat('MMM dd, yyyy hh:mm a');

String formatDate(DateTime? d) => d == null ? '' : _dateFmt.format(d);

String timeAgo(DateTime? d) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return _dateFmt.format(d);
}
