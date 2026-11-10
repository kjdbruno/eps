import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// The pattern Home's carousel relies on: swapping the FutureBuilder's future for a new one while
// keeping the old data on screen must not rebuild the PageView, so the page stays.
void main() {
  testWidgets('a quiet refresh keeps the carousel on its page', (tester) async {
    final ctrl = PageController(viewportFraction: 0.82);
    late StateSetter set;
    var future = Future.value(List.generate(5, (i) => 'card $i'));

    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            set = setState;
            return FutureBuilder<List<String>>(
              future: future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting &&
                    snap.data == null) {
                  return const Text('loading');
                }
                final cards = snap.data ?? const <String>[];
                return PageView.builder(
                  controller: ctrl,
                  itemCount: cards.length,
                  itemBuilder: (_, i) => Text(cards[i]),
                );
              },
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    ctrl.jumpToPage(3);
    await tester.pumpAndSettle();
    expect(ctrl.page, 3);

    // a quiet refresh: a new future with new data
    set(() {
      future = Future.value(List.generate(5, (i) => 'new $i'));
    });
    await tester.pump();
    expect(find.text('loading'), findsNothing);
    await tester.pumpAndSettle();
    expect(ctrl.page, 3);
    expect(find.text('new 3'), findsOneWidget);
  });
}
