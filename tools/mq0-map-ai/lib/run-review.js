// Core "call a provider, degrade to mock on any failure, normalize the result"
// logic (Phase 3, §22/§23), pulled out of review-map.js so it can be unit-tested
// directly with fake provider objects - no child process or real network needed.
"use strict";
const { resolveProvider } = require("../providers/index.js");
const AiConfig = require("./ai-config.js");

function normalizeResult(parsed, map, mode, providerName, limitationsExtra) {
    const safe = parsed || {};
    return {
        schemaVersion: AiConfig.schemaVersion,
        generatedAt: new Date().toISOString(),
        mode,
        provider: providerName,
        map: { id: (map && map.id) || "", name: (map && map.name) || "" },
        summary: typeof safe.summary === "string" ? safe.summary : "",
        issues: Array.isArray(safe.issues) ? safe.issues : [],
        suggestions: Array.isArray(safe.suggestions) ? safe.suggestions : [],
        referenceAnalysis: safe.referenceAnalysis || null,
        requirementsUsed: Array.isArray(safe.requirementsUsed) ? safe.requirementsUsed : [],
        limitations: (Array.isArray(safe.limitations) ? safe.limitations : []).concat(limitationsExtra || [])
    };
}

// Never throws. Always resolves to a well-formed AI Review Result object, even if
// the requested provider is unconfigured, errors, times out, or returns garbage.
// `resolverOverride` lets tests inject a fake resolveProvider(); defaults to the real one.
async function runReviewWithProvider(requestedProvider, reviewRequest, map, resolverOverride) {
    const resolve = resolverOverride || resolveProvider;
    const resolution = resolve(requestedProvider);
    const warnings = [];
    if (resolution.usedFallback) warnings.push(resolution.fallbackReason);

    let outcome;
    try {
        outcome = await resolution.provider.review(reviewRequest, {});
    } catch (e) {
        outcome = { raw: null, parsed: null, error: (e && e.message) ? e.message : String(e) };
    }

    let mode = resolution.resolvedName === "mock" ? "mock" : "real";
    let providerName = resolution.resolvedName;

    if (outcome.error && resolution.resolvedName !== "mock") {
        warnings.push("Provider \"" + resolution.resolvedName + "\" failed (" + outcome.error + "); falling back to mock.");
        let mockOutcome;
        try {
            mockOutcome = await resolve("mock").provider.review(reviewRequest, {});
        } catch (e) {
            mockOutcome = { raw: null, parsed: null, error: (e && e.message) ? e.message : String(e) };
        }
        outcome = mockOutcome;
        mode = "mock";
        providerName = "mock";
        warnings.push("Real provider \"" + resolution.resolvedName + "\" failed and results were replaced with a mock fallback.");
    }

    return {
        result: normalizeResult(outcome.parsed, map, mode, providerName, warnings.filter((w, i) => warnings.indexOf(w) === i)),
        warnings
    };
}

module.exports = { runReviewWithProvider, normalizeResult };
