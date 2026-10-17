#!/usr/bin/env node
// Capture still frames, optionally tiled into a contact sheet.
//   node src/rendering/stills.mjs --times 1,5.5,20 --out output/previews/f
//   node src/rendering/stills.mjs --sheet output/previews/contact_sheet.png [--every 2.5] [--cols 6]
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.push([v.slice(2), arr[i + 1]]) : 0, a), []));

const { server, port } = await startServer(ROOT, 0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-gpu', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/src/rendering/player.html?render=1&timeline=../../${args.timeline || 'project/timeline.json'}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
const dur = await page.evaluate(() => window.__dur);
let times;
if (args.times) times = args.times.split(',').map(Number);
else { const every = Number(args.every || 2.5); times = []; for (let t = 0.5; t < dur; t += every) times.push(+t.toFixed(2)); }
const outBase = path.resolve(ROOT, args.out || 'output/previews/still');
fs.mkdirSync(path.dirname(outBase), { recursive: true });
const files = [];
for (const t of times) {
  await page.evaluate(x => window.__seek(x), t);
  const f = `${outBase}_${String(t.toFixed(2)).padStart(6, '0')}.png`;
  await page.screenshot({ path: f });
  files.push([t, f]);
}
await browser.close(); server.close();
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
if (args.sheet) {
  const cols = Number(args.cols || 6);
  const py = `
import sys,json
from PIL import Image, ImageDraw
items=json.loads(sys.argv[1]); cols=${cols}; w,h=384,216
rows=(len(items)+cols-1)//cols
sheet=Image.new('RGB',(cols*w+(cols+1)*8, rows*(h+26)+8),(16,16,20)); d=ImageDraw.Draw(sheet)
for i,(t,f) in enumerate(items):
    im=Image.open(f).convert('RGB').resize((w,h),Image.LANCZOS); x=8+(i%cols)*(w+8); y=8+(i//cols)*(h+26)
    sheet.paste(im,(x,y)); d.text((x+4,y+h+5),f"{t:6.2f}s",fill=(230,230,230))
sheet.save(sys.argv[2])`;
  execFileSync('python3', ['-c', py, JSON.stringify(files), path.resolve(ROOT, args.sheet)]);
  for (const [, f] of files) fs.rmSync(f);
  console.log('sheet', args.sheet, files.length, 'frames');
} else console.log(files.map(x => x[1]).join('\n'));
