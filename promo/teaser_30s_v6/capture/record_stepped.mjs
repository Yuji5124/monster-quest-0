// teaser_30s_v6: フレーム送り録画。GPUのない環境ではWebGL(3D)がリアルタイムで描けず、MediaRecorder録画のコマが欠ける。
// そこでPhaserのゲームループを止め（game.loop.sleep）、1/30秒ずつ game.step() で進めて毎コマ画面を撮る。
// ゲーム内の時間はすべて step の delta で進むため、描画速度に関係なく正しい30fpsの映像になる。
// 使い方: node capture/record_stepped.mjs [clipId ...]   出力: capture/clips/<id>.mp4（30fps・H.264）
// ゲーム本体のファイルは変更しない（操作は使い捨てブラウザ内だけ）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureDevServer, launchBrowser, openGame, PROMO_DIR } from "./lib/harness.mjs";
import { STEPPED_CLIPS } from "./clips_stepped.mjs";

const FPS = 30;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STEPPED_CLIPS);
const clipDir = path.join(PROMO_DIR, "capture/clips");
const helper = fs.readFileSync(path.join(PROMO_DIR, "capture/lib/pageHelpers.js"), "utf8");

const server = await ensureDevServer();
const browser = await launchBrowser();
const results = {};
try {
  for (const id of ids) {
    const clip = STEPPED_CLIPS[id];
    console.log(`● ${id}  ${clip.url}`);
    const { context, page, logs } = await openGame(browser, clip.url);
    const frameDir = path.join(clipDir, `_frames_${id}`);
    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    let n = 0;
    const canvas = page.locator("canvas").first();
    const rec = {
      /** ループを止めてフレーム送りに切り替える */
      freeze: () => page.evaluate(() => {
        const g = window.__game;
        g.loop.sleep();
        window.__mq0t = performance.now();
      }),
      /** n コマ進めて、そのたびに撮る（shoot=false なら撮らずに進める） */
      step: async (count, shoot = true) => {
        for (let i = 0; i < count; i++) {
          await page.evaluate((dt) => {
            window.__mq0t += dt;
            window.__game.step(window.__mq0t, dt);
          }, 1000 / FPS);
          if (shoot) await canvas.screenshot({ path: path.join(frameDir, `${String(n++).padStart(5, "0")}.png`) });
        }
      },
      /** 条件が真になるまで進める（上限つき） */
      stepUntil: async (fn, max = 240, shoot = true) => {
        for (let i = 0; i < max; i++) {
          if (await page.evaluate(fn)) return true;
          await rec.step(1, shoot);
        }
        return false;
      },
    };
    try {
      await page.waitForFunction(() => !!window.__game, undefined, { timeout: 20000 });
      await page.evaluate(helper);
      await clip.run(page, rec);
      execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-framerate", String(FPS), "-i", path.join(frameDir, "%05d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(clipDir, `${id}.mp4`)], { stdio: "inherit" });
      fs.rmSync(frameDir, { recursive: true, force: true });
      results[id] = { ok: true, url: clip.url, frames: n, fps: FPS, mode: "stepped", errors: logs.filter((l) => l.startsWith("[error]") || l.startsWith("[pageerror]")) };
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
