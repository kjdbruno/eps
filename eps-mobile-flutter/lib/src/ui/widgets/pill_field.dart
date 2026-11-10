import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// A white pill-shaped field for the dark sign-in / register pages. It is a form field,
/// so a [validator] shows its message under the pill in a soft red that reads on blue.
class PillField extends StatelessWidget {
  const PillField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.suffix,
    this.keyboardType,
    this.autofillHints,
    this.onSubmitted,
    this.validator,
    this.textCapitalization = TextCapitalization.none,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onSubmitted;
  final String? Function(String?)? validator;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) {
    OutlineInputBorder border(Color color, [double width = 1]) =>
        OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: color == Colors.transparent
              ? BorderSide.none
              : BorderSide(color: color, width: width),
        );

    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      textCapitalization: textCapitalization,
      onFieldSubmitted: onSubmitted,
      validator: validator,
      style: const TextStyle(color: AppTheme.ink, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 20, color: AppTheme.primary),
        suffixIcon: suffix,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
        errorStyle: const TextStyle(color: Color(0xFFFFC9C9), fontSize: 12),
        border: border(Colors.transparent),
        enabledBorder: border(Colors.transparent),
        focusedBorder: border(AppTheme.secondary, 2),
        errorBorder: border(const Color(0xFFFF9B9B), 1.5),
        focusedErrorBorder: border(const Color(0xFFFF9B9B), 2),
      ),
    );
  }
}
