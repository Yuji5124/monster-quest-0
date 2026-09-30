// URLを開いて数秒後のスクリーンショットを撮るだけの下調べ用
import fs from "node:fs";
import path from "node:path";
import { ensureDevServer, launchBrowser, openGame, runStep, PROMO_DIR } from "./lib/harness.mjs";

const [, , name, url, ...rest] = process.argv;
const steps = rest.length ? JSON.parse(rest.join(" ")) : [{ wait: 4000 }];
const outDir = path.join(PROMO_DIR, "capture/probe");
fs.mkdirSync(outDir, { recursive: true });
const server = await ensureDevServer();
const browser = await launchBrowser();
try {
  const { page, logs } = await openGame(browser, url);
  let i = 0;
  for (const step of steps) {
    await runStep(page, step);
    if (step.shot) await page.screenshot({ path: path.join(outDir, `${name}_${String(i++).padStart(2, "0")}.png`) });
  }
  await page.screenshot({ path: path.join(outDir, `${name}_end.png`) });
  fs.writeFileSync(path.join(outDir, `${name}_console.log`), logs.join("\n"));
  console.log("canvases:", await page.evaluate(() => document.querySelectorAll("canvas").length));
} finally {
  await browser.close();
  if (process.env.KEEP_SERVER !== "1") await server.stop();
}
