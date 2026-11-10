import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../services/complaint_service.dart';
import '../../state/auth_controller.dart';
import '../widgets/app_snack.dart';
import '../widgets/auth_sheet.dart';
import '../../theme/app_theme.dart';
import '../widgets/eps_ui.dart';
import '../widgets/detail_scaffold.dart';
import '../widgets/photo_picker.dart';
import '../widgets/eps_loader.dart';

/// Handles both flows, deciding by auth state (same split as the web
/// `ComplaintForm` `mode` prop):
///  - signed in  → `POST /complaint/account`, no OTP
///  - guest      → `POST /complaint/otp/send` then the verify-complaint screen
class FileComplaintScreen extends StatefulWidget {
  const FileComplaintScreen({super.key, this.scrollController});

  /// Set when the form is shown in a slide-up sheet.
  final ScrollController? scrollController;

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

  String? _error;

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
    setState(() {
      _loading = true;
      _error = null;
    });
    final service = context.read<ComplaintService>();
    try {
      if (_isGuest) {
        await service.fileGuestComplaint(
          // a guest cannot file anonymously
          isAnonymous: false,
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
        const message =
            "We've emailed you a one-time code — verify it to finish.";
        // Replace the (now-submitted) form so Back lands on the previous screen,
        // not a stale form — but keep a Back button on the verify screen.
        if (widget.scrollController != null) {
          // goes back to whoever opened the sheet: it shows the message, then opens the code sheet
          Navigator.of(context).pop(const _Filed(message, needsCode: true));
        } else {
          showSnack(context, message);
          showVerifyComplaintSheet(context);
        }
      } else {
        final filed = await service.fileAccountComplaint(
          isAnonymous: _anonymous,
          content: _content.text.trim(),
          latitude: _latitude!,
          longitude: _longitude!,
          photos: _photos,
        );
        if (!mounted) return;
        final message = filed.referenceNo.isEmpty
            ? 'Feedback submitted.'
            : filed.status == 'ongoing'
                ? 'Feedback ${filed.referenceNo} was sent to the right office.'
                : 'Feedback ${filed.referenceNo} submitted. It will be routed shortly.';
        if (widget.scrollController != null) {
          Navigator.of(context).pop(_Filed(message));
        } else {
          showSnack(context, message);
          context.pop();
        }
      }
    } on ApiException catch (e) {
      // shown in the form itself: a toast would sit behind the sheet
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not submit your feedback. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// "File anonymously" — only for a signed-in citizen: it hides who filed it from the offices and
  /// the staff, and nothing else. (A guest filing is always under the name they give.)
  Widget _anonymousTile() {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => setState(() => _anonymous = !_anonymous),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _anonymous
              ? AppTheme.primary.withValues(alpha: 0.06)
              : AppTheme.accent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _anonymous ? AppTheme.primary : AppTheme.field,
          ),
        ),
        child: Row(
          children: [
            const IconBox(
              Icons.visibility_off_outlined,
              size: 42,
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'File anonymously',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Hides only you: your name is not shown to the offices or the staff. What happened, where, and your photos are handled as usual.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      color: AppTheme.body,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: _anonymous,
              onChanged: (v) => setState(() => _anonymous = v),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final guest = _isGuest;
    return DetailScaffold(
      colors: DetailColors.feedback,
      scrollController: widget.scrollController,
      icon: Icons.description_rounded,
      tag: guest ? 'No account needed' : 'Signed in',
      children: [
        const Text(
          'File feedback',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: AppTheme.ink,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          guest
              ? "We'll email you a one-time code to verify it."
              : 'This skips the one-time code and goes straight to processing.',
          style: const TextStyle(color: AppTheme.body, height: 1.5),
        ),
        const SizedBox(height: 18),
        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!guest) ...[
                _anonymousTile(),
                const SizedBox(height: 18),
              ],
              // ---- 1. who is reporting (a guest only) ----
              if (guest)
                _Section(
                  number: 1,
                  title: 'Who is reporting',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _firstname,
                        validator: _req,
                        textCapitalization: TextCapitalization.words,
                        decoration:
                            const InputDecoration(labelText: 'First name'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _lastname,
                        validator: _req,
                        textCapitalization: TextCapitalization.words,
                        decoration:
                            const InputDecoration(labelText: 'Last name'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          if (_req(v) != null) return 'Required.';
                          final ok = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                              .hasMatch(v!.trim());
                          return ok ? null : 'Invalid email format.';
                        },
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon:
                              Icon(Icons.mail_outline_rounded, size: 20),
                        ),
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
                        decoration: const InputDecoration(
                          labelText: 'Contact no.',
                          prefixIcon: Icon(Icons.phone_outlined, size: 20),
                        ),
                      ),
                    ],
                  ),
                ),

              // ---- what happened ----
              _Section(
                number: guest ? 2 : 1,
                title: 'What happened',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _content,
                      validator: _req,
                      minLines: 5,
                      maxLines: 9,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Summary of your feedback',
                        hintText:
                            'Tell us what is wrong, where, and since when...',
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const SoftNote(
                      'No category to pick — we read what you write and send it to the right department automatically.',
                      icon: Icons.signpost_outlined,
                    ),
                  ],
                ),
              ),

              // ---- where ----
              _Section(
                number: guest ? 3 : 2,
                title: 'Where',
                child: _LocationCard(
                  loading: _locationLoading,
                  error: _locationError,
                  onRetry: _captureLocation,
                ),
              ),

              // ---- evidence ----
              _Section(
                number: guest ? 4 : 3,
                title: 'Evidence',
                hint: 'optional',
                child: PhotoPicker(onChanged: (p) => _photos = p),
              ),

              const SizedBox(height: 6),
              if (_error != null) ...[
                ErrorBox(_error!),
                const SizedBox(height: 12),
              ],
              FilledButton.icon(
                onPressed: _loading ? null : _submit,
                icon: _loading
                    ? const DotsSpinner(color: Colors.white)
                    : const Icon(Icons.send_rounded, size: 18),
                label: Text(_loading ? 'Sending...' : 'Submit feedback'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String? _req(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required.' : null;
}

/// A numbered card of the form (`cf-sec`): a numbered dot, a title, an optional hint.
class _Section extends StatelessWidget {
  const _Section({
    required this.number,
    required this.title,
    required this.child,
    this.hint,
  });

  final int number;
  final String title;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.accent,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$number',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                  color: Color(0xFF4C5C79),
                ),
              ),
              if (hint != null) ...[
                const SizedBox(width: 8),
                Text(
                  hint!,
                  style: const TextStyle(fontSize: 12, color: AppTheme.mute),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

/// The location as a status card: neutral while loading, green once captured, red when
/// the permission is refused (with a "Try again").
class _LocationCard extends StatelessWidget {
  const _LocationCard({
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final bad = error != null;
    final ok = !loading && !bad;
    final bg = bad
        ? const Color(0xFFFCE8E6)
        : ok
            ? const Color(0xFFE4F6EA)
            : AppTheme.accent;
    final edge = bad
        ? const Color(0xFFF3C4BE)
        : ok
            ? const Color(0xFFBFE6CC)
            : AppTheme.field;
    final ink = bad
        ? const Color(0xFFA52E22)
        : ok
            ? const Color(0xFF1C6B35)
            : AppTheme.body;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: edge),
      ),
      child: Row(
        children: [
          if (loading)
            const DotsSpinner(color: AppTheme.primary)
          else
            Icon(
              bad ? Icons.error_outline_rounded : Icons.location_on_rounded,
              color: ink,
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  loading
                      ? 'Getting your location…'
                      : bad
                          ? 'Location access is required'
                          : 'Location captured',
                  style: TextStyle(fontWeight: FontWeight.w800, color: ink),
                ),
                Text(
                  bad
                      ? error!
                      : loading
                          ? 'Please allow location access when asked.'
                          : 'It is attached to your feedback so the office can find the place.',
                  style: TextStyle(fontSize: 12, height: 1.4, color: ink),
                ),
              ],
            ),
          ),
          if (bad)
            TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}

/// What the file form hands back when it closes after a successful filing.
class _Filed {
  const _Filed(this.message, {this.needsCode = false});

  final String message;

  /// A guest filing: the code emailed to them still has to be entered.
  final bool needsCode;
}

/// Opens the "file feedback" form as a slide-up sheet. When it was filed the sheet closes by
/// itself, the confirmation shows on the page underneath, and this returns true — so the caller
/// can refresh its list. For a guest, the sheet for the emailed code opens right after.
Future<bool> showFileFeedbackSheet(BuildContext context) async {
  // kept now: the sheet's own context is gone by the time the message is shown
  final messenger = ScaffoldMessenger.of(context);
  final filed = await showEpsSheet<_Filed>(
    context,
    (controller) => FileComplaintScreen(scrollController: controller),
  );
  if (filed == null) return false;
  snackOn(messenger, filed.message);
  if (filed.needsCode && context.mounted) {
    await showVerifyComplaintSheet(context);
  }
  return true;
}
