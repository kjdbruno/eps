import 'json_utils.dart';

/// "jorge  de la cruz" -> "Jorge De La Cruz": names are shown with each word capitalized, whatever
/// case they were typed in.
String titleCase(String s) => s
    .trim()
    .split(RegExp(r'\s+'))
    .map(
      (w) => w.isEmpty
          ? w
          : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}',
    )
    .join(' ');

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
    this.mustChangePassword = false,
  });

  final int id;
  final String firstname;
  final String lastname;
  final String role;
  final String? email;
  final String? phoneNo;
  final String? avatar;

  /// The account still has the temporary password it was emailed (a client whose account was
  /// seeded): the API refuses everything but `/change-password` until they choose their own.
  final bool mustChangePassword;

  AppUser withPasswordChanged(bool mustChange) => AppUser(
        id: id,
        firstname: firstname,
        lastname: lastname,
        role: role,
        email: email,
        phoneNo: phoneNo,
        avatar: avatar,
        mustChangePassword: mustChange,
      );

  String get fullName => '$firstname $lastname'.trim();

  String get initials {
    final f = firstname.isNotEmpty ? firstname[0] : '';
    final l = lastname.isNotEmpty ? lastname[0] : '';
    final s = '$f$l'.toUpperCase();
    return s.isEmpty ? '?' : s;
  }

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: asInt(json['id']),
        firstname: titleCase(asString(json['firstname'])),
        lastname: titleCase(asString(json['lastname'])),
        role: asString(json['role'], fallback: 'citizen'),
        email: asStringOrNull(json['email']),
        phoneNo: asStringOrNull(json['phoneNo']),
        avatar: asStringOrNull(json['avatar']),
        mustChangePassword: asBool(json['mustChangePassword']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstname': firstname,
        'lastname': lastname,
        'role': role,
        'email': email,
        'phoneNo': phoneNo,
        'avatar': avatar,
        'mustChangePassword': mustChangePassword,
      };
}
