#!/usr/bin/env node
// Syncs a Tiled .tmj map that uses EXTERNAL tileset references ({firstgid, source})
// into a self-contained Tiled JSON that Phaser 3's Tiled parser can load directly.
//
// Phaser's Tilemaps.Parsers.Tiled.ParseTilesets explicitly does NOT support external
// tilesets (it warns "External tilesets unsupported. Use Embed Tileset and re-export"
// and silently drops them), while tiled/ keeps tilesets external so Tiled itself can
// share one .tsj across multiple maps. This script bridges the two: it is the ONLY
// place that copies tileset data, so tiled/ stays the single edited source of truth
// and public/assets/maps/*.json is a generated artifact (never hand-edited).
//
// Usage:
//   node tools/mq0-map-ai/sync-map-for-phaser.js
"use strict";
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Reads a .tmj and returns a deep copy with every {firstgid, source} tileset entry
 * replaced by {firstgid, ...theReferencedTsjContents} (source dropped, tsj fields spread in). */
function buildMergedMap(tmjRelPath) {
    const tmjAbs = path.resolve(REPO_ROOT, tmjRelPath);
    const tmjDir = path.dirname(tmjAbs);
    const map = JSON.parse(fs.readFileSync(tmjAbs, "utf-8"));

    map.tilesets = map.tilesets.map((ts) => {
        if (!ts.source) return ts;
        const tsjAbs = path.resolve(tmjDir, ts.source);
        const tsj = JSON.parse(fs.readFileSync(tsjAbs, "utf-8"));
        return { firstgid: ts.firstgid, ...tsj };
    });

    return map;
}

function syncMap(tmjRelPath, outRelPath) {
    const merged = buildMergedMap(tmjRelPath);
    const outAbs = path.resolve(REPO_ROOT, outRelPath);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(merged, null, 1) + "\n", "utf-8");
    return outAbs;
}

// Every Tiled map wired into a Phaser DEV/runtime scene must be listed here.
const MAPS_TO_SYNC = [
    {
        tmj: "tiled/maps/mq0_map01_starting_place_day.tmj",
        out: "public/assets/maps/mq0_map01_starting_place_day.json",
    },
];

if (require.main === module) {
    for (const { tmj, out } of MAPS_TO_SYNC) {
        const outAbs = syncMap(tmj, out);
        console.log(`synced: ${tmj} -> ${path.relative(REPO_ROOT, outAbs)}`);
    }
}

module.exports = { buildMergedMap, syncMap, MAPS_TO_SYNC, REPO_ROOT };
