// Zero-dependency width/height reader for PNG and JPEG (the two formats almost
// every reference image will be in). This is plain local file-header parsing -
// NOT AI, NOT network - so it is safe to run in both mock and real modes.
// WEBP is not parsed (RIFF/VP8 chunk parsing is more involved); unsupported or
// unreadable files simply return null rather than guessing.
"use strict";
const fs = require("fs");

function readPngSize(buf) {
    // PNG signature (8 bytes) + IHDR chunk: length(4) type(4)="IHDR" width(4) height(4)
    if (buf.length < 24) return null;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!isPng) return null;
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
}

function readJpegSize(buf) {
    // JPEG: scan markers for the first SOFn (Start Of Frame) segment, which holds
    // height/width right after the segment length + precision byte.
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) { offset++; continue; }
        const marker = buf[offset + 1];
        const isSOF = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        const segmentLength = buf.readUInt16BE(offset + 2);
        if (isSOF) {
            const height = buf.readUInt16BE(offset + 5);
            const width = buf.readUInt16BE(offset + 7);
            return { width, height };
        }
        if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
        offset += 2 + segmentLength;
    }
    return null;
}

function getImageSize(absPath) {
    try {
        const buf = fs.readFileSync(absPath);
        const png = readPngSize(buf);
        if (png) return png;
        const jpeg = readJpegSize(buf);
        if (jpeg) return jpeg;
        return null;
    } catch (e) {
        return null;
    }
}

module.exports = { getImageSize, readPngSize, readJpegSize };
