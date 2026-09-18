#!/usr/bin/env node
// MQ0 AI Review CLI (Phase 3).
//
// Tiled -> Build Review Package -> Local Bridge -> Reference Image Analyzer ->
// MQ0 Requirements Context Builder -> AI Reviewer -> AI Review Result -> Tiled Preview
//
// This is the ONLY place a real AI provider is ever called from in this codebase.
// It reviews exactly ONE map per invocation (no batch mode, no loop, no daemon -
// see README "Usage / Cost protection"). It NEVER modifies the .tmj it reviews.
//
// Usage:
//   node tools/mq0-map-ai/review-map.js --map <path-to-map.tmj> [--provider mock|real|anthropic] [--dry-run]
"use strict";
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXT_DIR = path.join(REPO_ROOT, "tiled", "extensions", "mq0");

require("./lib/node-tiled-shims.js").install(REPO_ROOT);

const { adaptMap } = require("./lib/tmj-adapter.js");
const { scanAll } = require("./lib/requirements-scan.js");
const { refuseIfMismatchedExisting } = require("./lib/output-guard.js");
const { buildRequirementsContext } = require("./lib/requirements-context-builder.js");
const { buildReferencePayload } = require("./lib/reference-payload.js");
const { buildReviewRequest, toInspectableRequest } = require("./lib/review-request-builder.js");
const { runReviewWithProvider } = require("./lib/run-review.js");
const { loadExtModule } = require("./lib/load-ext-module.js");
const AiConfig = require("./lib/ai-config.js");

function usage() {
    console.log("MQ0 AI Review CLI (Phase 3) - reviews ONE map, never edits it.");
    console.log("");
    console.log("Usage:");
    console.log("  node tools/mq0-map-ai/review-map.js --map <path-to-map.tmj> [--provider mock|real|anthropic] [--dry-run]");
    console.log("");
    console.log("  --map <path>      Path to the .tmj file (positional argument also accepted).");
    console.log("  --provider <name> \"mock\" (default), \"real\" (currently -> anthropic), or \"anthropic\".");
    console.log("  --dry-run         Build and print the exact request that WOULD be sent, call no API, write no files.");
    console.log("");
    console.log("Never calls any provider automatically or in a loop. One explicit run = one review of one map.");
    console.log("ANTHROPIC_API_KEY must be set as an environment variable for --provider real/anthropic; it is");
    console.log("never read from, or written to, this repository.");
}

function loadMap(tmjArgPath) {
    const tmjAbsPath = path.resolve(process.cwd(), tmjArgPath);
    if (!fs.existsSync(tmjAbsPath)) {
        console.error("File not found: " + tmjAbsPath);
        process.exit(1);
    }
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(tmjAbsPath, "utf8"));
    } catch (e) {
        console.error("Failed to parse JSON (" + tmjArgPath + "): " + e.message);
        process.exit(1);
    }
    return adaptMap(raw, tmjAbsPath);
}

function mergedRequirementsIndex(Requirements) {
    const curated = Requirements.getRequirementsIndex();
    const discovered = scanAll(REPO_ROOT);
    const seen = {};
    const merged = [];
    curated.concat(discovered).forEach((entry) => {
        if (seen[entry.path]) return;
        seen[entry.path] = true;
        merged.push(entry);
    });
    return merged;
}

function printHumanSummary(result) {
    console.log("MQ0 AI Review");
    console.log("");
    console.log("Map");
    console.log("  " + (result.map.id || "(no id)") + " / " + (result.map.name || "(no name)"));
    console.log("Mode");
    console.log("  " + result.mode.toUpperCase() + " (" + result.provider + ")");
    console.log("Summary");
    console.log("  " + (result.summary || "(none)"));

    const rank = { ERROR: 0, WARN: 1, INFO: 2, SUGGESTION: 3 };
    const issues = result.issues.slice().sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
    issues.forEach((issue) => {
        console.log("");
        console.log(issue.severity + "  " + issue.message);
        if (issue.evidence && issue.evidence.length) {
            console.log("Evidence");
            issue.evidence.forEach((e) => console.log("  " + (e.source || "?") + (e.section ? " (" + e.section + ")" : "")));
        }
        if (issue.suggestion) {
            console.log("Suggestion");
            console.log("  " + issue.suggestion);
        }
        if (typeof issue.confidence === "number") {
            console.log("Confidence");
            console.log("  " + Math.round(issue.confidence * 100) + "%");
        }
    });

    if (result.limitations.length) {
        console.log("");
        console.log("Limitations:");
        result.limitations.forEach((l) => console.log("  - " + l));
    }
}

async function main(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        usage();
        process.exit(args.length === 0 ? 1 : 0);
    }

    const dryRun = args.includes("--dry-run");
    const mapFlagIndex = args.indexOf("--map");
    const providerFlagIndex = args.indexOf("--provider");
    const tmjArgPath = mapFlagIndex !== -1
        ? args[mapFlagIndex + 1]
        : args.filter((a, i) => a !== "--dry-run" && a !== "--provider" && i !== providerFlagIndex + 1)[0];
    const requestedProvider = providerFlagIndex !== -1 ? args[providerFlagIndex + 1] : "mock";

    if (!tmjArgPath) {
        usage();
        process.exit(1);
    }

    const map = loadMap(tmjArgPath);

    const Requirements = await loadExtModule(path.join(EXT_DIR, "requirements.mjs"));
    const ReviewPackage = await loadExtModule(path.join(EXT_DIR, "review-package.mjs"));

    const built = ReviewPackage.buildReviewPackage(map, { requirementsIndexOverride: mergedRequirementsIndex(Requirements) });
    const pkg = built.package;

    if (!pkg.map) {
        console.error("Could not read a map from " + tmjArgPath);
        process.exit(1);
    }

    const requirementsContext = buildRequirementsContext(REPO_ROOT, pkg.requirements);
    const referencePayload = buildReferencePayload(REPO_ROOT, pkg.reference);
    if (referencePayload && referencePayload.unsupported) {
        console.warn("WARN  " + referencePayload.reason);
    }

    const reviewRequest = buildReviewRequest(pkg, requirementsContext, referencePayload);

    if (dryRun) {
        console.log("MQ0 AI Review - dry run (no API call, nothing written)\n");
        console.log(JSON.stringify(toInspectableRequest(reviewRequest), null, 2));
        return;
    }

    // Any real-provider failure (unconfigured, network error, timeout, rate limit,
    // invalid JSON) degrades to a mock result rather than crashing or writing a
    // broken/empty file (§23) - see lib/run-review.js for the shared, unit-tested logic.
    const { result, warnings } = await runReviewWithProvider(requestedProvider, reviewRequest, pkg.map);
    warnings.forEach((w) => console.warn("WARN  " + w));

    const outDir = path.join(REPO_ROOT, AiConfig.resultsDir.replace(/\//g, path.sep), built.outputFolder);
    refuseIfMismatchedExisting(path.join(outDir, "ai-review.json"), result.map, "an AI Review Result");

    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "ai-review.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");

    printHumanSummary(result);
    console.log("");
    console.log("Written: " + path.relative(REPO_ROOT, outPath));
    console.log("(This file only records a review. The .tmj was not modified.)");
}

main(process.argv).catch((e) => {
    console.error("Unexpected error: " + (e && e.message ? e.message : String(e)));
    process.exit(1);
});
