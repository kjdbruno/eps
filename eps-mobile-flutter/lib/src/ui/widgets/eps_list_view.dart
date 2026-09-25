import 'package:flutter/material.dart';

import '../../api/api_exception.dart';

/// The shared list layout used by the complaints / discussions / polls screens,
/// matching the external web client: a "N of M" count line, a search field, and
/// a single bordered card holding separated rows (not one card per item).
class EpsListView<T> extends StatefulWidget {
  const EpsListView({
    super.key,
    required this.loader,
    required this.rowBuilder,
    required this.matches,
    required this.noun,
    required this.searchHint,
    required this.emptyIcon,
    required this.emptyText,
    required this.loadingText,
  });

  /// Builds the future each time the list needs (re)loading.
  final Future<List<T>> Function() loader;
  final Widget Function(BuildContext context, T item) rowBuilder;

  /// Whether [item] matches the current search query (already lower-cased).
  final bool Function(T item, String query) matches;

  /// Singular noun for the count line — "complaint" &rarr; "3 of 5 complaints".
  final String noun;
  final String searchHint;
  final IconData emptyIcon;
  final String emptyText;
  final String loadingText;

  @override
  State<EpsListView<T>> createState() => EpsListViewState<T>();
}

class EpsListViewState<T> extends State<EpsListView<T>> {
  final _searchCtrl = TextEditingController();
  late Future<List<T>> _future;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = widget.loader();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    setState(() => _future = widget.loader());
    await _future.catchError((_) => <T>[]);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<T>>(
      future: _future,
      builder: (context, snap) {
        final loading = snap.connectionState == ConnectionState.waiting;
        final error = snap.hasError;
        final all = snap.data ?? const [];
        final filtered = _query.isEmpty
            ? all
            : all.where((e) => widget.matches(e, _query)).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!loading && !error)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        '${filtered.length} of ${all.length} ${widget.noun}${all.length == 1 ? '' : 's'}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ),
                  TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: widget.searchHint,
                      prefixIcon: const Icon(Icons.search, size: 18),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: reload,
                child: _body(loading, error, snap.error, filtered, all.isEmpty),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _body(
    bool loading,
    bool error,
    Object? err,
    List<T> filtered,
    bool sourceEmpty,
  ) {
    if (loading) {
      return _centered(
        const CircularProgressIndicator(),
        widget.loadingText,
      );
    }
    if (error) {
      final message = err is ApiException ? err.message : 'Something went wrong.';
      return _centered(
        const Icon(Icons.cloud_off, size: 40, color: Colors.grey),
        message,
        action: OutlinedButton(onPressed: reload, child: const Text('Retry')),
      );
    }
    if (filtered.isEmpty) {
      return _centered(
        Icon(widget.emptyIcon, size: 36, color: Colors.grey.shade400),
        sourceEmpty ? widget.emptyText : 'Nothing matches "$_query".',
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
          ),
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            children: [
              for (var i = 0; i < filtered.length; i++) ...[
                if (i > 0)
                  const Divider(height: 1, indent: 16, endIndent: 16),
                widget.rowBuilder(context, filtered[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _centered(Widget icon, String text, {Widget? action}) {
    // Wrapped in a scrollable so RefreshIndicator still works when there's no list.
    return ListView(
      children: [
        const SizedBox(height: 100),
        Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                icon,
                const SizedBox(height: 12),
                Text(
                  text,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                if (action != null) ...[
                  const SizedBox(height: 16),
                  action,
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// One row inside [EpsListView]'s card — matches the external `q-item`:
/// status-tinted round avatar, bold title + caption, trailing badge column.
class EpsListRow extends StatelessWidget {
  const EpsListRow({
    super.key,
    required this.leadingColor,
    required this.leadingIcon,
    required this.title,
    required this.subtitle,
    required this.trailing,
    required this.onTap,
    this.subtitleMaxLines = 1,
  });

  final Color leadingColor;
  final IconData leadingIcon;
  final String title;
  final String subtitle;
  final List<Widget> trailing;
  final VoidCallback onTap;
  final int subtitleMaxLines;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: leadingColor,
              child: Icon(leadingIcon, color: Colors.white, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: subtitleMaxLines,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < trailing.length; i++) ...[
                  if (i > 0) const SizedBox(height: 4),
                  trailing[i],
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
