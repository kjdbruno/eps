import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Up to [max] evidence photos. Wraps `image_picker` and shows removable thumbs.
class PhotoPicker extends StatefulWidget {
  const PhotoPicker({super.key, required this.onChanged, this.max = 5});

  final int max;
  final ValueChanged<List<XFile>> onChanged;

  @override
  State<PhotoPicker> createState() => _PhotoPickerState();
}

class _PhotoPickerState extends State<PhotoPicker> {
  final _picker = ImagePicker();
  final List<XFile> _photos = [];

  Future<void> _add() async {
    if (_photos.length >= widget.max) return;
    final picked = await _picker.pickMultiImage(imageQuality: 80);
    if (picked.isEmpty) return;
    setState(() {
      for (final p in picked) {
        if (_photos.length < widget.max) _photos.add(p);
      }
    });
    widget.onChanged(List.unmodifiable(_photos));
  }

  void _remove(int i) {
    setState(() => _photos.removeAt(i));
    widget.onChanged(List.unmodifiable(_photos));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < _photos.length; i++)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.file(
                      File(_photos[i].path),
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: GestureDetector(
                      onTap: () => _remove(i),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            if (_photos.length < widget.max)
              InkWell(
                onTap: _add,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF2F6FD),
                    border: Border.all(color: const Color(0xFFB8C4D9)),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.add_a_photo_outlined,
                    color: Color(0xFF204888),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '${_photos.length} / ${widget.max} photos',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    );
  }
}
