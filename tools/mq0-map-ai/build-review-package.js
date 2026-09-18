#!/usr/bin/env node
// MQ0 Local Bridge CLI (Phase 2) - builds a Review Package for one .tmj file
// WITHOUT needing Tiled open, by parsing the JSON map format directly and
// reusing tiled/extensions/mq0's own validator/requirements/review-package
// logic. No external AI API is ever called from here.
//
// Usage:
//   node tools/mq0-map-ai/build-review-package.js <path-to-map.tmj> [--dry-run]
//   node tools/mq0-map-ai/build-review-package.js --map <path-to-map.tmj> [--dry-run]
"use strict";
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXT_DIR = path.join(REPO_ROOT, "tiled", "extensions", "mq0");

require("./lib/node-tiled-shims.js").install(REPO_ROOT);

const { adaptMap } = require("./lib/tmj-adapter.js");
const { scanAll } = require("./lib/requirements-scan.js");
const { refuseIfMismatchedExisting } = require("./lib/output-guard.js");
const { loadExtModule } = require("./lib/load-ext-module.js");

function usage() {
    console.log("MQ0 Review Package builder (local, no external AI API calls)");
    console.log("");
    console.log("Usage:");
    console.log("  node tools/mq0-map-ai/build-review-package.js <path-to-map.tmj> [--dry-run]");
    console.log("  node tools/mq0-map-ai/build-review-package.js --map <path-to-map.tmj> [--dry-run]");
    console.log("");
    console.log("  --map <path>   Path to the .tmj file (alternative to the positional argument).");
    console.log("  --dry-run      Print the preview and exit without writing any files.");
    console.log("");
    console.log("Only the Tiled JSON map format (.tmj) is supported, not .tmx.");
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
        console.error("Note: this tool only supports the JSON map format (.tmj), not .tmx.");
        process.exit(1);
    }
    return adaptMap(raw, tmjAbsPath);
}

function mergedRequirementsIndex(Requirements) {
    // Node can really scan the filesystem, so merge the curated (Tiled-safe) list
    // with a real docs/ scan; the curated entries win on path collisions since
    // they already carry a deliberately chosen category/priority.
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

async function main(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.indexOf("--help") !== -1 || args.indexOf("-h") !== -1) {
        usage();
        process.exit(args.length === 0 ? 1 : 0);
    }

    const dryRun = args.indexOf("--dry-run") !== -1;
    const mapFlagIndex = args.indexOf("--map");
    const tmjArgPath = mapFlagIndex !== -1
        ? args[mapFlagIndex + 1]
        : args.filter((a) => a !== "--dry-run" && a !== "--map")[0];
    if (!tmjArgPath) {
        usage();
        process.exit(1);
    }

    const map = loadMap(tmjArgPath);

    const Requirements = await loadExtModule(path.join(EXT_DIR, "requirements.mjs"));
    const ReviewPackage = await loadExtModule(path.join(EXT_DIR, "review-package.mjs"));

    const built = ReviewPackage.buildReviewPackage(map, {
        requirementsIndexOverride: mergedRequirementsIndex(Requirements)
    });

    console.log(ReviewPackage.buildPreviewText(built));

    if (dryRun) {
        console.log("\n(--dry-run: not writing files)");
        return;
    }

    const outDir = path.join(REPO_ROOT, "tools", "mq0-map-ai", "review-packages", built.outputFolder);
    refuseIfMismatchedExisting(path.join(outDir, "review-package.json"), built.package.map || { id: "", name: "" }, "a Review Package");

    fs.mkdirSync(outDir, { recursive: true });
    const files = {
        "map-snapshot.json": {
            map: built.package.map, layers: built.package.layers,
            objects: built.package.objects, tilesets: built.package.tilesets, properties: built.package.properties
        },
        "requirements.json": built.package.requirements,
        "reference.json": built.package.reference,
        "review-package.json": built.package
    };

    const written = [];
    Object.keys(files).forEach((name) => {
        const p = path.join(outDir, name);
        fs.writeFileSync(p, JSON.stringify(files[name], null, 2) + "\n", "utf8");
        written.push(p);
    });

    console.log("\nWritten:");
    written.forEach((p) => console.log("  " + path.relative(REPO_ROOT, p)));
}

main(process.argv).catch((e) => {
    console.error("Unexpected error: " + (e && e.message ? e.message : String(e)));
    process.exit(1);
});
