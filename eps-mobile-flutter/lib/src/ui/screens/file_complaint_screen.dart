import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../services/complaint_service.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/photo_picker.dart';

/// Handles both flows, deciding by auth state (same split as the web
/// `ComplaintForm` `mode` prop):
///  - signed in  → `POST /complaint/account`, no OTP
///  - guest      → `POST /complaint/otp/send` then the verify-complaint screen
class FileComplaintScreen extends StatefulWidget {
  const FileComplaintScreen({super.key});

  @override
  State<FileComplaintScreen> createState() => _FileComplaintScreenState();
}

class _FileComplaintScreenState extends State<FileComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstname = TextEditingController();
  final _lastname = TextEditingController();
  final _email = TextEditingController();
  final _contact = TextEditingController();
  final _content = TextEditingController();

  bool _anonymous = false;
  bool _loading = false;
  List<XFile> _photos = const [];

  // Mandatory location — grabbed as soon as this screen loads, no button to tap first (mirrors
  // the web ComplaintForm.vue). The backend requires both on every citizen-filed complaint (guest
  // OTP and signed-in account alike); a denied/unavailable permission blocks submit until retried.
  double? _latitude;
  double? _longitude;
  bool _locationLoading = true;
  String? _locationError;

  @override
  void initState() {
    super.initState();
    _captureLocation();
  }

  @override
  void dispose() {
    for (final c in [_firstname, _lastname, _email, _contact, _content]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _isGuest => !context.read<AuthController>().isAuthenticated;

  Future<void> _captureLocation() async {
    setState(() {
      _locationLoading = true;
      _locationError = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception('Location services are turned off.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _locationLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _latitude = null;
        _longitude = null;
        _locationLoading = false;
        _locationError =
            'Location access is required to file feedback. Please allow it and try again.';
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_latitude == null || _longitude == null) {
      setState(() {
        _locationError ??=
            'Location access is required to file feedback. Please allow it and try again.';
      });
      showSnack(context, _locationError!, error: true);
      return;
    }
    setState(() => _loading = true);
    final service = context.read<ComplaintService>();
    try {
      if (_isGuest) {
        await service.fileGuestComplaint(
          isAnonymous: _anonymous,
          firstname: _firstname.text.trim(),
          lastname: _lastname.text.trim(),
          email: _email.text.trim(),
          contactNo: _contact.text.trim(),
          content: _content.text.trim(),
          latitude: _latitude!,
          longitude: _longitude!,
          photos: _photos,
        );
        if (!mounted) return;
        showSnack(context, "We've emailed you a one-time code — verify it to finish.");
        // Replace the (now-submitted) form so Back lands on the previous screen,
        // not a stale form — but keep a Back button on the verify screen.
        context.pushReplacement('/verify-complaint');
      } else {
        await service.fileAccountComplaint(
          content: _content.text.trim(),
          latitude: _latitude!,
          longitude: _longitude!,
          photos: _photos,
        );
        if (!mounted) return;
        showSnack(context, 'Feedback submitted.');
        context.pop();
      }
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final guest = _isGuest;
    return AuthScaffold(
      title: 'File Feedback',
      subtitle: guest
          ? "No account needed — we'll email you a one-time code to verify it."
          : 'Signed in — this skips the OTP step and goes straight to processing.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (guest) ...[
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _anonymous,
                onChanged: (v) => setState(() => _anonymous = v ?? false),
                title: const Text('Report anonymously'),
              ),
              if (!_anonymous) ...[
                TextFormField(
                  controller: _firstname,
                  validator: _req,
                  decoration: const InputDecoration(labelText: 'First name'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _lastname,
                  validator: _req,
                  decoration: const InputDecoration(labelText: 'Last name'),
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                validator: (v) {
                  if (_req(v) != null) return 'Required.';
                  final ok = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                      .hasMatch(v!.trim());
                  return ok ? null : 'Invalid email format.';
                },
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _contact,
                keyboardType: TextInputType.phone,
                validator: (v) {
                  if (_req(v) != null) return 'Required.';
                  final ok =
                      RegExp(r'^(09|\+639)\d{9}$').hasMatch(v!.trim());
                  return ok ? null : 'Format: 09XXXXXXXXX';
                },
                decoration: const InputDecoration(labelText: 'Contact no.'),
              ),
              const SizedBox(height: 12),
            ],
            TextFormField(
              controller: _content,
              validator: _req,
              minLines: 4,
              maxLines: 8,
              decoration: const InputDecoration(
                labelText: 'Summary of feedback',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              "We'll route this to the right department automatically based on "
              'what you describe here.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            const Text('Location'),
            const SizedBox(height: 6),
            if (_locationLoading)
              Row(
                children: [
                  const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Getting your location…',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              )
            else if (_locationError != null)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.error_outline, size: 16, color: Theme.of(context).colorScheme.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _locationError!,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                  TextButton(
                    onPressed: _captureLocation,
                    child: const Text('Try again'),
                  ),
                ],
              )
            else
              Row(
                children: [
                  const Icon(Icons.check_circle, size: 16, color: Colors.green),
                  const SizedBox(width: 8),
                  Text(
                    'Location captured.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            const Text('Evidence (optional)'),
            const SizedBox(height: 8),
            PhotoPicker(onChanged: (p) => _photos = p),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit feedback'),
            ),
          ],
        ),
      ),
    );
  }

  String? _req(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required.' : null;
}
