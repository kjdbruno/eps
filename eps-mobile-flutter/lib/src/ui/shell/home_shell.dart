import 'package:bootstrap_icons/bootstrap_icons.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';

/// The signed-in area's navigation: a floating, fully rounded ePS-blue bar. The tab you are on is a
/// white pill holding its blue icon and its name; the others are quiet light-blue
/// icons. Changing tab slides the pill to the new tab, to the right or the left depending on where
/// that tab is, while it opens up there and the old tab folds back to an icon.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  // The same icons as the staff web app's menu: house, chat-quote (feedback), people (discussion)
  // and bar-chart (poll). Profile is not a tab: it is a sheet opened from the avatar on Home.
  static const _tabs = [
    (
      icon: BootstrapIcons.house,
      active: BootstrapIcons.house_fill,
      label: 'Home',
    ),
    (
      icon: BootstrapIcons.chat_quote,
      active: BootstrapIcons.chat_quote_fill,
      label: 'Feedback',
    ),
    (
      icon: BootstrapIcons.people,
      active: BootstrapIcons.people_fill,
      label: 'Discussions',
    ),
    (
      icon: BootstrapIcons.bar_chart,
      active: BootstrapIcons.bar_chart_fill,
      label: 'Surveys',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: shell,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            gradient: AppTheme.heroGradient,
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.28),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: _SlidingTabs(
            tabs: [for (final t in _tabs) (t.icon, t.active, t.label)],
            index: shell.currentIndex,
            onTap: (i) => shell.goBranch(
              i,
              initialLocation: i == shell.currentIndex,
            ),
          ),
        ),
      ),
    );
  }
}

const _tabHeight = 44.0;

// inside the open pill: the icon's box (the 20 px icon is centred in it), how far that box is from
// the pill's left edge, and the gap left of the name — 3 + 2 = 5 px between the icon and the name
const _iconBox = 26.0;
const _iconInset = 9.0;
const _labelGap = 2.0;
const _labelStyle = TextStyle(
  fontSize: 9,
  fontWeight: FontWeight.w800,
  color: AppTheme.primary,
);

/// The tabs that are not selected: a light shade of the bar's blue.
const _inactive = Color(0xFF93AFE3);

const _slide = Duration(milliseconds: 360);
const _curve = Curves.easeOutCubic;

/// The row of tabs. Every tab has a slot whose left edge and width are worked out from which tab is
/// selected (it is wider: it holds its name), and the white pill is a separate shape that moves to
/// the selected tab's slot — so a tap on a tab to the right slides the pill right, to the left,
/// left. The slots move along with it, so the tabs in between shift out of its way.
class _SlidingTabs extends StatelessWidget {
  const _SlidingTabs({
    required this.tabs,
    required this.index,
    required this.onTap,
  });

  /// `(icon, selected icon, name)` of each tab.
  final List<(IconData, IconData, String)> tabs;
  final int index;
  final ValueChanged<int> onTap;

  /// The width of a tab's slot when it is the selected one: the circle, the name and some air.
  static double _openWidth(String label) {
    final name = TextPainter(
      text: TextSpan(text: label, style: _labelStyle),
      textDirection: TextDirection.ltr,
      maxLines: 1,
    )..layout();
    return _iconInset + _iconBox + _labelGap + name.width + 16;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final widths = [
          for (var i = 0; i < tabs.length; i++)
            i == index ? _openWidth(tabs[i].$3) : _tabHeight,
        ];
        final used = widths.fold<double>(0, (sum, w) => sum + w);
        // the tabs are spread across the bar with equal gaps between them
        final gap = tabs.length > 1
            ? ((box.maxWidth - used) / (tabs.length - 1)).clamp(0.0, 80.0)
            : 0.0;
        final lefts = <double>[];
        var x = 0.0;
        for (final w in widths) {
          lefts.add(x);
          x += w + gap;
        }

        return SizedBox(
          height: _tabHeight,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // the white pill, sliding to the selected tab
              AnimatedPositioned(
                duration: _slide,
                curve: _curve,
                left: lefts[index],
                width: widths[index],
                // 3 px shorter at the top and the bottom than the tab's slot
                top: 3,
                height: _tabHeight - 6,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              for (var i = 0; i < tabs.length; i++)
                AnimatedPositioned(
                  duration: _slide,
                  curve: _curve,
                  left: lefts[i],
                  width: widths[i],
                  top: 0,
                  height: _tabHeight,
                  child: _Tab(
                    icon: tabs[i].$1,
                    activeIcon: tabs[i].$2,
                    label: tabs[i].$3,
                    selected: i == index,
                    onTap: () => onTap(i),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// One tab's content, drawn over the pill. Closed it is a round icon button; open it is the icon
/// in ePS blue and the tab's name (the white pill itself is drawn by [_SlidingTabs]).
class _Tab extends StatelessWidget {
  const _Tab({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      selected: selected,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        // the content keeps its own size while the slot's width animates, and is cut at the edge
        child: ClipRect(
          child: OverflowBox(
            alignment: Alignment.centerLeft,
            minWidth: 0,
            maxWidth: double.infinity,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // closed: the icon is centred in the round button; open: it sits at the left, blue
                AnimatedContainer(
                  duration: _slide,
                  curve: _curve,
                  margin: EdgeInsets.only(left: selected ? _iconInset : 0),
                  width: selected ? _iconBox : _tabHeight,
                  height: selected ? _iconBox : _tabHeight,
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    switchInCurve: Curves.easeOutBack,
                    transitionBuilder: (child, animation) => ScaleTransition(
                      scale: animation,
                      child: FadeTransition(opacity: animation, child: child),
                    ),
                    child: Icon(
                      selected ? activeIcon : icon,
                      key: ValueKey(selected),
                      size: 20,
                      color: selected ? AppTheme.primary : _inactive,
                    ),
                  ),
                ),
                // the name fades in as the pill arrives
                AnimatedOpacity(
                  duration: _slide,
                  curve: selected ? const Interval(0.35, 1) : _curve,
                  opacity: selected ? 1 : 0,
                  child: Padding(
                    padding: const EdgeInsets.only(left: _labelGap, right: 16),
                    child: Text(
                      label,
                      maxLines: 1,
                      softWrap: false,
                      style: _labelStyle,
                    ),
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
