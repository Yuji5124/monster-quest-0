// On-demand full-text reader for one requirement file, kept SEPARATE from the
// Review Package itself. review-package.json only ever holds metadata (path,
// category, priority, reason, exists, sourcePath) - never full Markdown bodies,
// so the package stays small even as docs/ grows. When something (a human, or a
// future AI step) actually needs the text of one selected/candidate requirement,
// call this with its `path` (as found in requirements.json) to read it fresh
// from the repo. Never called automatically by build-review-package.js.
"use strict";
const fs = require("fs");
const path = require("path");

// repoRoot: absolute path to the repository root (e.g. REPO_ROOT in build-review-package.js).
// relPath: a "path" value exactly as it appears in a Review Package's requirements.selected/candidates.
// Returns the file's text, or null if it can't be read (never throws).
function readRequirementContent(repoRoot, relPath) {
    if (!relPath) return null;
    try {
        const abs = path.join(repoRoot, relPath);
        // 走査対象はリポジトリ内に限定する(".."でリポジトリ外へ出るパスは拒否)。
        const normalizedAbs = path.normalize(abs);
        const normalizedRoot = path.normalize(repoRoot);
        if (!normalizedAbs.startsWith(normalizedRoot)) return null;
        return fs.readFileSync(normalizedAbs, "utf8");
    } catch (e) {
        return null;
    }
}

module.exports = { readRequirementContent: readRequirementContent };
