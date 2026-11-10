import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import 'eps_loader.dart';

/// Small building blocks shared by the redesigned screens (the mobile twins of the
/// web portal's `pt-*` / `rc-*` pieces).

/// The deep-blue band with a yellow eyebrow, a big title and a line of text — the
/// landing / home / My-feedback header.
class EpsHero extends StatelessWidget {
  const EpsHero({
    super.key,
    required this.title,
    this.eyebrow,
    this.subtitle,
    this.children = const [],
    this.padding = const EdgeInsets.fromLTRB(22, 26, 22, 26),
    this.radius = 24,
  });

  final String? eyebrow;
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: AppTheme.heroGradient,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -60,
            top: -70,
            child: _Dot(220, Colors.white.withValues(alpha: 0.07)),
          ),
          Positioned(
            left: -50,
            bottom: -90,
            child: _Dot(180, AppTheme.secondary.withValues(alpha: 0.12)),
          ),
          Padding(
            padding: padding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null)
                  Text(
                    eyebrow!.toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.secondary,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.6,
                      fontSize: 11,
                    ),
                  ),
                if (eyebrow != null) const SizedBox(height: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    height: 1.12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      height: 1.5,
                    ),
                  ),
                ],
                ...children,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot(this.size, this.color);
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      );
}

/// A small uppercase section label with the blue bar before it (`pt-h`).
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing});

  final String text;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 22, 2, 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 15,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text.toUpperCase(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
              color: Color(0xFF4C5C79),
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                trailing!,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: AppTheme.mute),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A white hairline card with the portal's padding.
class EpsCard extends StatelessWidget {
  const EpsCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.margin = EdgeInsets.zero,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.line),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF16233A).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
    return card;
  }
}

/// A tinted rounded square holding an icon (`pt-tile-ico`).
class IconBox extends StatelessWidget {
  const IconBox(
    this.icon, {
    super.key,
    this.size = 46,
    this.color = AppTheme.primary,
    this.background = const Color(0xFFE5EEFC),
  });

  final IconData icon;
  final double size;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

/// One of a service's big tappable cards.
class ServiceTile extends StatelessWidget {
  const ServiceTile({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    required this.cta,
    required this.onTap,
    this.tint = const Color(0xFFE5EEFC),
    this.ink = AppTheme.primary,
  });

  final IconData icon;
  final String title;
  final String body;
  final String cta;
  final VoidCallback onTap;
  final Color tint;
  final Color ink;

  @override
  Widget build(BuildContext context) {
    return EpsCard(
      onTap: onTap,
      padding: const EdgeInsets.all(18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBox(icon, size: 52, color: ink, background: tint),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: AppTheme.mute,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Text(
                      cta,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: AppTheme.primary,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A one-number stat tile (`pt-kpi`). [main] fills it with the hero gradient.
class KpiTile extends StatelessWidget {
  const KpiTile({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.main = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool main;

  @override
  Widget build(BuildContext context) {
    final fg = main ? Colors.white : AppTheme.ink;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        gradient: main ? AppTheme.heroGradient : null,
        color: main ? null : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: main ? null : Border.all(color: AppTheme.line),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: main
                  ? Colors.white.withValues(alpha: 0.2)
                  : const Color(0xFFE5EEFC),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              size: 20,
              color: main ? Colors.white : AppTheme.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                    color: fg,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    letterSpacing: 0.6,
                    color: main ? Colors.white70 : AppTheme.mute,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A rounded "filter chip" (`pt-chip`).
class FilterPill extends StatelessWidget {
  const FilterPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppTheme.primary : Colors.white,
      shape: StadiumBorder(
        side: BorderSide(color: selected ? AppTheme.primary : AppTheme.line),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : const Color(0xFF4C5C79),
            ),
          ),
        ),
      ),
    );
  }
}

/// A one-line note with an icon, on a pale blue ground (`lgn-note` / `pt-side-note`).
class SoftNote extends StatelessWidget {
  const SoftNote(this.text, {super.key, this.icon = Icons.info_outline});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F6FD),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCE5F3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppTheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.5,
                color: Color(0xFF4C5C79),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A white content block with a small uppercase title (`rc-block`).
class InfoBlock extends StatelessWidget {
  const InfoBlock({super.key, this.title, required this.child});

  final String? title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE6ECF5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(
              title!.toUpperCase(),
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.9,
                color: AppTheme.mute,
              ),
            ),
            const SizedBox(height: 10),
          ],
          child,
        ],
      ),
    );
  }
}

/// A big empty-state: a tinted circle with an icon, a title and a line.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.text,
    this.action,
  });

  final IconData icon;
  final String title;
  final String? text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primary.withValues(alpha: 0.1),
            ),
            child: Icon(icon, size: 38, color: AppTheme.primary),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppTheme.ink,
            ),
          ),
          if (text != null) ...[
            const SizedBox(height: 4),
            Text(
              text!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.body, height: 1.5),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 16),
            action!,
          ],
        ],
      ),
    );
  }
}

/// A red message box for a failed action (`lgn-alert--bad`).
class ErrorBox extends StatelessWidget {
  const ErrorBox(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFCE8E6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3C4BE)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 18,
            color: Color(0xFFA52E22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.45,
                color: Color(0xFFA52E22),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The little white spinner that replaces a filled button's label while it works.
class ButtonSpinner extends StatelessWidget {
  const ButtonSpinner({super.key});

  @override
  Widget build(BuildContext context) => const DotsSpinner();
}

/// A small uppercase caption with a hairline after it — groups fields inside a form (`lgn-sec`).
class FormGroupLabel extends StatelessWidget {
  const FormGroupLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 12),
      child: Row(
        children: [
          Text(
            text.toUpperCase(),
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
              color: AppTheme.mute,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(child: Divider(height: 1)),
        ],
      ),
    );
  }
}

/// The round home button at the top left of every page a signed-out visitor can reach; it
/// goes back to the index. [light] is for a coloured page (a white circle), the default for a
/// dark one (a translucent circle).
class HomeCircle extends StatelessWidget {
  const HomeCircle({super.key, this.light = false});

  final bool light;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Home',
      child: Material(
        color: light ? Colors.white : Colors.white.withValues(alpha: 0.18),
        shape: const CircleBorder(),
        elevation: light ? 2 : 0,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => context.go('/'),
          child: Padding(
            padding: const EdgeInsets.all(11),
            child: Icon(
              Icons.home_rounded,
              size: 20,
              color: light ? AppTheme.ink : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
