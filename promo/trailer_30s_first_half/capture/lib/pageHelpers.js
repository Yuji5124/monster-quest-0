// ページ内に注入する補助関数（ゲームのファイルは変更しない。一時ブラウザ内の表示だけに作用する）
window.__mq0cap = (() => {
  const game = () => window.__game;
  const activeScenes = () => game().scene.getScenes(true);

  // DEV起動時だけ出る「〇〇  D: Collision表示」の注記を非表示にする（予告に開発用の文字を映さない）
  function hideDevNotices() {
    for (const scene of activeScenes()) {
      for (const child of scene.children?.list ?? []) {
        if (child.type === "Text" && typeof child.text === "string" && (child.text.includes("Collision表示") || child.text.includes("[DEV]")) && child.visible) child.setVisible(false);
      }
    }
  }
  function loopHide() {
    try { hideDevNotices(); } catch {}
    requestAnimationFrame(loopHide);
  }
  requestAnimationFrame(loopHide);

  // ---- MediaRecorder ----
  let recorder = null;
  let chunks = [];
  function start(fps = 60, bps = 40_000_000) {
    const canvas = document.querySelector("canvas");
    const stream = canvas.captureStream(fps);
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps });
    chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.start(250);
    return mime;
  }
  async function stop() {
    await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
    const blob = new Blob(chunks, { type: "video/webm" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    // Nodeへ分割して渡す
    const parts = [];
    const step = 1 << 20;
    for (let i = 0; i < buf.length; i += step) {
      let s = "";
      const sub = buf.subarray(i, i + step);
      for (let j = 0; j < sub.length; j += 0x8000) s += String.fromCharCode.apply(null, sub.subarray(j, j + 0x8000));
      parts.push(btoa(s));
    }
    window.__mq0capParts = parts;
    return parts.length;
  }

  // ---- まじんのどうくつ（No.07）補助 ----
  const majin = () => game().scene.getScene("MajinCaveScene");
  const key = (p) => `${p.x},${p.y}`;
  function bfs(from, isGoal, avoid = new Set()) {
    const grid = majin().run.currentFloor.grid;
    const prev = new Map([[key(from), null]]);
    const queue = [from];
    while (queue.length) {
      const p = queue.shift();
      if (isGoal(p)) {
        const path = [];
        for (let c = p; c; c = prev.get(key(c))) path.unshift(c);
        return path;
      }
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const n = { x: p.x + dx, y: p.y + dy };
        if (!grid[n.y]?.[n.x] || prev.has(key(n)) || avoid.has(key(n))) continue;
        prev.set(key(n), p);
        queue.push(n);
      }
    }
    return null;
  }
  const dirKey = (a, b) => (b.x > a.x ? "ArrowRight" : b.x < a.x ? "ArrowLeft" : b.y > a.y ? "ArrowDown" : "ArrowUp");
  function pathKeys(path) {
    const keys = [];
    for (let i = 1; i < path.length; i++) keys.push(dirKey(path[i - 1], path[i]));
    return keys;
  }
  /** DEVの10Fスキップと同じ手順で、指定階まで階段を下りる（URLのmajinCaveFloorは10だけなので） */
  function majinSkipTo(floorNumber) {
    const s = majin();
    while (s.run.currentFloorNumber < floorNumber) {
      s.run.setPlayerPosition(s.run.currentFloor.downStair);
      s.run.useCurrentStair();
    }
    s.renderFloor();
    s.renderHud();
  }
  /** 下り階段までの経路のうち、最後のn歩ぶん手前へ置き直して、その経路キーを返す */
  function majinApproachStairs(steps) {
    const s = majin();
    const run = s.run;
    const goal = run.currentFloor.downStair;
    const path = bfs(run.playerPosition, (p) => p.x === goal.x && p.y === goal.y);
    const startIdx = Math.max(0, path.length - 1 - steps);
    run.setPlayerPosition(path[startIdx]);
    s.renderFloor();
    s.renderHud();
    return pathKeys(path.slice(startIdx));
  }
  function majinKeysTowardBoss() {
    const run = majin().run;
    const boss = run.currentFloor.bossPosition;
    const path = bfs(run.playerPosition, (p) => Math.abs(p.x - boss.x) + Math.abs(p.y - boss.y) === 1);
    return path ? pathKeys(path) : [];
  }
  function majinBusy() {
    const s = majin();
    return !!(s.resolvingTurn || s.monsterHouseRevealActive || s.transitioning);
  }
  /** ボスの隣まで、あとn歩のところへ置き直す（途中の通常戦闘を省いて尺を詰める） */
  function majinPlaceNearBoss(steps) {
    const s = majin();
    const run = s.run;
    const boss = run.currentFloor.bossPosition;
    const occupied = new Set(run.getAliveEnemies().filter((e) => e.definitionId !== "majin").map((e) => key(e.position)));
    const path = bfs(run.playerPosition, (p) => Math.abs(p.x - boss.x) + Math.abs(p.y - boss.y) === 1, occupied);
    const startIdx = Math.max(0, path.length - 1 - steps);
    run.setPlayerPosition(path[startIdx]);
    s.renderFloor();
    s.renderHud();
    return pathKeys(path.slice(startIdx));
  }
  function majinState() {
    const s = majin();
    return {
      floor: s.run.currentFloorNumber,
      pos: s.run.playerPosition,
      boss: s.run.currentFloor.bossPosition,
      houseFloor: s.run.monsterHouseFloor,
      majinRevealed: !!s.run.currentFloor.majinRevealed,
      hp: s.run.playerHp,
    };
  }

  // ---- パーティ（No.02の3人追従） ----
  async function addParty(ids) {
    const mod = await import("/src/systems/PartySystem.ts");
    for (const id of ids) mod.partySystem.addMember(id);
    return mod.partySystem.getPartyOrder();
  }
  /** 2Dローカルマップのプレイヤー位置（背景のネイティブpx単位） */
  function playerPos(sceneKey, nativeWidth) {
    const s = game().scene.getScene(sceneKey);
    // カメラの移動範囲＝背景×worldScale なので、そこから倍率を求める
    const scale = s.cameras.main.getBounds().width / nativeWidth;
    const c = s.player.body.center;
    return { x: c.x / scale, y: c.y / scale };
  }
  /** collision.png（白=歩ける）をセル単位でBFSし、目標までの経由点（背景ネイティブpx）を返す */
  async function planPath(maskUrl, from, to, cell = 8, clearance = 2) {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = maskUrl;
    });
    const cv = document.createElement("canvas");
    cv.width = img.width;
    cv.height = img.height;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const W = Math.floor(img.width / cell);
    const H = Math.floor(img.height / cell);
    const raw = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = ((y * cell + cell / 2) * img.width + (x * cell + cell / 2)) * 4;
        raw[y * W + x] = data[i] > 128 ? 1 : 0;
      }
    const ok = (x, y) => {
      for (let dy = -clearance; dy <= clearance; dy++)
        for (let dx = -clearance; dx <= clearance; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || !raw[yy * W + xx]) return false;
        }
      return true;
    };
    const sx = Math.round(from.x / cell), sy = Math.round(from.y / cell);
    const tx = Math.round(to.x / cell), ty = Math.round(to.y / cell);
    const prev = new Int32Array(W * H).fill(-2);
    prev[sy * W + sx] = -1;
    const q = [sy * W + sx];
    let found = -1, best = -1, bestD = 1e9;
    while (q.length) {
      const c = q.shift();
      const cx = c % W, cy = (c / W) | 0;
      const d = Math.abs(cx - tx) + Math.abs(cy - ty);
      if (d < bestD) { bestD = d; best = c; }
      if (d === 0) { found = c; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (prev[n] !== -2 || !ok(nx, ny)) continue;
        prev[n] = c;
        q.push(n);
      }
    }
    const end = found >= 0 ? found : best;
    const cells = [];
    for (let c = end; c >= 0; c = prev[c]) cells.unshift(c);
    const pts = cells.filter((_, i) => i % 4 === 0 || i === cells.length - 1).map((c) => ({ x: (c % W) * cell, y: ((c / W) | 0) * cell }));
    return { reached: found >= 0, points: pts };
  }

  // ---- ビーエのチリチリ（横ずれ）検出: 色ずれゴースト(tint 0x7ae8ff)が見えているフレームを記録 ----
  let tearLog = [];
  let tearT0 = 0;
  function tearWatch(sceneKey) {
    tearLog = [];
    tearT0 = performance.now();
    let last = false;
    const tick = () => {
      try {
        const s = game().scene.getScene(sceneKey);
        const ghost = s.children.list.find((c) => c.type === "Image" && c.tintTopLeft === 0x7ae8ff);
        const on = !!ghost?.visible;
        if (on && !last) {
          const cam = s.cameras.main;
          const scale = cam.getBounds().width / ghost.frame.realWidth;
          const top = ghost._crop ? ghost._crop.y * scale : 0;
          const h = ghost._crop ? ghost._crop.height * scale : 0;
          tearLog.push({ t: (performance.now() - tearT0) / 1000, bandTop: top, bandH: h, camTop: cam.worldView.y, camH: cam.worldView.height, onScreen: top + h > cam.worldView.y && top < cam.worldView.y + cam.worldView.height });
        }
        last = on;
      } catch {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const tearEvents = () => tearLog;

  /** 2Dマップでプレイヤーを指定地点（背景ネイティブpx）へ置き直す（録画開始前の移動を省くため） */
  function placePlayer(sceneKey, nativeWidth, pt) {
    const s = game().scene.getScene(sceneKey);
    const scale = s.cameras.main.getBounds().width / nativeWidth;
    const b = s.player.body;
    const cx = pt.x * scale, cy = pt.y * scale;
    b.reset(cx - (b.center.x - b.gameObject.x), cy - (b.center.y - b.gameObject.y));
    return playerPos(sceneKey, nativeWidth);
  }
  function isActive(key) {
    return game().scene.isActive(key);
  }

  return { hideDevNotices, start, stop, majinSkipTo, majinApproachStairs, majinKeysTowardBoss, majinState, majinBusy, majinPlaceNearBoss, addParty, playerPos, placePlayer, planPath, tearWatch, tearEvents, isActive, activeScenes: () => activeScenes().map((s) => s.scene.key) };
})();
