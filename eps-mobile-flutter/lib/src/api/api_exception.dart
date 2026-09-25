import 'package:dio/dio.dart';

/// A backend or transport error, normalized so the UI can show one string and
/// optionally branch on structured fields.
///
/// The Express controllers are inconsistent: some return `{ message }`, some
/// `{ error }`, some `{ errors: [{ msg }] }` (express-validator). This flattens
/// all three.
class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.data,
  });

  final String message;
  final int? statusCode;
  final Map<String, dynamic>? data;

  /// `POST /citizen/login` returns this when the account exists but the email
  /// isn't verified yet — the caller should route to the verify screen.
  bool get notVerified => data?['notVerified'] == true;

  String? get emailFromBody => data?['email'] as String?;

  factory ApiException.fromDio(DioException e) {
    final res = e.response;
    final body = res?.data;

    if (body is Map<String, dynamic>) {
      final validator = body['errors'];
      final firstValidator = validator is List && validator.isNotEmpty
          ? (validator.first as Map)['msg'] as String?
          : null;

      final message = firstValidator ??
          body['message'] as String? ??
          body['error'] as String? ??
          _fallbackForStatus(res?.statusCode) ??
          e.message ??
          'Something went wrong.';

      return ApiException(
        message,
        statusCode: res?.statusCode,
        data: body,
      );
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return ApiException(
        'Cannot reach the server. Check your connection and try again.',
        statusCode: res?.statusCode,
      );
    }

    return ApiException(
      _fallbackForStatus(res?.statusCode) ?? e.message ?? 'Something went wrong.',
      statusCode: res?.statusCode,
    );
  }

  static String? _fallbackForStatus(int? code) {
    switch (code) {
      case 401:
      case 403:
        return 'Your session has expired. Please sign in again.';
      case 404:
        return 'Not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return null;
    }
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}
