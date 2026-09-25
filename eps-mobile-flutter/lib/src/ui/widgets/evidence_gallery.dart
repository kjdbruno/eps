import 'dart:convert';
import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../models/complaint.dart';

/// Thumbnail row for complaint / response attachments.
///
/// The backend stores evidence as base64 `data:` URIs (see the web client's
/// `<q-img :src="f.file">`), but may also hand back `/uploads/...` paths — this
/// renders both.
class EvidenceGallery extends StatelessWidget {
  const EvidenceGallery({super.key, required this.files});
  final List<ComplaintFile> files;

  @override
  Widget build(BuildContext context) {
    if (files.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final f in files)
          if (f.isPdf)
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: Text(
                f.filename ?? 'Document',
                overflow: TextOverflow.ellipsis,
              ),
            )
          else
            GestureDetector(
              onTap: () => _openFull(context, _providerFor(f.file)),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image(
                  image: _providerFor(f.file),
                  width: 84,
                  height: 84,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _broken(),
                ),
              ),
            ),
      ],
    );
  }

  ImageProvider _providerFor(String src) {
    if (src.startsWith('data:')) {
      final bytes = _decodeDataUri(src);
      if (bytes != null) return MemoryImage(bytes);
    }
    return CachedNetworkImageProvider(AppConfig.resolveAsset(src));
  }

  Uint8List? _decodeDataUri(String uri) {
    final comma = uri.indexOf(',');
    if (comma == -1) return null;
    try {
      return base64Decode(uri.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }

  Widget _broken() => Container(
        width: 84,
        height: 84,
        color: Colors.grey.shade200,
        child: const Icon(Icons.broken_image_outlined),
      );

  void _openFull(BuildContext context, ImageProvider image) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        child: InteractiveViewer(child: Image(image: image)),
      ),
    );
  }
}
