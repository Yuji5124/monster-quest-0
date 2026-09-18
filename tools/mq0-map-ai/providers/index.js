// Provider registry (Phase 3, §9/§12). Adding a new provider (e.g. OpenAI) means
// creating providers/openai-provider.js with the same { name, isConfigured, review }
// shape as mock-provider.js / anthropic-provider.js, and registering it below -
// nothing else in this codebase needs to change.
"use strict";
const mockProvider = require("./mock-provider.js");
const anthropicProvider = require("./anthropic-provider.js");

const PROVIDERS = {
    mock: mockProvider,
    anthropic: anthropicProvider
};

// "real" is an alias for "whichever real provider this repo currently wires up" (§20's
// `--provider real` example), kept separate from the provider's own registry key so the
// alias target can change later without changing the CLI's public flag values.
const REAL_ALIAS = "anthropic";

// Returns { provider, requestedName, resolvedName, usedFallback, fallbackReason }.
// Never throws: an unknown name, or a real provider that isn't configured (no API
// key), resolves to mock with a clear reason instead (§11: "WARN + fallback to mock").
function resolveProvider(requestedName) {
    const requested = (requestedName || "mock").toLowerCase();
    const targetName = requested === "real" ? REAL_ALIAS : requested;
    const target = PROVIDERS[targetName];

    if (!target) {
        return {
            provider: mockProvider,
            requestedName: requested,
            resolvedName: "mock",
            usedFallback: true,
            fallbackReason: "Unknown provider \"" + requested + "\"; falling back to mock."
        };
    }

    if (targetName === "mock") {
        return { provider: mockProvider, requestedName: requested, resolvedName: "mock", usedFallback: false, fallbackReason: null };
    }

    if (!target.isConfigured()) {
        return {
            provider: mockProvider,
            requestedName: requested,
            resolvedName: "mock",
            usedFallback: true,
            fallbackReason: "Provider \"" + target.name + "\" is not configured (missing API key); falling back to mock."
        };
    }

    return { provider: target, requestedName: requested, resolvedName: target.name, usedFallback: false, fallbackReason: null };
}

module.exports = { resolveProvider, PROVIDERS, REAL_ALIAS };
