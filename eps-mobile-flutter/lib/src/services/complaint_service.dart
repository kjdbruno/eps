import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../api/api_client.dart';
import '../models/complaint.dart';
import '../models/json_utils.dart';

class ComplaintService {
  ComplaintService(this._api);
  final ApiClient _api;

  Future<List<MultipartFile>> _files(List<XFile> photos) async {
    final out = <MultipartFile>[];
    for (final p in photos) {
      out.add(
        await MultipartFile.fromFile(
          p.path,
          filename: p.name,
          contentType: MediaType('image', _ext(p.name)),
        ),
      );
    }
    return out;
  }

  String _ext(String name) {
    final i = name.lastIndexOf('.');
    final e = i == -1 ? 'jpeg' : name.substring(i + 1).toLowerCase();
    return e == 'jpg' ? 'jpeg' : e;
  }

  /// Guest flow, step 1 — `POST /complaint/otp/send` (multipart). Emails a
  /// 6-digit OTP; returns the confirmation message.
  Future<String> fileGuestComplaint({
    required bool isAnonymous,
    required String firstname,
    required String lastname,
    required String email,
    required String contactNo,
    required String content,
    required double latitude,
    required double longitude,
    List<XFile> photos = const [],
  }) async {
    final form = FormData.fromMap({
      'isAnonymous': isAnonymous.toString(),
      'firstname': firstname,
      'lastname': lastname,
      'email': email,
      'contactNo': contactNo,
      'content': content,
      'latitude': latitude.toString(),
      'longitude': longitude.toString(),
      'files': await _files(photos),
    });
    final res =
        await _api.post<Map<String, dynamic>>('/complaint/otp/send', body: form);
    return asString(res.data?['message'], fallback: 'Email sent.');
  }

  /// Guest flow, step 2 — `POST /complaint/otp/validate` → reference number.
  Future<String> validateComplaintOtp(String otp) async {
    final res = await _api
        .post<Map<String, dynamic>>('/complaint/otp/validate', body: {'otp': otp});
    return asString(asMap(res.data?['complaint'])['referenceNo']);
  }

  /// Public lookup — `GET /complaint/track/:referenceNo?otp=`.
  Future<Complaint> track(String referenceNo, String otp) async {
    final res = await _api.get<Map<String, dynamic>>(
      '/complaint/track/${Uri.encodeComponent(referenceNo)}',
      query: {'otp': otp},
    );
    return Complaint.fromJson(asMap(res.data?['data']));
  }

  /// Signed-in filing (no OTP) — `POST /complaint/account` (multipart).
  Future<void> fileAccountComplaint({
    required String content,
    required double latitude,
    required double longitude,
    List<XFile> photos = const [],
  }) async {
    final form = FormData.fromMap({
      'content': content,
      'latitude': latitude.toString(),
      'longitude': longitude.toString(),
      'files': await _files(photos),
    });
    await _api.post<dynamic>('/complaint/account', body: form);
  }

  /// Link a previously-filed complaint to the account —
  /// `POST /complaint/claim`.
  Future<String> claim({required String referenceNo, required String otp}) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/complaint/claim',
      body: {'referenceNo': referenceNo, 'otp': otp},
    );
    return asString(
      res.data?['message'],
      fallback: 'Feedback linked to your account.',
    );
  }

  /// `GET /citizen/complaints` (auth) → the account's complaints.
  Future<List<Complaint>> myComplaints() async {
    final res = await _api.get<Map<String, dynamic>>('/citizen/complaints');
    return asMapList(res.data?['data']).map(Complaint.fromJson).toList();
  }

  /// `GET /complaint/:id` (auth) — full detail incl. responses + ratings.
  Future<Complaint> detail(int id, {int? currentUserId}) async {
    final res = await _api.get<Map<String, dynamic>>('/complaint/$id');
    return Complaint.fromJson(
      asMap(res.data?['data']),
      currentUserId: currentUserId,
    );
  }

  /// Add a citizen follow-up — `POST /response/respond` (multipart).
  Future<void> respond({
    required int complaintId,
    required String content,
    List<XFile> photos = const [],
  }) async {
    final form = FormData.fromMap({
      'complaintId': complaintId.toString(),
      'content': content,
      'files': await _files(photos),
    });
    await _api.post<dynamic>('/response/respond', body: form);
  }

  /// Rate a staff response — `POST /response/rate`.
  Future<void> rateResponse(int responseId, int rate) async {
    await _api.post<dynamic>(
      '/response/rate',
      body: {'responseId': responseId, 'rate': rate},
    );
  }
}
