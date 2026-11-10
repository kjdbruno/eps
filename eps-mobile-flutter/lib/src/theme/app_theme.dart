import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The EPS look, taken from the redesigned citizen web portal: a soft page, white
/// hairline cards, rounded fields, pill buttons and a deep-blue hero. Poppins
/// throughout, via google_fonts (fetched/cached at runtime — no font files vendored).
class AppTheme {
  // The section colours: feedback is light blue, discussions orange, surveys yellow (the same three as the citizen web
  // app). All three are light, so the text on them is dark; the "deep" ones are for icons and text on a pale ground.
  static const feedbackColor = Color(0xFF68AFF1);
  static const feedbackDeep = Color(0xFF3F8FD8);
  static const discussionColor = Color(0xFFDB812C);
  static const discussionDeep = Color(0xFFA85A12);
  static const surveyColor = Color(0xFFEEC336);
  static const surveyDeep = Color(0xFFB8920F);

  /// The text on a section colour: dark on the light ones, white on the dark ones.
  static Color onTone(Color tone) =>
      tone.computeLuminance() > 0.28 ? const Color(0xFF1D1D1D) : Colors.white;

  const AppTheme._();

  static const primary = Color(0xFF204888);
  static const deep = Color(0xFF14305F);
  static const secondary = Color(0xFFFFC900);

  /// The page colour (`$accent` on the web).
  static const accent = Color(0xFFF6F9FC);
  static const ink = Color(0xFF1E2A44);
  static const mute = Color(0xFF8493AC);
  static const body = Color(0xFF6B7A99);
  static const line = Color(0xFFE4EAF3);
  static const field = Color(0xFFDCE4F0);

  /// Every input is rounded by this much. Taller than half a one-line field, so a single line
  /// becomes a full pill, while a multi-line box keeps soft corners instead of a capsule.
  static const double _fieldRadius = 28;

  /// The deep-blue gradient used by every hero / header band.
  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [deep, primary],
  );

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      secondary: secondary,
      surface: Colors.white,
      brightness: Brightness.light,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: accent,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: ink,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: ink,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: line),
        ),
      ),
      dividerTheme: const DividerThemeData(color: line, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: Color(0xFF8A96AD), fontSize: 14),
        labelStyle: const TextStyle(color: Color(0xFF6B7A99), fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_fieldRadius),
          borderSide: const BorderSide(color: field),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_fieldRadius),
          borderSide: const BorderSide(color: field),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_fieldRadius),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_fieldRadius),
          borderSide: const BorderSide(color: Color(0xFFC10015)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_fieldRadius),
          borderSide: const BorderSide(color: Color(0xFFC10015), width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          foregroundColor: primary,
          side: const BorderSide(color: primary),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: secondary,
        foregroundColor: Color(0xFF1D1D1D),
        elevation: 3,
        shape: StadiumBorder(),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: const Color(0xFFE5EEFC),
        height: 66,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11.5,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w800
                : FontWeight.w600,
            color: states.contains(WidgetState.selected) ? primary : mute,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? primary : mute,
          ),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
    // Swap every TextTheme/PrimaryTextTheme style over to Poppins, keeping the
    // sizes/weights/colors `base` already derived above — every widget that
    // reads its text style from the ambient Theme (which is nearly all of
    // them) picks this up automatically, no per-widget font changes needed.
    return base.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(base.textTheme).apply(
        bodyColor: ink,
        displayColor: ink,
      ),
      primaryTextTheme: GoogleFonts.poppinsTextTheme(base.primaryTextTheme),
    );
  }

  /// The ink colour of a complaint / office / poll / discussion status — the same
  /// mapping as the web pills (`pt-st-*`).
  static Color statusColor(String? status) {
    switch (status) {
      case 'completed':
      case 'open':
      case 'ok':
        return const Color(0xFF1C6B35);
      case 'verified':
      case 'ongoing':
      case 'assigned':
        return const Color(0xFF2557B3);
      case 'pending':
      case 'received':
      case 'unverified':
      case 'expired':
        return const Color(0xFF8A5B00);
      case 'unassigned':
      case 'cancelled':
        return const Color(0xFFA52E22);
      case 'closed':
        return const Color(0xFF6B7488);
      default:
        return const Color(0xFF6B7488);
    }
  }

  /// The soft tinted background that goes behind [statusColor]'s text.
  static Color statusSoft(String? status) {
    switch (status) {
      case 'completed':
      case 'open':
      case 'ok':
        return const Color(0xFFE4F6EA);
      case 'verified':
      case 'ongoing':
      case 'assigned':
        return const Color(0xFFE5EEFC);
      case 'pending':
      case 'received':
      case 'unverified':
      case 'expired':
        return const Color(0xFFFFF4DB);
      case 'unassigned':
      case 'cancelled':
        return const Color(0xFFFCE8E6);
      default:
        return const Color(0xFFF1F2F5);
    }
  }

  /// The strip along the left edge of a list card.
  static Color statusEdge(String? status) {
    switch (status) {
      case 'completed':
      case 'open':
      case 'ongoing':
        return const Color(0xFF21BA45);
      case 'pending':
      case 'received':
      case 'unverified':
      case 'expired':
        return const Color(0xFFF2C037);
      case 'unassigned':
      case 'cancelled':
        return const Color(0xFFC10015);
      case 'verified':
      case 'assigned':
        return const Color(0xFF2557B3);
      default:
        return const Color(0xFFB9C0CE);
    }
  }
}
