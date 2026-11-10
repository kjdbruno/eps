import 'package:eps_mobile/src/ui/widgets/app_snack.dart';
import 'package:eps_mobile/src/ui/widgets/detail_scaffold.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('a toast raised inside a sheet shows on the sheet',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showEpsSheet<void>(
                context,
                (_) => SheetFrame(
                  child: Builder(
                    builder: (inner) => Center(
                      child: TextButton(
                        onPressed: () =>
                            showSnack(inner, 'Saved it', error: false),
                        child: const Text('save'),
                      ),
                    ),
                  ),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('save'));
    await tester.pump(const Duration(milliseconds: 400));

    // the toast belongs to the sheet's own messenger, so it is drawn inside the sheet
    final snack = find.text('Saved it');
    expect(snack, findsOneWidget);
    expect(
      find.ancestor(of: snack, matching: find.byType(SheetFrame)),
      findsOneWidget,
    );
  });

  testWidgets('a sheet closed with a message hands it to the opener',
      (tester) async {
    String? got;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                got = await showEpsSheet<String>(
                  context,
                  (_) => Builder(
                    builder: (inner) => TextButton(
                      onPressed: () => Navigator.of(inner).pop('filed'),
                      child: const Text('done'),
                    ),
                  ),
                );
              },
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('done'));
    await tester.pumpAndSettle();
    expect(got, 'filed');
    expect(find.text('done'), findsNothing);
  });
}
