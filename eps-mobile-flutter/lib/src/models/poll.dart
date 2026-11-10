import 'json_utils.dart';

/// How a question is answered.
enum QuestionType {
  short, // one line of text
  paragraph, // a longer written answer
  radio, // one choice
  checkbox; // any number of choices

  static QuestionType parse(String? v) => switch (v) {
        'short' => QuestionType.short,
        'paragraph' => QuestionType.paragraph,
        'checkbox' => QuestionType.checkbox,
        _ => QuestionType.radio,
      };

  bool get hasChoices => this == radio || this == checkbox;

  String get label => switch (this) {
        short => 'Short answer',
        paragraph => 'Paragraph',
        radio => 'Multiple choice',
        checkbox => 'Checkboxes',
      };
}

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

/// One question of a survey.
class PollQuestion {
  PollQuestion({
    required this.id,
    required this.type,
    required this.prompt,
    required this.required,
    required this.answered,
    required this.options,
    required this.myOptionIds,
    required this.myText,
  });

  final int id;
  final QuestionType type;
  final String prompt;
  final bool required;

  /// How many people answered this question.
  final int answered;
  final List<PollOption> options;

  /// What the signed-in user chose (multiple choice, checkboxes) or wrote.
  final List<int> myOptionIds;
  final String? myText;

  factory PollQuestion.fromJson(Map<String, dynamic> json) => PollQuestion(
        id: asInt(json['id']),
        type: QuestionType.parse(asStringOrNull(json['type'])),
        prompt: asString(json['prompt']),
        required: json['required'] == null ? true : asBool(json['required']),
        answered: asInt(json['answered']),
        options: asMapList(json['options']).map(PollOption.fromJson).toList(),
        myOptionIds: json['myOptionIds'] is List
            ? (json['myOptionIds'] as List).map(asInt).toList()
            : const [],
        myText: asStringOrNull(json['myText']),
      );
}

/// A survey (the server still calls it a poll): a title, a description and questions.
class Poll {
  Poll({
    required this.id,
    required this.question,
    required this.description,
    required this.status,
    required this.totalVotes,
    required this.hasVoted,
    required this.questions,
  });

  final int id;

  /// The survey's title.
  final String question;
  final String? description;
  final String status; // 'open' | 'closed' (also an expired one)

  /// How many people have answered it.
  final int totalVotes;
  final bool hasVoted;
  final List<PollQuestion> questions;

  bool get isOpen => status == 'open';
  bool get showResults => hasVoted || !isOpen;

  factory Poll.fromJson(Map<String, dynamic> json) => Poll(
        id: asInt(json['id']),
        question: asString(json['question']),
        description: asStringOrNull(json['description']),
        // a survey past its end date is still 'open' on the server but can no longer be answered
        status: asBool(json['isExpired'])
            ? 'closed'
            : asString(json['status'], fallback: 'open'),
        totalVotes: asInt(json['totalVotes']),
        hasVoted: asBool(json['hasVoted']),
        questions:
            asMapList(json['questions']).map(PollQuestion.fromJson).toList(),
      );
}

/// One answer being sent: the options chosen, or the text written.
class PollAnswer {
  const PollAnswer(this.questionId, {this.optionIds, this.text});

  final int questionId;
  final List<int>? optionIds;
  final String? text;

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        if (optionIds != null) 'optionIds': optionIds,
        if (text != null) 'text': text,
      };
}
