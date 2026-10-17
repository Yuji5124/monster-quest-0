#!/usr/bin/env node
// Tiny static server for the player (no dependencies). `node src/rendering/serve.mjs` then open
// http://127.0.0.1:8123/src/rendering/player.html  (?t=12.5 still frame, ?from=40 live from 40s)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.css': 'text/css' };

export function startServer(root, port = 8123) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
      const file = path.join(root, p);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  startServer(root, Number(process.argv[2] || 8123)).then(({ port }) =>
    console.log(`player: http://127.0.0.1:${port}/src/rendering/player.html`));
}
