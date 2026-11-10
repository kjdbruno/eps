import 'package:eps_mobile/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('status colors map to the web portal palette', () {
    expect(AppTheme.statusColor('completed'), const Color(0xFF1C6B35));
    expect(AppTheme.statusColor('cancelled'), const Color(0xFFA52E22));
    expect(AppTheme.statusColor('pending'), const Color(0xFF8A5B00));
    expect(AppTheme.statusColor('something-unknown'), const Color(0xFF6B7488));
  });

  test('each status has a soft background to sit behind its text', () {
    expect(AppTheme.statusSoft('completed'), const Color(0xFFE4F6EA));
    expect(AppTheme.statusSoft('cancelled'), const Color(0xFFFCE8E6));
    expect(AppTheme.statusSoft('something-unknown'), const Color(0xFFF1F2F5));
  });
}
