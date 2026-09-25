import 'json_utils.dart';
import 'user.dart';

class ComplaintFile {
  ComplaintFile({required this.id, required this.file, this.filename});

  final int id;

  /// Either a `data:` URI or a root-relative `/uploads/...` path.
  final String file;
  final String? filename;

  bool get isPdf =>
      file.startsWith('data:application/pdf') ||
      (filename ?? '').toLowerCase().endsWith('.pdf');

  factory ComplaintFile.fromJson(Map<String, dynamic> json) => ComplaintFile(
        id: asInt(json['id']),
        file: asString(json['file']),
        filename: asStringOrNull(json['filename']),
      );
}

class ComplaintOffice {
  ComplaintOffice({required this.id, required this.status, required this.label});

  final int id;
  final String status;
  final String label;

  factory ComplaintOffice.fromJson(Map<String, dynamic> json) {
    final office = asMap(json['office']);
    return ComplaintOffice(
      id: asInt(json['id']),
      status: asString(json['status']),
      label: asStringOrNull(office['alias']) ??
          asStringOrNull(office['name']) ??
          'Office',
    );
  }
}

class ComplaintResponse {
  ComplaintResponse({
    required this.id,
    required this.content,
    required this.createdAt,
    required this.author,
    required this.department,
    required this.files,
    required this.myRating,
  });

  final int id;
  final String content;
  final DateTime? createdAt;
  final AppUser? author;

  /// Pre-resolved label: the responder's office alias, or "Supervisor" / "You".
  final String department;
  final List<ComplaintFile> files;

  /// This citizen's own star rating for the response (0 = not rated).
  final int myRating;

  factory ComplaintResponse.fromJson(
    Map<String, dynamic> json, {
    int? currentUserId,
  }) {
    final userJson = asMap(json['user']);
    final user = userJson.isEmpty ? null : AppUser.fromJson(userJson);

    final staffOffice = asMap(asMap(userJson['staff'])['office']);
    String department;
    if (staffOffice.isNotEmpty) {
      department = asStringOrNull(staffOffice['alias']) ??
          asString(staffOffice['name'], fallback: 'City Hall');
    } else if (user != null && (user.role == 'super' || user.role == 'admin')) {
      department = 'Supervisor';
    } else if (user != null && user.role == 'citizen') {
      department = 'You';
    } else {
      department = 'City Hall';
    }

    final ratings = asMapList(json['responseRatings']);
    final mine = ratings.where((r) => asInt(r['userId']) == currentUserId);

    return ComplaintResponse(
      id: asInt(json['id']),
      content: asString(json['content']),
      createdAt: asDate(json['createdAt']),
      author: user,
      department: department,
      files: asMapList(json['responseFiles'])
          .map(ComplaintFile.fromJson)
          .toList(),
      myRating: mine.isEmpty ? 0 : asInt(mine.first['rate']),
    );
  }
}

class HistoryEntry {
  HistoryEntry({required this.id, required this.description, required this.createdAt});

  final int id;
  final String description;
  final DateTime? createdAt;

  factory HistoryEntry.fromJson(Map<String, dynamic> json) => HistoryEntry(
        id: asInt(json['id']),
        description: asString(json['description']),
        createdAt: asDate(json['createdAt']),
      );
}

class Complaint {
  Complaint({
    required this.id,
    required this.referenceNo,
    required this.status,
    required this.content,
    required this.createdAt,
    required this.isAnonymous,
    required this.files,
    required this.offices,
    required this.responses,
    required this.history,
  });

  final int id;
  final String referenceNo;
  final String status;
  final String content;
  final DateTime? createdAt;
  final bool isAnonymous;
  final List<ComplaintFile> files;
  final List<ComplaintOffice> offices;
  final List<ComplaintResponse> responses;
  final List<HistoryEntry> history;

  /// No further follow-ups once the complaint is finalized.
  bool get isTerminal => status == 'completed' || status == 'cancelled';

  factory Complaint.fromJson(
    Map<String, dynamic> json, {
    int? currentUserId,
  }) =>
      Complaint(
        id: asInt(json['id']),
        referenceNo: asString(json['referenceNo']),
        status: asString(json['status'], fallback: 'pending'),
        content: asString(json['content']),
        createdAt: asDate(json['createdAt']),
        isAnonymous: asBool(json['isAnonymous']),
        files: asMapList(json['complaintFiles'])
            .map(ComplaintFile.fromJson)
            .toList(),
        offices: asMapList(json['complaintOffices'])
            .map(ComplaintOffice.fromJson)
            .toList(),
        responses: asMapList(json['responses'])
            .map((r) => ComplaintResponse.fromJson(r, currentUserId: currentUserId))
            .toList(),
        history:
            asMapList(json['history']).map(HistoryEntry.fromJson).toList(),
      );
}
