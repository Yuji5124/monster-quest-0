// ゲーム本体の dev サーバーを起動し、Playwright（同梱Chromium・使い捨てプロファイル）で操作する共通部品。
// 前回の promo/trailer_30s_first_half/capture/lib/harness.mjs をLinux/Windows両対応にしたもの。
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
    return (await fetch(BASE_URL + "/")).ok;
  } catch {
    return false;
  }
}

export async function ensureDevServer() {
  if (await isUp()) return { stop: async () => {} };
  const win = process.platform === "win32";
  const child = spawn("npm run dev -- --host 127.0.0.1 --port 5173 --strictPort", { cwd: REPO_ROOT, shell: true, stdio: "ignore", windowsHide: true, detached: !win });
  for (let i = 0; i < 120 && !(await isUp()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await isUp())) throw new Error("dev server did not start");
  return {
    stop: async () => {
      if (win) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      else process.kill(-child.pid, "SIGTERM");
    },
  };
}

export async function launchBrowser({ headless = process.platform !== "win32" } = {}) {
  return chromium.launch({
    headless,
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
}

export async function openGame(browser, url) {
  const context = await browser.newContext({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(BASE_URL + url, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  return { context, page, logs };
}
