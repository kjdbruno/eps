import 'package:eps_mobile/src/ui/widgets/otp_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // The six code boxes must fit the narrowest phone screens (the sign-in pages keep a
  // 28dp gutter, so a 360dp phone leaves about 304dp) without overflowing.
  for (final width in [280.0, 304.0, 360.0, 600.0]) {
    testWidgets('six code boxes fit in $width dp', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: width,
                child: OtpField(onCompleted: (_) {}),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(find.byType(TextField), findsNWidgets(6));
    });
  }
}
