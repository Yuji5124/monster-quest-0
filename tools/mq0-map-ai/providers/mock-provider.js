// Mock AI provider (Phase 3). Never calls a network API. Deterministically
// synthesizes a schema-valid AI Review Result Result straight from the
// structural validation data already in the request, so it stays useful
// (and testable) without pretending to perform real design/visual judgment.
// Every real provider must be swappable with this one without review-map.js changing.
"use strict";

const NAME = "mock";

function isConfigured() {
    return true; // mock never needs configuration
}

function buildReferenceAnalysis(reference) {
    if (!reference || !reference.configured) return null;
    const payload = reference.imagePayload;
    return {
        image: {
            path: reference.path || null,
            width: payload ? payload.width : null,
            height: payload ? payload.height : null
        },
        features: { terrain: [], roads: [], buildings: [], water: [], entrances: [], landmarks: [] },
        summary: payload
            ? "Mock mode: image dimensions were read locally; no AI feature extraction was performed."
            : (reference.unsupportedReason || "Reference image could not be read for analysis."),
        confidence: 0.0
    };
}

async function review(reviewRequest) {
    const errors = (reviewRequest.validation && reviewRequest.validation.errors) || [];
    const issues = errors.map((e, i) => ({
        id: "ISSUE-" + String(i + 1).padStart(3, "0"),
        severity: "ERROR",
        category: "requirements",
        message: "Mechanical validation failed: " + e.message,
        evidence: [{ source: e.target || "map", section: null, reason: "structured Validate Map output, not an AI judgment" }],
        suggestion: "Fix in Tiled and re-run Validate Map / Build Review Package.",
        confidence: 1.0
    }));
    issues.push({
        id: "ISSUE-" + String(issues.length + 1).padStart(3, "0"),
        severity: "INFO",
        category: "other",
        message: "Mock mode: no real visual or design judgment was performed.",
        evidence: [],
        suggestion: null,
        confidence: 0.0
    });

    const summary = errors.length > 0
        ? errors.length + " structural issue(s) found by Validate Map. No AI design review was performed (mock mode)."
        : "No structural errors from Validate Map. No AI design review was performed (mock mode).";

    const parsed = {
        summary,
        issues,
        suggestions: [],
        referenceAnalysis: buildReferenceAnalysis(reviewRequest.reference),
        requirementsUsed: (reviewRequest.requirementsContext || []).map((c) => c.sourcePath),
        limitations: ["Mock mode: results are synthesized locally from validation data only; no AI model was called."]
    };

    return { raw: JSON.stringify(parsed), parsed, error: null };
}

module.exports = { name: NAME, isConfigured, review };
