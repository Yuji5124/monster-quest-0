// Loads one of tiled/extensions/mq0's *.mjs files from a plain CommonJS Node
// script. Those files are real ES modules (Tiled 1.8+'s own multi-file extension
// format is .mjs + import/export, not CommonJS require()/module.exports - see
// tiled/extensions/mq0/README.md), so a CommonJS file can't `require()` them
// directly; dynamic `import()` is the standard, version-safe way to load an ESM
// module from CJS, so that's what this wraps. Each module's single default
// export is the same plain object shape these CLIs already expect.
"use strict";
const { pathToFileURL } = require("url");

// absPath: absolute path to a .mjs file (e.g. path.join(EXT_DIR, "requirements.mjs")).
// Returns the module's default export.
async function loadExtModule(absPath) {
    const mod = await import(pathToFileURL(absPath).href);
    return mod.default;
}

module.exports = { loadExtModule };
