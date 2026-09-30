// 1回バンドルして、複数Compositionの静止画をまとめて書き出す。
// 使い方: node scripts/stills.mjs <outDir> <compId>@<frame>[,<frame>...] ...
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outDir, ...specs] = process.argv.slice(2);
fs.mkdirSync(path.join(root, outDir), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
for (const spec of specs) {
  const [id, framesStr] = spec.split("@");
  const composition = await selectComposition({ serveUrl, id });
  for (const f of framesStr.split(",").map(Number)) {
    const output = path.join(root, outDir, `${id}_f${String(f).padStart(3, "0")}.png`);
    await renderStill({ serveUrl, composition, frame: f, output, timeoutInMilliseconds: 120000 });
    console.log("✓", path.relative(root, output));
  }
}
