// 使い方: node capture/record.mjs [clipId ...]（省略時は全クリップ）
// 出力: capture/clips/<id>.webm（MediaRecorderの生データ）と <id>.mp4（60fps固定・H.264に変換したRemotion用）
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureDevServer, launchBrowser, openGame, PROMO_DIR } from "./lib/harness.mjs";
import { CLIPS } from "./clips.mjs";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
const clipDir = path.join(PROMO_DIR, "capture/clips");
fs.mkdirSync(clipDir, { recursive: true });
const helper = fs.readFileSync(path.join(PROMO_DIR, "capture/lib/pageHelpers.js"), "utf8");
// Remotionに同梱のffmpegを直接使う（別途インストール不要）
const FFMPEG = path.join(PROMO_DIR, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
function ffmpeg(args) {
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: PROMO_DIR, stdio: "inherit" });
}

const server = await ensureDevServer();
const browser = await launchBrowser();
const results = {};
try {
  for (const id of ids) {
    const clip = CLIPS[id];
    if (!clip) throw new Error(`unknown clip ${id}`);
    console.log(`● ${id}  ${clip.url}`);
    const { context, page, logs } = await openGame(browser, clip.url);
    let t0 = 0;
    const rec = {
      start: async () => {
        await page.evaluate(() => window.__mq0cap.start(60));
        t0 = Date.now();
      },
      stop: async () => {
        const n = await page.evaluate(() => window.__mq0cap.stop());
        const bufs = [];
        for (let i = 0; i < n; i++) bufs.push(Buffer.from(await page.evaluate((k) => window.__mq0capParts[k], i), "base64"));
        fs.writeFileSync(path.join(clipDir, `${id}.webm`), Buffer.concat(bufs));
      },
    };
    try {
      await page.waitForFunction(() => !!window.__game, undefined, { timeout: 20000 });
      await page.evaluate(helper);
      await clip.run(page, rec);
      const secs = (Date.now() - t0) / 1000;
      ffmpeg(["-i", `capture/clips/${id}.webm`, "-fps_mode", "cfr", "-r", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `capture/clips/${id}.mp4`]);
      results[id] = { ok: true, url: clip.url, seconds: Number(secs.toFixed(2)), ...(rec.extra ?? {}), errors: logs.filter((l) => l.startsWith("[error]") || l.startsWith("[pageerror]")) };
    } catch (err) {
      results[id] = { ok: false, url: clip.url, error: String(err), errors: logs.filter((l) => l.startsWith("[error]") || l.startsWith("[pageerror]")) };
    }
    fs.writeFileSync(path.join(clipDir, `${id}.console.log`), logs.join("\n"));
    await context.close();
    console.log("  →", JSON.stringify(results[id]));
  }
} finally {
  await browser.close();
  await server.stop();
  const resPath = path.join(clipDir, "_results.json");
  const prev = fs.existsSync(resPath) ? JSON.parse(fs.readFileSync(resPath, "utf8")) : {};
  fs.writeFileSync(resPath, JSON.stringify({ ...prev, ...results }, null, 2));
}
