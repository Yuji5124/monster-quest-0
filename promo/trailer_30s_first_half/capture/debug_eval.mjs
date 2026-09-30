import { launchBrowser, openGame } from "./lib/harness.mjs";
const [, , url, expr] = process.argv;
const browser = await launchBrowser();
const { page } = await openGame(browser, url);
await page.waitForTimeout(3500);
console.log(JSON.stringify(await page.evaluate(expr), null, 1));
await browser.close();
