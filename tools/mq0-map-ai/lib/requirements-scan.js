// Node-only real directory scan of docs/**/*.md (+ a few known root files).
// This exists because Tiled's own scripting API has no confirmed, reliable
// directory-listing function, so tiled/extensions/mq0/config.mjs keeps a curated
// list instead (see its `requirementsIndex`). Node has no such limitation, so
// here we scan for real and MERGE with the curated list - this only DISCOVERS
// files that already exist on disk; it never invents or guesses content.
"use strict";
const fs = require("fs");
const path = require("path");

function classify(relPath) {
    const base = path.basename(relPath).toUpperCase();
    if (/^PHASE/.test(base)) return { category: "phase-log", priority: 5 };
    if (/MAP_FLOW_SPEC/.test(base)) return { category: "map-flow", priority: 80 };
    if (/STORY_FLOW|OPENING_SPEC|GLITCH_SPEC/.test(base)) return { category: "story", priority: 60 };
    if (/NPC_SPEC|ITEM_EQUIPMENT_SPEC|MONSTER_SPEC|MAGIC_SPEC|BATTLE_SPEC|CARD_SPEC|CHARACTER_GROWTH|SAVE_FLAG_SPEC/.test(base)) return { category: "common", priority: 40 };
    if (/^README|^CLAUDE|^AGENTS/.test(base)) return { category: "root", priority: 15 };
    if (/PROJECT_STATUS|^INDEX|CURRENT_WORK|CONTENT_MATRIX|ROADMAP|CREATIVE_DIRECTION|GAME_SPEC|AI_EXECUTION_PROTOCOL/.test(base)) return { category: "meta", priority: 10 };
    return { category: "system", priority: 20 };
}

function scanMarkdownDir(repoRoot, relDir) {
    const abs = path.join(repoRoot, relDir);
    let entries;
    try {
        entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch (e) {
        return [];
    }
    let found = [];
    for (const entry of entries) {
        const relPath = path.join(relDir, entry.name).replace(/\\/g, "/");
        if (entry.isDirectory()) {
            found = found.concat(scanMarkdownDir(repoRoot, relPath));
        } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
            const c = classify(relPath);
            found.push({ path: relPath, category: c.category, priority: c.priority, exists: true });
        }
    }
    return found;
}

function scanAll(repoRoot) {
    let found = scanMarkdownDir(repoRoot, "docs");
    for (const rootFile of ["README.md", "CLAUDE.md", "AGENTS.md"]) {
        if (fs.existsSync(path.join(repoRoot, rootFile))) {
            const c = classify(rootFile);
            found.push({ path: rootFile, category: c.category, priority: c.priority, exists: true });
        }
    }
    return found;
}

module.exports = { scanAll: scanAll, classify: classify };
