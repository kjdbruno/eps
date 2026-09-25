import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Brand palette lifted from the web client (`quasar.config.js` / page styles):
/// primary `#204888`, secondary `#FFC900`, plus the status colors used on
/// complaint / poll / discussion badges. Poppins throughout, via google_fonts
/// (fetched/cached at runtime — no font files vendored into the app).
class AppTheme {
  const AppTheme._();

  static const primary = Color(0xFF204888);
  static const secondary = Color(0xFFFFC900);
  static const accent = Color(0xFFEEF2F9);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      secondary: secondary,
      brightness: Brightness.light,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF7F8FA),
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        isDense: true,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
    );
    // Swap every TextTheme/PrimaryTextTheme style over to Poppins, keeping the
    // sizes/weights/colors `base` already derived above — every widget that
    // reads its text style from the ambient Theme (which is nearly all of
    // them) picks this up automatically, no per-widget font changes needed.
    return base.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(base.textTheme),
      primaryTextTheme: GoogleFonts.poppinsTextTheme(base.primaryTextTheme),
    );
  }

  /// Maps a complaint / office / poll / discussion status to a chip color —
  /// same mapping as `statusColor()` in the Vue pages.
  static Color statusColor(String? status) {
    switch (status) {
      case 'verified':
      case 'ongoing':
      case 'received':
        return const Color(0xFF1976D2);
      case 'pending':
        return const Color(0xFFF57C00);
      case 'completed':
      case 'open':
        return const Color(0xFF2E7D32);
      case 'unassigned':
      case 'cancelled':
      case 'closed':
        return const Color(0xFFC62828);
      default:
        return const Color(0xFF757575);
    }
  }
}
