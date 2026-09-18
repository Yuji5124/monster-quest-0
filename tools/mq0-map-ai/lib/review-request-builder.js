// Review Request Builder (Phase 3, §14). The ONE place that assembles what gets
// sent for AI review. Providers (providers/*.js) only transport this object; they
// must not reach back into review-package.js / requirements-context-builder.js
// themselves, so swapping providers can never change what MQ0-specific data goes out.
"use strict";
const { buildSystemPrompt } = require("./mq0-reviewer-prompt.js");

// reviewPackage: the full object from tiled/extensions/mq0/review-package.mjs's buildReviewPackage().
// requirementsContext: from requirements-context-builder.js.
// referencePayload: from reference-payload.js, or null.
function buildReviewRequest(reviewPackage, requirementsContext, referencePayload) {
    return {
        project: reviewPackage.project,
        map: reviewPackage.map,
        layers: reviewPackage.layers,
        objects: reviewPackage.objects,
        validation: reviewPackage.validation,
        requirementsContext: requirementsContext.requirementsContext,
        reference: {
            configured: reviewPackage.reference.configured,
            layer: reviewPackage.reference.layer,
            path: reviewPackage.reference.path,
            opacity: reviewPackage.reference.opacity,
            visible: reviewPackage.reference.visible,
            // imagePayload carries the actual base64 bytes for vision-capable providers only.
            // null whenever there is no reference image, or it could not be read.
            imagePayload: referencePayload && !referencePayload.unsupported ? referencePayload : null,
            unsupportedReason: referencePayload && referencePayload.unsupported ? referencePayload.reason : null
        },
        instructions: buildSystemPrompt()
    };
}

// A version of the request safe to print/save: the (potentially large) base64
// image data is replaced with a short placeholder so --dry-run output and logs
// stay readable and never leak megabytes of base64 into a terminal or file.
function toInspectableRequest(reviewRequest) {
    const copy = JSON.parse(JSON.stringify(reviewRequest));
    if (copy.reference && copy.reference.imagePayload) {
        copy.reference.imagePayload = {
            mediaType: reviewRequest.reference.imagePayload.mediaType,
            byteLength: reviewRequest.reference.imagePayload.byteLength,
            width: reviewRequest.reference.imagePayload.width,
            height: reviewRequest.reference.imagePayload.height,
            base64: "<omitted, " + reviewRequest.reference.imagePayload.base64.length + " base64 chars>"
        };
    }
    return copy;
}

module.exports = { buildReviewRequest, toInspectableRequest };
