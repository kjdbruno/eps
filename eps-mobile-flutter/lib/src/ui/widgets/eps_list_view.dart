import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../realtime/live_refresh.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import 'eps_ui.dart';
import 'eps_loader.dart';

/// The slate page colour the list screens sit on, with light cards on top.
const kListBackground = Color(0xFFF6F9FC);

/// A filter chip for [EpsListView]: a label and the test an item must pass.
class EpsFilter<T> {
  const EpsFilter(this.label, this.test);
  final String label;
  final bool Function(T item) test;
}

/// A dark list page: a big title (with a line under it) and round action buttons at the top,
/// then whatever [child] is — the shared frame of the feedback / discussions / polls lists.
class ListPage extends StatelessWidget {
  const ListPage({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.actions = const [],
    this.onBack,
    this.heroColors,
    this.heroTag,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final VoidCallback? onBack;

  /// When set, the heading and the [actions] sit in a header band painted with this gradient (the
  /// section's colours, e.g. `DetailColors.feedback`) instead of directly on the page.
  final List<Color>? heroColors;

  /// The small gold label above the title in the header band.
  final String? heroTag;

  @override
  Widget build(BuildContext context) {
    final signedIn = context.watch<AuthController>().isAuthenticated;
    if (heroColors != null) return _hero(context, signedIn);
    return Scaffold(
      backgroundColor: kListBackground,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!signedIn || onBack != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
                child: Row(
                  children: [
                    if (!signedIn) ...[
                      const HomeCircle(),
                      const SizedBox(width: 10),
                    ],
                    if (onBack != null)
                      CircleAction(
                        icon: Icons.arrow_back_rounded,
                        onTap: onBack!,
                      ),
                  ],
                ),
              ),
            Padding(
              padding: EdgeInsets.fromLTRB(22, signedIn ? 18 : 10, 22, 4),
              child: Text(
                title,
                style: const TextStyle(
                  color: AppTheme.ink,
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  height: 1.1,
                ),
              ),
            ),
            if (subtitle != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 0, 22, 6),
                child: Text(
                  subtitle!,
                  style: TextStyle(
                    color: AppTheme.mute,
                    fontSize: 13,
                  ),
                ),
              ),
            // the page's actions: equal-width buttons right under the heading
            if (actions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 10, 22, 4),
                child: Row(
                  children: [
                    for (var i = 0; i < actions.length; i++) ...[
                      if (i > 0) const SizedBox(width: 10),
                      Expanded(child: actions[i]),
                    ],
                  ],
                ),
              ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }

  /// The header-band version: the section's gradient with soft circles, a gold label, the title,
  /// the subtitle and the actions; the list sits on the light page below it.
  Widget _hero(BuildContext context, bool signedIn) {
    // the section colours are light and take dark text; only a dark band takes white
    final light = heroColors![1].computeLuminance() > 0.28;
    final ink = light ? const Color(0xFF1D1D1D) : Colors.white;
    final tagColor = light ? ink.withValues(alpha: 0.72) : AppTheme.secondary;
    return Scaffold(
      backgroundColor: kListBackground,
      body: Column(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: heroColors!,
              ),
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(34)),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.deep.withValues(alpha: 0.25),
                  blurRadius: 22,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                Positioned(
                  right: -50,
                  top: -60,
                  child: Container(
                    width: 190,
                    height: 190,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color:
                          Colors.white.withValues(alpha: light ? 0.28 : 0.08),
                    ),
                  ),
                ),
                Positioned(
                  left: -70,
                  bottom: -90,
                  child: Container(
                    width: 190,
                    height: 190,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: (light ? Colors.white : AppTheme.secondary)
                          .withValues(alpha: light ? 0.22 : 0.12),
                    ),
                  ),
                ),
                SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 14, 22, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (!signedIn) ...[
                              HomeCircle(light: light),
                              const SizedBox(width: 10),
                            ],
                            if (heroTag != null)
                              Text(
                                heroTag!.toUpperCase(),
                                style: TextStyle(
                                  color: tagColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.6,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          title,
                          style: TextStyle(
                            color: ink,
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            height: 1.1,
                          ),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            subtitle!,
                            style: TextStyle(
                              color: ink.withValues(alpha: 0.78),
                              fontSize: 13,
                              height: 1.45,
                            ),
                          ),
                        ],
                        if (actions.isNotEmpty) ...[
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              for (var i = 0; i < actions.length; i++) ...[
                                if (i > 0) const SizedBox(width: 10),
                                Expanded(child: actions[i]),
                              ],
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

/// A small round button on a dark page (back, add, filter...).
class CircleAction extends StatelessWidget {
  const CircleAction({
    super.key,
    required this.icon,
    required this.onTap,
    this.label,
    this.filled = false,
  });

  final IconData icon;
  final VoidCallback onTap;

  /// When set, the button is a pill with this text beside the icon.
  final String? label;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final bg = filled ? AppTheme.secondary : Colors.white;
    final fg = filled ? const Color(0xFF1D1D1D) : AppTheme.primary;
    final edge =
        BorderSide(color: filled ? AppTheme.secondary : AppTheme.field);
    return Material(
      color: bg,
      shape:
          label == null ? CircleBorder(side: edge) : StadiumBorder(side: edge),
      child: InkWell(
        customBorder:
            label == null ? const CircleBorder() : const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: label == null
              ? const EdgeInsets.all(11)
              : const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: fg),
              if (label != null) ...[
                const SizedBox(width: 6),
                Text(
                  label!,
                  style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// The shared list body: a search field, filter pills with counts, and one card per item,
/// on a dark page.
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
    this.filters = const [],
    this.accent = AppTheme.primary,
    this.live = const [],
  });

  /// The section's colour: the selected filter pill and the search field's focus ring.
  final Color accent;

  /// Builds the future each time the list needs (re)loading.
  final Future<List<T>> Function() loader;
  final Widget Function(BuildContext context, T item) rowBuilder;

  /// Whether [item] matches the current search query (already lower-cased).
  final bool Function(T item, String query) matches;

  /// Singular noun for the empty text.
  final String noun;
  final String searchHint;
  final IconData emptyIcon;
  final String emptyText;
  final String loadingText;

  /// Pills under the search field; the first one is the default ("All").
  final List<EpsFilter<T>> filters;

  /// The modules whose changes reload this list by themselves ('discussion', 'poll', 'complaint').
  final List<String> live;

  @override
  State<EpsListView<T>> createState() => EpsListViewState<T>();
}

class EpsListViewState<T> extends State<EpsListView<T>> {
  final _searchCtrl = TextEditingController();
  late Future<List<T>> _future;
  String _query = '';
  int _filter = 0;

  LiveRefresh? _live;

  @override
  void initState() {
    super.initState();
    _future = widget.loader();
    if (widget.live.isNotEmpty) {
      _live = LiveRefresh.listen(context, widget.live, _reloadQuietly);
    }
  }

  @override
  void dispose() {
    _live?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  /// Loads the list again and swaps it in when it arrives: what is on screen (the search, the filter, the scroll
  /// position) stays, with no loader in between.
  Future<void> _reloadQuietly() async {
    final next = widget.loader();
    await next;
    if (!mounted) return;
    setState(() => _future = next);
  }

  Future<void> reload() async {
    setState(() {
      _future = widget.loader();
    });
    await _future.catchError((_) => <T>[]);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<T>>(
      future: _future,
      builder: (context, snap) {
        final loading = snap.connectionState == ConnectionState.waiting;
        final error = snap.hasError;
        final all = snap.data ?? <T>[];
        final byFilter = widget.filters.isEmpty || _filter == 0
            ? all
            : all.where(widget.filters[_filter].test).toList();
        final filtered = _query.isEmpty
            ? byFilter
            : byFilter.where((e) => widget.matches(e, _query)).toList();

        return EpsRefresh(
          onRefresh: reload,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            children: [
              if (!loading && !error && all.isNotEmpty) ...[
                _search(),
                if (widget.filters.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (var i = 0; i < widget.filters.length; i++) ...[
                          if (i > 0) const SizedBox(width: 8),
                          _pill(
                            i == 0
                                ? '${widget.filters[i].label} · ${all.length}'
                                : '${widget.filters[i].label} · ${all.where(widget.filters[i].test).length}',
                            _filter == i,
                            () => setState(() => _filter = i),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 14),
              ],
              ..._body(loading, error, snap.error, filtered, all.isEmpty),
            ],
          ),
        );
      },
    );
  }

  Widget _search() {
    OutlineInputBorder b(Color c) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: BorderSide(color: c),
        );
    return TextField(
      controller: _searchCtrl,
      style: const TextStyle(color: AppTheme.ink),
      onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white,
        hintText: widget.searchHint,
        hintStyle: const TextStyle(color: AppTheme.mute),
        prefixIcon: Icon(
          Icons.search_rounded,
          size: 20,
          color: AppTheme.mute,
        ),
        suffixIcon: _query.isEmpty
            ? null
            : IconButton(
                icon: const Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: AppTheme.mute,
                ),
                onPressed: () {
                  _searchCtrl.clear();
                  setState(() => _query = '');
                },
              ),
        border: b(AppTheme.line),
        enabledBorder: b(AppTheme.line),
        focusedBorder: b(widget.accent),
      ),
    );
  }

  Widget _pill(String label, bool selected, VoidCallback onTap) {
    return Material(
      color: selected ? widget.accent : Colors.white,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? widget.accent : AppTheme.line,
        ),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: selected
                  ? AppTheme.onTone(widget.accent)
                  : const Color(0xFF4C5C79),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _body(
    bool loading,
    bool error,
    Object? err,
    List<T> filtered,
    bool sourceEmpty,
  ) {
    TextStyle white([double o = 1]) =>
        TextStyle(color: o == 1 ? AppTheme.ink : AppTheme.body);
    if (loading) {
      return [
        const SizedBox(height: 90),
        EpsLoader(caption: widget.loadingText),
      ];
    }
    if (error) {
      final message =
          err is ApiException ? err.message : 'Something went wrong.';
      return [
        const SizedBox(height: 60),
        Icon(
          Icons.cloud_off_rounded,
          size: 44,
          color: AppTheme.mute,
        ),
        const SizedBox(height: 10),
        Text(
          'Could not load',
          textAlign: TextAlign.center,
          style: white().copyWith(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(message, textAlign: TextAlign.center, style: white(0.7)),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(140, 46),
              foregroundColor: AppTheme.primary,
              side: const BorderSide(color: AppTheme.primary),
            ),
            onPressed: reload,
            child: const Text('Retry'),
          ),
        ),
      ];
    }
    if (filtered.isEmpty) {
      return [
        const SizedBox(height: 60),
        Icon(
          sourceEmpty ? widget.emptyIcon : Icons.filter_alt_outlined,
          size: 46,
          color: AppTheme.mute,
        ),
        const SizedBox(height: 10),
        Text(
          sourceEmpty ? widget.emptyText : 'Nothing in this view',
          textAlign: TextAlign.center,
          style: white().copyWith(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        if (!sourceEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'No ${widget.noun} matches your search or filter.',
            textAlign: TextAlign.center,
            style: white(0.7),
          ),
        ],
      ];
    }
    return [
      for (var i = 0; i < filtered.length; i++) ...[
        if (i > 0) const SizedBox(height: 12),
        widget.rowBuilder(context, filtered[i]),
      ],
    ];
  }
}

/// One card in a list: a round icon, a title with a caption, a status pill at the top right,
/// three small labelled facts, and a line at the bottom with a round arrow.
class EpsInfoCard extends StatelessWidget {
  const EpsInfoCard({
    super.key,
    required this.icon,
    required this.title,
    required this.caption,
    required this.badge,
    required this.facts,
    required this.footer,
    required this.onTap,
    this.accent = AppTheme.primary,
    this.progress,
  });

  final IconData icon;
  final Color accent;
  final String title;
  final String caption;
  final Widget badge;

  /// Up to three `(label, value)` pairs shown in a row.
  final List<(String, String)> facts;
  final String footer;
  final VoidCallback onTap;

  /// 0..1 — a thin bar under the facts.
  final double? progress;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 1.5,
      shadowColor: AppTheme.deep.withValues(alpha: 0.14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(26),
        side: const BorderSide(color: AppTheme.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: accent.withValues(alpha: 0.14),
                    ),
                    child: Icon(icon, color: accent, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            height: 1.25,
                            color: AppTheme.ink,
                          ),
                        ),
                        Text(
                          caption,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.mute,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  badge,
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  for (final f in facts)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            f.$1,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.mute,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            f.$2,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              if (progress != null) ...[
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progress!.clamp(0.0, 1.0),
                    minHeight: 5,
                    backgroundColor: const Color(0xFFEEF2F8),
                    color: accent,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      footer,
                      style:
                          const TextStyle(fontSize: 12, color: AppTheme.body),
                    ),
                  ),
                  Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
