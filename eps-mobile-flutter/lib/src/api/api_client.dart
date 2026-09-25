import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../config/env.dart';
import 'api_exception.dart';

/// Thin wrapper around a configured [Dio]. Mirrors `src/boot/axios.js`:
///  - every request carries the `api` key header
///  - a bearer token is attached when available
///  - a 401/403 with an auth-ish body triggers [onUnauthorized] (logout + redirect)
class ApiClient {
  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'api': Env.apiKey},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = tokenProvider?.call();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (e, handler) {
          final status = e.response?.statusCode;
          final body = e.response?.data;
          final isAuthError = (status == 401 || status == 403) &&
              body is Map &&
              _looksLikeAuthFailure(body);
          if (isAuthError) {
            onUnauthorized?.call();
          }
          handler.next(e);
        },
      ),
    );
  }

  late final Dio _dio;
  Dio get dio => _dio;

  /// Wired by [AuthController] once it has loaded the persisted session.
  String? Function()? tokenProvider;
  void Function()? onUnauthorized;

  static bool _looksLikeAuthFailure(Map body) {
    // A `notVerified` 403 from /citizen/login is a normal flow, not a session death.
    if (body['notVerified'] == true) return false;
    final marker = (body['error'] ?? body['message'] ?? '').toString();
    return marker.contains('token') ||
        marker.contains('Token') ||
        marker.contains('API key') ||
        marker.contains('session has expired');
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
  }) =>
      _wrap(() => _dio.get<T>(path, queryParameters: query));

  Future<Response<T>> post<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) =>
      _wrap(() => _dio.post<T>(path, data: body, queryParameters: query));

  Future<Response<T>> patch<T>(
    String path, {
    Object? body,
  }) =>
      _wrap(() => _dio.patch<T>(path, data: body));

  Future<Response<T>> delete<T>(
    String path, {
    Object? body,
  }) =>
      _wrap(() => _dio.delete<T>(path, data: body));

  Future<Response<T>> _wrap<T>(Future<Response<T>> Function() run) async {
    try {
      return await run();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
