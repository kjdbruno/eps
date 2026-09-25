import '../api/api_client.dart';
import '../models/discussion.dart';
import '../models/json_utils.dart';

class DiscussionService {
  DiscussionService(this._api);
  final ApiClient _api;

  /// `GET /discussion` — public (api key). A bearer token, when present, scopes
  /// results server-side but citizens see everything either way.
  Future<List<Discussion>> list() async {
    final res = await _api.get<Map<String, dynamic>>('/discussion');
    return asMapList(res.data?['data']).map(Discussion.fromJson).toList();
  }

  /// `GET /discussion/:id` — thread + comments.
  Future<Discussion> get(int id) async {
    final res = await _api.get<Map<String, dynamic>>('/discussion/$id');
    return Discussion.fromJson(asMap(res.data?['data']));
  }

  /// `POST /discussion/:id/comment` — sign-in required in the mobile client, so
  /// the bearer token is always present and the backend attributes the comment
  /// to the citizen's real name.
  Future<void> comment(int id, {required String content}) async {
    await _api.post<dynamic>(
      '/discussion/$id/comment',
      body: {'content': content},
    );
  }
}
