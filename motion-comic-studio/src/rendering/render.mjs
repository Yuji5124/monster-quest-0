#!/usr/bin/env node
// Seek-capture the player page in headless Chromium and encode H.264 with FFmpeg (CPU only).
// Usage:
//   node src/rendering/render.mjs --out output/final/video.mp4 [--scene s03] [--from 0 --to 10]
//        [--audio output/mix.wav] [--jobs 3] [--fps 30] [--quality 92] [--crf 20]
// Frames are a pure function of time (window.__seek), so ranges can be rendered in parallel
// and concatenated losslessly.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.push([v.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]) : 0, a), []));
const FPS = Number(args.fps || 30);
const JOBS = Number(args.jobs || 3);
const QUALITY = Number(args.quality || 92);
const CRF = String(args.crf || 20);
const OUT = path.resolve(ROOT, args.out || 'output/final/render.mp4');
const TIMELINE = args.timeline || 'project/timeline.json';

function sceneRange(tl, id) {
  let t = 0;
  for (const sc of tl.scenes) { const s = sc.start ?? t; t = s + sc.dur; if (sc.id === id) return [s, t]; }
  throw new Error(`scene ${id} not found`);
}

async function renderChunk(port, f0, f1, file, idx) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-gpu', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${idx}] ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/src/rendering/player.html?render=1&timeline=../../${TIMELINE}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(err);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.__seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: QUALITY, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`  job ${idx}: frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  await browser.close();
}

async function main() {
  const tl = JSON.parse(fs.readFileSync(path.join(ROOT, TIMELINE), 'utf8'));
  let total = 0; for (const sc of tl.scenes) total = (sc.start ?? total) + sc.dur;
  let [from, to] = args.scene ? sceneRange(tl, args.scene) : [Number(args.from || 0), Number(args.to || total)];
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const { server, port } = await startServer(ROOT, 0);
  const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.chunks-'));
  const n = Math.max(1, Math.min(JOBS, Math.ceil((f1 - f0) / 60)));
  const per = Math.ceil((f1 - f0) / n);
  console.log(`render ${from.toFixed(2)}s-${to.toFixed(2)}s (${f1 - f0} frames) with ${n} jobs -> ${OUT}`);
  const files = [];
  await Promise.all(Array.from({ length: n }, (_, i) => {
    const a = f0 + i * per, b = Math.min(f1, a + per), file = path.join(tmp, `c${i}.mp4`);
    files.push(file);
    return renderChunk(port, a, b, file, i);
  }));
  server.close();
  fs.writeFileSync(path.join(tmp, 'list.txt'), files.map(f => `file '${f}'`).join('\n'));
  const video = args.audio ? path.join(tmp, 'video.mp4') : OUT;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', video]);
  if (args.audio) {
    const audio = path.resolve(ROOT, args.audio);
    // cut the matching audio range so test clips stay in sync
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT]);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('done', OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
