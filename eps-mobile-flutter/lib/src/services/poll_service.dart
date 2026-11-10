import '../api/api_client.dart';
import '../models/json_utils.dart';
import '../models/poll.dart';

class PollService {
  PollService(this._api);
  final ApiClient _api;

  /// `GET /poll?guestToken=` — `hasVoted` is resolved per account (bearer) or
  /// per `guestToken` for anonymous users.
  Future<List<Poll>> list(String guestToken) async {
    final res = await _api.get<Map<String, dynamic>>(
      '/poll',
      query: {'guestToken': guestToken},
    );
    return asMapList(res.data?['data']).map(Poll.fromJson).toList();
  }

  /// `GET /poll/:id?guestToken=`.
  Future<Poll> get(int id, String guestToken) async {
    final res = await _api.get<Map<String, dynamic>>(
      '/poll/$id',
      query: {'guestToken': guestToken},
    );
    return Poll.fromJson(asMap(res.data?['data']));
  }

  /// `POST /poll/:id/vote` with one entry per question → the updated survey (with results).
  Future<Poll> answer(
    int id, {
    required List<PollAnswer> answers,
    required String guestToken,
  }) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/poll/$id/vote',
      body: {
        'answers': answers.map((a) => a.toJson()).toList(),
        'guestToken': guestToken,
      },
    );
    return Poll.fromJson(asMap(res.data?['data']));
  }
}
