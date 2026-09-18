// Shared "don't clobber a different map's output" guard, used by both
// build-review-package.js (review-package.json) and review-map.js (ai-review.json).
// Compares `newIdentity` ({id, name}) against whatever identity is embedded in an
// existing file's top-level `.map` field; a missing or unreadable existing file is
// not treated as a conflict (nothing to protect).
"use strict";
const fs = require("fs");

function refuseIfMismatchedExisting(existingFilePath, newIdentity, describeWhat) {
    if (!fs.existsSync(existingFilePath)) return;
    try {
        const existing = JSON.parse(fs.readFileSync(existingFilePath, "utf8"));
        const existingMap = existing.map || {};
        if (existingMap.id !== newIdentity.id || existingMap.name !== newIdentity.name) {
            console.error(
                "Refusing to overwrite " + existingFilePath + " - it holds " + describeWhat + " for a different map " +
                "(id=" + existingMap.id + ", name=" + existingMap.name + "). " +
                "Set a distinct mq0MapId on this map, or clean up that folder manually."
            );
            process.exit(1);
        }
    } catch (e) {
        // 壊れた既存ファイルは上書きを妨げない(読めない = 事故防止の判断材料にならない)。
    }
}

module.exports = { refuseIfMismatchedExisting };
