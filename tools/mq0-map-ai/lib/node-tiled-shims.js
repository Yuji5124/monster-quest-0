// Minimal stand-ins for the Tiled scripting globals (`tiled`, `File`, `TextFile`)
// so that tiled/extensions/mq0's *.js files - which only touch these globals
// inside function bodies, never at module top-level - can be require()'d and
// run under plain Node. Only implements what those files actually call.
"use strict";
const fs = require("fs");
const path = require("path");

function install(repoRoot) {
    global.tiled = {
        activeAsset: null,
        projectFilePath: path.join(repoRoot, "tiled", "mq0.tiled-project"),
        log: function (m) { console.log(m); },
        warn: function (m) { console.warn(m); },
        error: function (m) { console.error(m); },
        alert: function (m) { console.log(m); },
        confirm: function () { return false; },
        registerAction: function () { return { text: "" }; },
        extendMenu: function () { }
    };

    global.File = {
        exists: function (p) { try { return fs.existsSync(p); } catch (e) { return false; } },
        makePath: function (p) { try { fs.mkdirSync(p, { recursive: true }); return true; } catch (e) { return false; } },
        lastModified: function (p) {
            try { return fs.statSync(p).mtime.toISOString(); } catch (e) { return null; }
        }
    };

    // review-package.js's Tiled-side exportReviewPackage() uses TextFile; the CLI
    // does not call that function (it writes with fs directly instead), but a
    // harmless stub keeps `typeof TextFile` checks well-defined either way.
    global.TextFile = undefined;
}

module.exports = { install: install };
