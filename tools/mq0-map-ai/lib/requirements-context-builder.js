// MQ0 Requirements Context Builder (Phase 3, §7/§8).
//
// Takes the Requirements Resolver's output (primary/selected from Phase 2's
// review-package.requirements) and reads ONLY those files' content, each capped
// to a small excerpt, within a hard total character budget - never the whole
// Markdown corpus. Every excerpt keeps its sourcePath (and a best-effort section
// heading) so the AI Review Result can cite exactly where it came from.
"use strict";
const fs = require("fs");
const path = require("path");
const AiConfig = require("./ai-config.js");

function firstHeading(text) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const m = /^#{1,6}\s+(.*)$/.exec(line.trim());
        if (m) return m[1].trim();
    }
    return "(intro)";
}

function readExcerpt(repoRoot, relPath, maxChars) {
    try {
        const abs = path.join(repoRoot, relPath);
        const normalizedAbs = path.normalize(abs);
        if (!normalizedAbs.startsWith(path.normalize(repoRoot))) return null; // repo外は拒否
        const text = fs.readFileSync(normalizedAbs, "utf8");
        const excerpt = text.slice(0, maxChars);
        return { section: firstHeading(excerpt), excerpt: excerpt, truncated: text.length > maxChars };
    } catch (e) {
        return null;
    }
}

// resolvedRequirements: {primary, selected, candidates} as produced by requirements.js's resolveForMap().
// Returns { requirementsContext: [{sourcePath, section, excerpt, truncated}], requirementsUsed: [sourcePath,...] }
function buildRequirementsContext(repoRoot, resolvedRequirements) {
    const cfg = AiConfig.context;
    const ordered = [];
    const seen = {};

    function addCandidate(entry) {
        if (!entry || !entry.path || seen[entry.path]) return;
        seen[entry.path] = true;
        ordered.push(entry);
    }

    // 優先順位(§7): 1. primary  2. mapId/mapName一致(selected内でスコアにより既に上位)
    //              3. map-flow  4. story  5. common  (WORLDは実ファイルが無いため対象外)
    if (resolvedRequirements && resolvedRequirements.primary) addCandidate(resolvedRequirements.primary);
    (resolvedRequirements && resolvedRequirements.selected || []).forEach(addCandidate);

    const requirementsContext = [];
    let totalChars = 0;

    for (const entry of ordered) {
        if (requirementsContext.length >= cfg.maxFiles) break;
        const remaining = cfg.maxTotalContextChars - totalChars;
        if (remaining <= 0) break;

        const cap = Math.min(cfg.maxExcerptCharsPerFile, remaining);
        const exists = entry.exists !== false; // explicit primaryはexists:falseの場合がある
        if (!exists) continue; // 存在しないファイルの本文は当然読めない(捏造しない)

        const read = readExcerpt(repoRoot, entry.path, cap);
        if (!read) continue;

        requirementsContext.push({
            sourcePath: entry.path,
            section: read.section,
            excerpt: read.excerpt,
            truncated: read.truncated
        });
        totalChars += read.excerpt.length;
    }

    return {
        requirementsContext,
        requirementsUsed: requirementsContext.map((c) => c.sourcePath)
    };
}

module.exports = { buildRequirementsContext };
