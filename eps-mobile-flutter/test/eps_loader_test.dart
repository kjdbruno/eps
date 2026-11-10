import 'package:eps_mobile/src/ui/widgets/eps_loader.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the bouncing e and the dots animate without errors',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              EpsLoader(caption: 'Loading...'),
              DotsSpinner(color: Colors.black),
            ],
          ),
        ),
      ),
    );
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    expect(find.text('Loading...'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('pull to refresh runs onRefresh and settles', (tester) async {
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EpsRefresh(
            onRefresh: () async => calls++,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [SizedBox(height: 100, child: Text('row'))],
            ),
          ),
        ),
      ),
    );
    await tester.fling(find.text('row'), const Offset(0, 400), 1000);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(calls, 1);
    expect(tester.takeException(), isNull);
  });
}
