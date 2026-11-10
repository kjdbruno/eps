import 'package:eps_mobile/src/api/api_client.dart';
import 'package:eps_mobile/src/api/api_exception.dart';
import 'package:eps_mobile/src/models/discussion.dart';
import 'package:eps_mobile/src/realtime/socket_service.dart';
import 'package:eps_mobile/src/services/auth_service.dart';
import 'package:eps_mobile/src/services/discussion_service.dart';
import 'package:eps_mobile/src/state/auth_controller.dart';
import 'package:eps_mobile/src/ui/screens/discussion_thread_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

/// A signed-in citizen, without a real login.
class _SignedIn extends AuthController {
  _SignedIn(ApiClient api)
      : super(api: api, authService: AuthService(api), socket: SocketService());

  @override
  bool get isAuthenticated => true;
}

Discussion _thread(
  List<String> comments, {
  String status = 'open',
  bool expired = false,
}) =>
    Discussion.fromJson({
      'id': 5,
      'title': 'Should the city add turning lanes?',
      'description': 'Rush-hour traffic has been heavy.',
      'status': status,
      'isExpired': expired,
      'createdAt': DateTime.now().toIso8601String(),
      'comments': [
        for (var i = 0; i < comments.length; i++)
          {
            'id': i + 1,
            'authorName': 'jorge m',
            'content': comments[i],
            'createdAt': DateTime.now().toIso8601String(),
          },
      ],
    });

class _FakeDiscussions extends DiscussionService {
  _FakeDiscussions(super.api, this.loads, {this.commentError});

  final List<Discussion>
      loads; // each get() returns the next one (the last repeats)
  final ApiException? commentError;
  int gets = 0;
  final posted = <String>[];

  @override
  Future<Discussion> get(int id) async {
    final at = gets < loads.length ? gets : loads.length - 1;
    gets++;
    return loads[at];
  }

  @override
  Future<void> comment(int id, {required String content}) async {
    if (commentError != null) throw commentError!;
    posted.add(content);
  }
}

Future<void> _open(
  WidgetTester tester,
  _FakeDiscussions service,
  ApiClient api,
) async {
  tester.view.physicalSize = const Size(1080, 2200);
  tester.view.devicePixelRatio = 2;
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<DiscussionService>.value(value: service),
        ChangeNotifierProvider<AuthController>.value(value: _SignedIn(api)),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: DiscussionThreadScreen(
              id: 5, scrollController: ScrollController(),),
        ),
      ),
    ),
  );
  await _settle(tester);
}

/// Lets the screen finish loading and animating. (`pumpAndSettle` times out on this screen, so a
/// fixed number of frames is pumped instead.)
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 12; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  testWidgets('posting a comment shows it, clears the box and keeps the thread',
      (tester) async {
    final api = ApiClient();
    final service = _FakeDiscussions(api, [
      _thread(['First thought']),
      _thread(['First thought', 'Turning lanes would help']),
    ]);
    await _open(tester, service, api);
    expect(find.text('First thought'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Turning lanes would help');
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();
    // while it reloads the thread stays (no switch back to the loader)
    expect(find.text('First thought'), findsOneWidget);
    await _settle(tester);

    expect(service.posted, ['Turning lanes would help']);
    expect(find.text('Turning lanes would help'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,);
  });

  testWidgets(
      'a refused comment is explained above the box and the thread reloads',
      (tester) async {
    final api = ApiClient();
    final service = _FakeDiscussions(
      api,
      [
        _thread(['First thought']),
        _thread(['First thought'], status: 'closed'),
      ],
      commentError: ApiException('This discussion is closed to new comments.',
          statusCode: 400,),
    );
    await _open(tester, service, api);

    await tester.enterText(find.byType(TextField), 'Too late?');
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    // the reload shows it as closed: the box is replaced by the closed notice
    expect(
        find.text('This discussion is closed to new comments.'), findsWidgets,);
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('an expired discussion is closed: no comment box',
      (tester) async {
    final api = ApiClient();
    await _open(
        tester,
        _FakeDiscussions(api, [
          _thread(['Old one'], expired: true),
        ]),
        api,);

    expect(find.byType(TextField), findsNothing);
    expect(find.text('This discussion is closed to new comments.'),
        findsOneWidget,);
  });
}
