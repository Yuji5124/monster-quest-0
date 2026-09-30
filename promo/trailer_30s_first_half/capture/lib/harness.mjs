// ゲーム本体の dev サーバーを起動し、Playwright（システムのChromeを使い捨てプロファイルで起動）で操作する共通部品。
// ゲーム本体のファイルは読み取りのみ。localStorage はPlaywrightの一時コンテキスト内だけで完結する。
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROMO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const REPO_ROOT = path.resolve(PROMO_DIR, "../..");
export const BASE_URL = "http://127.0.0.1:5173";

async function isUp() {
  try {
    const res = await fetch(BASE_URL + "/");
    return res.ok;
  } catch {
    return false;
  }
}

/** `npm run dev`（ゲーム本体）を起動する。既に起動済みならそれを使う。 */
export async function ensureDevServer() {
  if (await isUp()) return { stop: async () => {} };
  const child = spawn("npm run dev", { cwd: REPO_ROOT, shell: true, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 120; i++) {
    if (await isUp()) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!(await isUp())) throw new Error("dev server did not start");
  return {
    stop: async () => {
      // Windows: shell経由の子プロセスツリーごと止める
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    },
  };
}

export async function launchBrowser({ headless = false } = {}) {
  return chromium.launch({
    channel: "chrome",
    headless,
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  });
}

export async function openGame(browser, url) {
  const context = await browser.newContext({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(BASE_URL + url, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  return { context, page, logs };
}

/** 台本の1ステップを実行する */
export async function runStep(page, step) {
  if (step.wait) await page.waitForTimeout(step.wait);
  if (step.press) await page.keyboard.press(step.press, { delay: 60 });
  if (step.hold) {
    await page.keyboard.down(step.hold);
    await page.waitForTimeout(step.ms ?? 500);
    await page.keyboard.up(step.hold);
  }
  if (step.eval) await page.evaluate(step.eval);
}
