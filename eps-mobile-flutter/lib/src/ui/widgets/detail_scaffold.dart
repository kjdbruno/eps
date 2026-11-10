import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../state/auth_controller.dart';
import '../../theme/app_theme.dart';
import 'eps_ui.dart';
import 'eps_loader.dart';

/// The colours of each kind of detail page's top.
class DetailColors {
  const DetailColors._();

  /// Light blue (#68AFF1) — feedback.
  static const feedback = [
    Color(0xFF9CCBF6),
    AppTheme.feedbackColor,
    AppTheme.feedbackDeep,
  ];

  /// Orange (#DB812C) — discussions.
  static const discussion = [
    Color(0xFFEBA565),
    AppTheme.discussionColor,
    AppTheme.discussionDeep,
  ];

  /// Yellow (#EEC336) — surveys (the server still calls them polls).
  static const poll = [
    Color(0xFFF6DB78),
    AppTheme.surveyColor,
    AppTheme.surveyDeep,
  ];
}

/// A detail page laid out like a travel app's destination page: a coloured scene on top with a
/// round back button, and a white sheet with rounded corners rising over it that holds the
/// content. An optional bar stays pinned under the sheet (a comment box, for instance).
class DetailScaffold extends StatelessWidget {
  const DetailScaffold({
    super.key,
    required this.colors,
    required this.icon,
    required this.children,
    this.tag,
    this.trailing,
    this.bottomBar,
    this.onRefresh,
    this.scrollController,
  });

  final List<Color> colors;
  final IconData icon;

  /// Set when the page is shown in a slide-up sheet (see [showEpsSheet]): the layout becomes a
  /// sheet — a coloured header with a grab handle and a close button over a white scrolling body.
  final ScrollController? scrollController;

  /// A short label shown low in the scene, e.g. "Public discussion".
  final String? tag;

  /// A round button on the right of the top row.
  final Widget? trailing;
  final List<Widget> children;
  final Widget? bottomBar;
  final Future<void> Function()? onRefresh;

  static const double _scene = 250;

  /// The slide-up version of the page.
  Widget _sheet(BuildContext context) {
    // the section colours are light: dark text on them, white only on a dark band
    final gold = colors[1].computeLuminance() > 0.28;
    final ink = gold ? const Color(0xFF1D1D1D) : Colors.white;
    final list = ListView(
      controller: scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(22, 16, 22, 32),
      children: children,
    );
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      clipBehavior: Clip.antiAlias,
      child: SheetFrame(
        bottomBar: bottomBar,
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(22, 10, 10, 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: colors,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: ink.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(icon, size: 18, color: ink),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          (tag ?? '').toUpperCase(),
                          style: TextStyle(
                            color: gold ? ink : AppTheme.secondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                      IconButton(
                        color: ink,
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: onRefresh == null
                  ? list
                  : EpsRefresh(onRefresh: onRefresh!, child: list),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (scrollController != null) return _sheet(context);
    final list = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 28),
      children: children,
    );
    return Scaffold(
      backgroundColor: colors[2],
      // the body is handed loose constraints, so without this the Stack would shrink to its
      // first children and leave the sheet only a few pixels tall
      body: SizedBox.expand(
        child: Stack(
          children: [
            // ---- the scene ----
            Container(
              height: _scene + 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: colors,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -30,
                    top: 30,
                    child: Icon(
                      icon,
                      size: 250,
                      color: Colors.white.withValues(alpha: 0.14),
                    ),
                  ),
                  Positioned(
                    left: -70,
                    top: -70,
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                  ),
                  if (tag != null)
                    Positioned(
                      left: 22,
                      bottom: 62,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          tag!.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ---- the top row ----
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Row(
                  children: [
                    // a signed-out visitor gets the same translucent home button as the other
                    // pages (it already leads out); a signed-in user gets the back arrow
                    if (context.watch<AuthController>().isAuthenticated)
                      _Round(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop(),
                      )
                    else
                      const HomeCircle(),
                    const Spacer(),
                    if (trailing != null) trailing!,
                  ],
                ),
              ),
            ),

            // ---- the sheet ----
            Positioned.fill(
              top: _scene,
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(34)),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD5DCE8),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Expanded(
                      child: onRefresh == null
                          ? list
                          : EpsRefresh(
                              onRefresh: onRefresh!,
                              child: list,
                            ),
                    ),
                    if (bottomBar != null) bottomBar!,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A white round button on the coloured scene.
class _Round extends StatelessWidget {
  const _Round({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(11),
          child: Icon(icon, size: 20, color: AppTheme.ink),
        ),
      ),
    );
  }
}

/// A title with a status chip beside it, and a small line of facts under — the head of the sheet.
class SheetHead extends StatelessWidget {
  const SheetHead({
    super.key,
    required this.title,
    required this.chip,
    this.facts = const [],
  });

  final String title;
  final Widget chip;

  /// `(icon, text)` pairs shown under the title.
  final List<(IconData, String)> facts;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                  color: AppTheme.ink,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Padding(padding: const EdgeInsets.only(top: 6), child: chip),
          ],
        ),
        if (facts.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 16,
            runSpacing: 6,
            children: [
              for (final f in facts)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(f.$1, size: 15, color: AppTheme.primary),
                    const SizedBox(width: 6),
                    Text(
                      f.$2,
                      style:
                          const TextStyle(fontSize: 12.5, color: AppTheme.body),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Text that shows three lines and a "Read more" link — the description of a detail page.
class ReadMore extends StatefulWidget {
  const ReadMore(this.text, {super.key, this.lines = 3});

  final String text;
  final int lines;

  @override
  State<ReadMore> createState() => _ReadMoreState();
}

class _ReadMoreState extends State<ReadMore> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    const style =
        TextStyle(height: 1.6, color: Color(0xFF3A4A68), fontSize: 14);
    return LayoutBuilder(
      builder: (context, box) {
        final painter = TextPainter(
          text: TextSpan(text: widget.text, style: style),
          maxLines: widget.lines,
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: box.maxWidth);
        final overflows = painter.didExceedMaxLines;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.text,
              maxLines: _open ? null : widget.lines,
              overflow: _open ? TextOverflow.visible : TextOverflow.ellipsis,
              style: style,
            ),
            if (overflows)
              GestureDetector(
                onTap: () => setState(() => _open = !_open),
                child: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    _open ? 'Show less' : 'Read more',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      decoration: TextDecoration.underline,
                      color: AppTheme.ink,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// "Upcoming tours  — See all": a section title with an optional link on the right.
class SheetSection extends StatelessWidget {
  const SheetSection(this.title, {super.key, this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 22, 0, 12),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: AppTheme.ink,
              ),
            ),
          ),
          if (trailing != null)
            Text(
              trailing!,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppTheme.ink,
                decoration: TextDecoration.underline,
              ),
            ),
        ],
      ),
    );
  }
}

/// Loads a [future], showing the coloured detail frame with a spinner (or a retry) in the
/// sheet meanwhile, then the page [builder] makes once the data is in.
class DetailLoader<T> extends StatelessWidget {
  const DetailLoader({
    super.key,
    required this.future,
    required this.colors,
    required this.icon,
    required this.builder,
    this.onRetry,
    this.scrollController,
  });

  final Future<T> future;
  final List<Color> colors;
  final IconData icon;
  final ScrollController? scrollController;
  final Widget Function(BuildContext context, T data) builder;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snap) {
        // the loader only on the very first load: while the same page loads again (a new comment, a
        // vote) what is on screen stays, so the scroll position and the composer are not lost
        if (snap.connectionState == ConnectionState.waiting &&
            snap.data == null) {
          return DetailScaffold(
            colors: colors,
            icon: icon,
            scrollController: scrollController,
            children: const [
              Padding(
                padding: EdgeInsets.only(top: 80),
                child: EpsLoader(),
              ),
            ],
          );
        }
        if (snap.hasError) {
          final err = snap.error;
          return DetailScaffold(
            colors: colors,
            icon: icon,
            scrollController: scrollController,
            children: [
              EmptyState(
                icon: Icons.cloud_off_rounded,
                title: 'Could not load',
                text:
                    err is ApiException ? err.message : 'Something went wrong.',
                action: onRetry == null
                    ? null
                    : OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(140, 46),
                        ),
                        onPressed: onRetry,
                        child: const Text('Retry'),
                      ),
              ),
            ],
          );
        }
        return builder(context, snap.data as T);
      },
    );
  }
}

/// Opens a page as a sheet that slides up over the app (above the navigation bar), the same way
/// the notifications do. [builder] gets the sheet's scroll controller, to hand to the page.
Future<T?> showEpsSheet<T>(
  BuildContext context,
  Widget Function(ScrollController controller) builder,
) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    // over the whole app, so the floating navigation bar does not sit on top of the sheet
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => Padding(
      // lift the sheet above the keyboard
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.97,
        builder: (context, controller) => builder(controller),
      ),
    ),
  );
}

/// The frame a sheet's content sits in: its own [ScaffoldMessenger] and [Scaffold], so a toast
/// raised inside the sheet (an error, "saved") shows on top of the sheet instead of on the page
/// behind it, where the sheet would hide it. [bottomBar] stays pinned under the body, and the
/// toast floats above it.
class SheetFrame extends StatelessWidget {
  const SheetFrame({super.key, required this.child, this.bottomBar});

  final Widget child;
  final Widget? bottomBar;

  @override
  Widget build(BuildContext context) {
    return ScaffoldMessenger(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        // the sheet is already lifted above the keyboard (see showEpsSheet)
        resizeToAvoidBottomInset: false,
        body: child,
        bottomNavigationBar: bottomBar,
      ),
    );
  }
}
