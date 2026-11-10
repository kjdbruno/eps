import 'package:eps_mobile/src/api/api_client.dart';
import 'package:eps_mobile/src/api/api_exception.dart';
import 'package:eps_mobile/src/models/poll.dart';
import 'package:eps_mobile/src/realtime/socket_service.dart';
import 'package:eps_mobile/src/services/auth_service.dart';
import 'package:eps_mobile/src/services/poll_service.dart';
import 'package:eps_mobile/src/state/auth_controller.dart';
import 'package:eps_mobile/src/state/guest_identity.dart';
import 'package:eps_mobile/src/ui/screens/poll_vote_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A signed-in citizen, without a real login.
class _SignedIn extends AuthController {
  _SignedIn(ApiClient api)
      : super(api: api, authService: AuthService(api), socket: SocketService());

  @override
  bool get isAuthenticated => true;
}

/// A survey with one question of each kind: multiple choice, checkboxes, a short answer and an optional paragraph.
Poll _survey({
  bool answered = false,
  String status = 'open',
  bool expired = false,
}) =>
    Poll.fromJson({
      'id': 7,
      'question': 'Plaza survey',
      'description': 'Help us plan the plaza.',
      'status': status,
      'isExpired': expired,
      'totalVotes': answered ? 3 : 2,
      'hasVoted': answered,
      'questions': [
        {
          'id': 1,
          'type': 'radio',
          'prompt': 'Stay open late?',
          'required': true,
          'answered': 3,
          'myOptionIds': answered ? [2] : [],
          'options': [
            {
              'id': 1,
              'label': 'Yes',
              'votes': 2,
              'percent': answered ? 67 : null,
            },
            {
              'id': 2,
              'label': 'No',
              'votes': 1,
              'percent': answered ? 33 : null,
            },
          ],
        },
        {
          'id': 2,
          'type': 'checkbox',
          'prompt': 'What should it have?',
          'required': true,
          'answered': 3,
          'myOptionIds': answered ? [3, 4] : [],
          'options': [
            {
              'id': 3,
              'label': 'Benches',
              'votes': 3,
              'percent': answered ? 100 : null,
            },
            {
              'id': 4,
              'label': 'Lights',
              'votes': 1,
              'percent': answered ? 25 : null,
            },
          ],
        },
        {
          'id': 3,
          'type': 'short',
          'prompt': 'Your barangay?',
          'required': true,
          'answered': 0,
          'myText': answered ? 'Poblacion' : null,
          'options': [],
        },
        {
          'id': 4,
          'type': 'paragraph',
          'prompt': 'Anything else?',
          'required': false,
          'answered': 0,
          'options': [],
        },
      ],
    });

class _FakePolls extends PollService {
  _FakePolls(super.api, this.loads, {this.answerError});

  final List<Poll> loads; // each get() returns the next one (the last repeats)
  final ApiException? answerError;
  int gets = 0;
  List<PollAnswer>? sent;

  @override
  Future<Poll> get(int id, String guestToken) async {
    final at = gets < loads.length ? gets : loads.length - 1;
    gets++;
    return loads[at];
  }

  @override
  Future<Poll> answer(
    int id, {
    required List<PollAnswer> answers,
    required String guestToken,
  }) async {
    if (answerError != null) throw answerError!;
    sent = answers;
    return _survey(answered: true);
  }
}

Future<void> _open(WidgetTester tester, _FakePolls polls, ApiClient api) async {
  SharedPreferences.setMockInitialValues({});
  final guest = await GuestIdentity.load();
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<PollService>.value(value: polls),
        Provider<GuestIdentity>.value(value: guest),
        ChangeNotifierProvider<AuthController>.value(value: _SignedIn(api)),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: PollVoteScreen(id: 7, scrollController: ScrollController()),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void _tall(WidgetTester tester) {
  tester.view.physicalSize = const Size(1080, 4200);
  tester.view.devicePixelRatio = 2;
}

void main() {
  testWidgets('answering every kind of question sends them and shows results',
      (tester) async {
    _tall(tester);
    final api = ApiClient();
    final polls = _FakePolls(api, [_survey()]);
    await _open(tester, polls, api);

    expect(find.text('Submit my answers'), findsOneWidget);
    await tester.tap(find.text('Yes'));
    await tester.tap(find.text('Benches'));
    await tester.tap(find.text('Lights'));
    await tester.enterText(find.byType(TextField).first, 'Poblacion');
    await tester.pump();
    await tester.tap(find.text('Submit my answers'));
    await tester.pumpAndSettle();

    // one answer per question: one choice, two checkboxes, the typed text, and the skipped paragraph
    final sent = polls.sent!;
    expect(sent.length, 4);
    expect(sent[0].optionIds, [1]);
    expect(sent[1].optionIds!.toSet(), {3, 4});
    expect(sent[2].text, 'Poblacion');
    expect(sent[3].text, '');

    expect(find.text('Thank you! Your answers were recorded.'), findsOneWidget);
    expect(find.text('67%'), findsOneWidget);
    expect(find.text('Submit my answers'), findsNothing);
  });

  testWidgets('a required question left empty is marked and nothing is sent',
      (tester) async {
    _tall(tester);
    final api = ApiClient();
    final polls = _FakePolls(api, [_survey()]);
    await _open(tester, polls, api);

    await tester.tap(find.text('Yes')); // only the first one answered
    await tester.pump();
    await tester.tap(find.text('Submit my answers'));
    await tester.pumpAndSettle();

    expect(polls.sent, isNull);
    expect(find.text('Please answer the questions marked *.'), findsOneWidget);
    expect(find.text('Please answer this question.'), findsWidgets);
  });

  testWidgets(
      '"already answered" is shown in the sheet and the survey reloads to its results',
      (tester) async {
    _tall(tester);
    final api = ApiClient();
    final polls = _FakePolls(
      api,
      [_survey(), _survey(answered: true)],
      answerError: ApiException(
        "You've already answered this survey.",
        statusCode: 409,
      ),
    );
    await _open(tester, polls, api);

    await tester.tap(find.text('Yes'));
    await tester.tap(find.text('Benches'));
    await tester.enterText(find.byType(TextField).first, 'Poblacion');
    await tester.pump();
    await tester.tap(find.text('Submit my answers'));
    await tester.pumpAndSettle();

    expect(find.text("You've already answered this survey."), findsOneWidget);
    expect(find.text('33%'), findsOneWidget); // it now shows the results
    expect(find.text('Submit my answers'), findsNothing);
  });

  testWidgets('an expired survey is closed: no form, the results show',
      (tester) async {
    _tall(tester);
    final api = ApiClient();
    await _open(
      tester,
      _FakePolls(api, [_survey(expired: true)]),
      api,
    );

    expect(find.text('Submit my answers'), findsNothing);
    expect(find.text('results'.toUpperCase()), findsWidgets);
  });
}
