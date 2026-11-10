import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_exception.dart';
import '../../services/complaint_service.dart';
import '../../theme/app_theme.dart';
import 'app_snack.dart';
import 'detail_scaffold.dart';
import 'eps_loader.dart';
import 'eps_ui.dart';

/// "Claim feedback": link feedback filed before signing in to this account, using its reference
/// number and access code. Opens as a slide-up sheet, like every other module. Resolves to true
/// when something was claimed (the confirmation shows on the page underneath once it has closed).
Future<bool> showClaimSheet(BuildContext context) async {
  // kept now: the sheet's own context is gone by the time the message is shown
  final messenger = ScaffoldMessenger.of(context);
  final message = await showEpsSheet<String>(
    context,
    (controller) => ClaimFeedbackSheet(scrollController: controller),
  );
  if (message == null) return false;
  snackOn(messenger, message);
  return true;
}

class ClaimFeedbackSheet extends StatefulWidget {
  const ClaimFeedbackSheet({super.key, required this.scrollController});

  final ScrollController scrollController;

  @override
  State<ClaimFeedbackSheet> createState() => _ClaimFeedbackSheetState();
}

class _ClaimFeedbackSheetState extends State<ClaimFeedbackSheet> {
  final _ref = TextEditingController();
  final _otp = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _ref.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _claim() async {
    if (_ref.text.trim().isEmpty || _otp.text.trim().isEmpty) {
      setState(
        () => _error = 'Enter the reference number and the access code.',
      );
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final message = await context.read<ComplaintService>().claim(
            referenceNo: _ref.text.trim(),
            otp: _otp.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(message);
    } on ApiException catch (e) {
      // shown in the sheet itself: a toast would sit behind it
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not claim it. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DetailScaffold(
      colors: DetailColors.feedback,
      scrollController: widget.scrollController,
      icon: Icons.link_rounded,
      tag: 'Claim feedback',
      children: [
        const Text(
          'Claim feedback',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: AppTheme.ink,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Filed feedback before signing in? Enter its reference number and '
          'access code to add it to your account.',
          style: TextStyle(color: AppTheme.body, height: 1.5),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _ref,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Reference no.',
            prefixIcon: Icon(Icons.tag_rounded, size: 20),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _otp,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Access code (OTP)',
            prefixIcon: Icon(Icons.key_outlined, size: 20),
          ),
          onSubmitted: (_) => _claim(),
        ),
        const SizedBox(height: 12),
        const SizedBox(height: 6),
        if (_error != null) ...[
          ErrorBox(_error!),
          const SizedBox(height: 12),
        ],
        FilledButton.icon(
          onPressed: _loading ? null : _claim,
          icon: _loading
              ? const DotsSpinner(color: Colors.white)
              : const Icon(Icons.link_rounded, size: 18),
          label: Text(_loading ? 'Claiming...' : 'Claim feedback'),
        ),
      ],
    );
  }
}
