import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// The page loader: the ePS "e" hops and lands with a little squash, with a shadow on the ground.
class EpsLoader extends StatefulWidget {
  const EpsLoader({super.key, this.size = 64, this.caption});

  /// The width of the e.
  final double size;

  /// An optional line under the e ("Loading feedback...").
  final String? caption;

  @override
  State<EpsLoader> createState() => _EpsLoaderState();
}

class _EpsLoaderState extends State<EpsLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// Eases from [a] to [b] as [t] goes from [from] to [to].
  static double _seg(double t, double from, double to, double a, double b) {
    final p = ((t - from) / (to - from)).clamp(0.0, 1.0);
    return a + (b - a) * Curves.easeInOut.transform(p);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final hop = s * 0.25;
    return Semantics(
      label: widget.caption ?? 'Loading',
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: s * 1.6,
              height: s + hop + s * 0.2,
              child: AnimatedBuilder(
                animation: _c,
                builder: (context, _) {
                  final t = _c.value;
                  // up (0 - .4), down and squash (.4 - .75), settle (.75 - 1)
                  final lift =
                      t < .4 ? _seg(t, 0, .4, 0, 1) : _seg(t, .4, .75, 1, 0);
                  final sx = t < .4
                      ? _seg(t, 0, .4, 1, .97)
                      : t < .75
                          ? _seg(t, .4, .75, .97, 1.08)
                          : _seg(t, .75, 1, 1.08, 1);
                  final sy = t < .4
                      ? _seg(t, 0, .4, 1, 1.03)
                      : t < .75
                          ? _seg(t, .4, .75, 1.03, .92)
                          : _seg(t, .75, 1, .92, 1);
                  return Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      // the shadow shrinks while the e is up
                      Container(
                        width: s * 0.7 * (1 - lift * 0.4),
                        height: s * 0.1,
                        decoration: BoxDecoration(
                          color: AppTheme.deep.withValues(
                            alpha: 0.2 - lift * 0.1,
                          ),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                      Positioned(
                        bottom: s * 0.16 + lift * hop,
                        child: Transform(
                          alignment: Alignment.bottomCenter,
                          transform: Matrix4.diagonal3Values(sx, sy, 1),
                          child: Image.asset(
                            'assets/branding/eps_e.png',
                            width: s,
                            filterQuality: FilterQuality.medium,
                            gaplessPlayback: true,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            if (widget.caption != null) ...[
              const SizedBox(height: 6),
              Text(
                widget.caption!,
                style: const TextStyle(color: AppTheme.mute, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Three dots that rise in turn: the small spinner for buttons and pull-to-refresh.
class DotsSpinner extends StatefulWidget {
  const DotsSpinner({super.key, this.color = Colors.white, this.size = 6});

  final Color color;

  /// The diameter of one dot.
  final double size;

  @override
  State<DotsSpinner> createState() => _DotsSpinnerState();
}

class _DotsSpinnerState extends State<DotsSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.size;
    return SizedBox(
      height: d * 2.4,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) SizedBox(width: d * 0.8),
              _dot(i),
            ],
          ],
        ),
      ),
    );
  }

  Widget _dot(int i) {
    // each dot is a third of a cycle behind the one before it
    final wave = math.sin(((_c.value - i / 3) % 1) * math.pi * 2);
    final up = wave.clamp(0.0, 1.0);
    return Transform.translate(
      offset: Offset(0, -up * widget.size * 0.7),
      child: Opacity(
        opacity: 0.45 + 0.55 * up,
        child: Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: widget.color,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}

/// Pull-to-refresh with the three-dot spinner: the dots drop in at the top while you pull and
/// keep going until [onRefresh] finishes.
class EpsRefresh extends StatefulWidget {
  const EpsRefresh({super.key, required this.onRefresh, required this.child});

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  State<EpsRefresh> createState() => _EpsRefreshState();
}

class _EpsRefreshState extends State<EpsRefresh> {
  RefreshIndicatorStatus? _status;

  bool get _active =>
      _status != null &&
      _status != RefreshIndicatorStatus.done &&
      _status != RefreshIndicatorStatus.canceled;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator.noSpinner(
          onRefresh: widget.onRefresh,
          onStatusChange: (s) {
            if (mounted) setState(() => _status = s);
          },
          child: widget.child,
        ),
        Positioned(
          top: 10,
          left: 0,
          right: 0,
          child: IgnorePointer(
            child: Center(
              child: AnimatedSlide(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                offset: _active ? Offset.zero : const Offset(0, -1.6),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: _active ? 1 : 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: AppTheme.line),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.deep.withValues(alpha: 0.16),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const DotsSpinner(color: AppTheme.primary),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
