import 'json_utils.dart';

class PollOption {
  PollOption({
    required this.id,
    required this.label,
    required this.votes,
    required this.percent,
  });

  final int id;
  final String label;
  final int votes;
  final double percent;

  factory PollOption.fromJson(Map<String, dynamic> json) => PollOption(
        id: asInt(json['id']),
        label: asString(json['label']),
        votes: asInt(json['votes']),
        percent: asDouble(json['percent']),
      );
}

class Poll {
  Poll({
    required this.id,
    required this.question,
    required this.status,
    required this.totalVotes,
    required this.hasVoted,
    required this.myOptionId,
    required this.options,
  });

  final int id;
  final String question;
  final String status; // 'open' | 'closed'
  final int totalVotes;
  final bool hasVoted;
  final int? myOptionId;
  final List<PollOption> options;

  bool get isOpen => status == 'open';
  bool get showResults => hasVoted || !isOpen;

  factory Poll.fromJson(Map<String, dynamic> json) => Poll(
        id: asInt(json['id']),
        question: asString(json['question']),
        status: asString(json['status'], fallback: 'open'),
        totalVotes: asInt(json['totalVotes']),
        hasVoted: asBool(json['hasVoted']),
        myOptionId:
            json['myOptionId'] == null ? null : asInt(json['myOptionId']),
        options: asMapList(json['options']).map(PollOption.fromJson).toList(),
      );
}
