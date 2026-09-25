// Lenient coercion helpers — the backend serializes Sequelize rows directly,
// so numbers occasionally arrive as strings and nullable relations as `null`.

int asInt(Object? v, {int fallback = 0}) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

double asDouble(Object? v, {double fallback = 0}) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

bool asBool(Object? v) {
  if (v is bool) return v;
  if (v is num) return v != 0;
  if (v is String) return v == 'true' || v == '1';
  return false;
}

String asString(Object? v, {String fallback = ''}) => v?.toString() ?? fallback;

String? asStringOrNull(Object? v) => v?.toString();

DateTime? asDate(Object? v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString())?.toLocal();
}

List<Map<String, dynamic>> asMapList(Object? v) {
  if (v is List) {
    return v.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }
  return const [];
}

Map<String, dynamic> asMap(Object? v) {
  if (v is Map) return v.cast<String, dynamic>();
  return const {};
}
