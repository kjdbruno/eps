import 'package:eps_mobile/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('status colors map to the web client palette', () {
    expect(AppTheme.statusColor('completed'), const Color(0xFF2E7D32));
    expect(AppTheme.statusColor('cancelled'), const Color(0xFFC62828));
    expect(AppTheme.statusColor('pending'), const Color(0xFFF57C00));
    expect(AppTheme.statusColor('something-unknown'), const Color(0xFF757575));
  });
}
