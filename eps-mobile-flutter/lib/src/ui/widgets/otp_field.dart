import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 6-box OTP entry — the mobile equivalent of `useOtpInput` + the `.otp-box`
/// inputs on VerifyEmailPage / VerifyComplaintPage.
class OtpField extends StatefulWidget {
  const OtpField({super.key, required this.onCompleted, this.length = 6});

  final int length;
  final ValueChanged<String> onCompleted;

  @override
  State<OtpField> createState() => OtpFieldState();
}

class OtpFieldState extends State<OtpField> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _nodes;

  String get value => _controllers.map((c) => c.text).join();
  bool get isComplete => value.length == widget.length;

  /// Empty every box and move focus back to the first — used when a code is
  /// rejected and the user needs to re-enter it.
  void clear() {
    for (final c in _controllers) {
      c.clear();
    }
    if (mounted) {
      _nodes.first.requestFocus();
      setState(() {});
    }
  }

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(widget.length, (_) => TextEditingController());
    _nodes = List.generate(widget.length, (_) => FocusNode());
    // Selects this box's existing digit whenever it gains focus, so typing a new one REPLACES
    // it instead of appending after it. Needed now that every box accepts up to `length`
    // characters (see maxLength below) — without this, tapping back into an already-filled box
    // and typing would produce a 2+ character string that _onChanged would misread as a paste.
    for (var i = 0; i < widget.length; i++) {
      _nodes[i].addListener(() {
        if (_nodes[i].hasFocus) {
          _controllers[i].selection = TextSelection(
            baseOffset: 0,
            extentOffset: _controllers[i].text.length,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  void _onChanged(int index, String raw) {
    // Handle paste of the whole code into one box.
    if (raw.length > 1) {
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      for (var i = 0; i < widget.length; i++) {
        _controllers[i].text = i < digits.length ? digits[i] : '';
      }
      FocusScope.of(context).unfocus();
      if (isComplete) widget.onCompleted(value);
      setState(() {});
      return;
    }

    if (raw.isNotEmpty && index < widget.length - 1) {
      _nodes[index + 1].requestFocus();
    }
    if (raw.isEmpty && index > 0) {
      _nodes[index - 1].requestFocus();
    }
    if (isComplete) widget.onCompleted(value);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(widget.length, (i) {
        // each box takes an equal share of the row (up to 52 wide), so six always fit a phone
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 52),
                child: TextField(
                  controller: _controllers[i],
                  focusNode: _nodes[i],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                  // Every box (not just the first) accepts up to the full code's length — that's
                  // what lets a paste land correctly no matter which box happened to have focus;
                  // _onChanged's raw.length > 1 branch below is what actually catches and
                  // distributes it. The select-on-focus listener above stops normal single-digit
                  // typing into an already-filled box from being misread the same way.
                  maxLength: widget.length,
                  decoration: const InputDecoration(
                    counterText: '',
                    contentPadding: EdgeInsets.symmetric(vertical: 17),
                  ),
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (v) => _onChanged(i, v),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}
