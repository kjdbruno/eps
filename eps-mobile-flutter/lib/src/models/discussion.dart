import 'json_utils.dart';

class DiscussionComment {
  DiscussionComment({
    required this.id,
    required this.authorName,
    required this.content,
    required this.createdAt,
  });

  final int id;
  final String authorName;
  final String content;
  final DateTime? createdAt;

  factory DiscussionComment.fromJson(Map<String, dynamic> json) =>
      DiscussionComment(
        id: asInt(json['id']),
        authorName: asString(json['authorName'], fallback: 'Anonymous'),
        content: asString(json['content']),
        createdAt: asDate(json['createdAt']),
      );
}

class Discussion {
  Discussion({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.commentCount,
    required this.comments,
  });

  final int id;
  final String title;
  final String description;
  final String status; // 'open' | 'closed'
  final DateTime? createdAt;
  final int commentCount;
  final List<DiscussionComment> comments;

  bool get isOpen => status == 'open';

  factory Discussion.fromJson(Map<String, dynamic> json) {
    final comments =
        asMapList(json['comments']).map(DiscussionComment.fromJson).toList();
    return Discussion(
      id: asInt(json['id']),
      title: asString(json['title']),
      description: asString(json['description']),
      status: asString(json['status'], fallback: 'open'),
      createdAt: asDate(json['createdAt']),
      commentCount: json.containsKey('commentCount')
          ? asInt(json['commentCount'])
          : comments.length,
      comments: comments,
    );
  }
}
