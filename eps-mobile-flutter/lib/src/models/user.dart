import 'json_utils.dart';

/// The citizen profile returned by the JWT-issuing endpoints
/// (`/citizen/login`, `/citizen/verify`). `withProfile()` on the backend folds
/// the Citizen-only `email` / `phoneNo` into the User row and strips the hash.
class AppUser {
  AppUser({
    required this.id,
    required this.firstname,
    required this.lastname,
    required this.role,
    this.email,
    this.phoneNo,
    this.avatar,
  });

  final int id;
  final String firstname;
  final String lastname;
  final String role;
  final String? email;
  final String? phoneNo;
  final String? avatar;

  String get fullName => '$firstname $lastname'.trim();

  String get initials {
    final f = firstname.isNotEmpty ? firstname[0] : '';
    final l = lastname.isNotEmpty ? lastname[0] : '';
    final s = '$f$l'.toUpperCase();
    return s.isEmpty ? '?' : s;
  }

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: asInt(json['id']),
        firstname: asString(json['firstname']),
        lastname: asString(json['lastname']),
        role: asString(json['role'], fallback: 'citizen'),
        email: asStringOrNull(json['email']),
        phoneNo: asStringOrNull(json['phoneNo']),
        avatar: asStringOrNull(json['avatar']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstname': firstname,
        'lastname': lastname,
        'role': role,
        'email': email,
        'phoneNo': phoneNo,
        'avatar': avatar,
      };
}
