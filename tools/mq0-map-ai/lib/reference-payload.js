// Builds the "vision payload" for a Reference Image (Phase 3, §5/§13): reads the
// image bytes, base64-encodes them, detects a media type, and reads its pixel
// dimensions locally (image-dimensions.js - no AI, no network). This does NOT
// analyze the image's content; actual feature extraction (terrain/roads/etc.)
// only happens if a vision-capable provider is used (see providers/*).
"use strict";
const fs = require("fs");
const path = require("path");
const { getImageSize } = require("./image-dimensions.js");

const MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
};

// reference: the `reference` object from a Review Package (§ reference-image.js), i.e.
//   { configured, layer, path, opacity, visible, offset, size, analysis }
// repoRoot: absolute repository root, used to resolve `reference.path` (already repo-relative).
// Returns null when there is nothing to read (no reference configured, unsupported
// extension, or the file can't be found) - callers must handle a text-only review in that case.
function buildReferencePayload(repoRoot, reference) {
    if (!reference || !reference.configured || !reference.path) return null;

    const ext = path.extname(reference.path).toLowerCase();
    const mediaType = MEDIA_TYPES[ext];
    if (!mediaType) {
        return { unsupported: true, reason: "Unsupported image extension for vision analysis: " + ext, path: reference.path };
    }

    const abs = path.join(repoRoot, reference.path);
    let bytes;
    try {
        bytes = fs.readFileSync(abs);
    } catch (e) {
        return { unsupported: true, reason: "Reference image file not found on disk: " + reference.path, path: reference.path };
    }

    const size = getImageSize(abs);
    return {
        unsupported: false,
        path: reference.path,
        mediaType: mediaType,
        base64: bytes.toString("base64"),
        byteLength: bytes.length,
        width: size ? size.width : null,
        height: size ? size.height : null
    };
}

module.exports = { buildReferencePayload };
