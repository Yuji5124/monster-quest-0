// BRIEF.md §3 の録画クリップ台本。各 run(page, rec) の中で rec.start()/rec.stop() を呼ぶ。
// ゲーム本体は変更しない。表示の調整はPlaywrightの一時ブラウザ内（window.__mq0cap）だけで行う。

const sleep = (page, ms) => page.waitForTimeout(ms);
async function tap(page, key, gap = 180) {
  await page.keyboard.press(key, { delay: 50 });
  await page.waitForTimeout(gap);
}
async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
/** 2Dマップで目標地点（背景ネイティブpx）へ歩く。詰まったら直交方向へ逃がす */
async function walkTo(page, sceneKey, nativeWidth, target, { tolerance = 14, timeout = 6000 } = {}) {
  const pos = () => page.evaluate(([k, w]) => window.__mq0cap.playerPos(k, w), [sceneKey, nativeWidth]);
  const t0 = Date.now();
  let p = await pos();
  while (Date.now() - t0 < timeout) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (Math.abs(dx) < tolerance && Math.abs(dy) < tolerance) return true;
    const horiz = Math.abs(dx) > Math.abs(dy);
    const k = horiz ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : dy > 0 ? "ArrowDown" : "ArrowUp";
    const span = Math.min(260, Math.max(60, (horiz ? Math.abs(dx) : Math.abs(dy)) * 3));
    await hold(page, k, span);
    const q = await pos();
    if (Math.hypot(q.x - p.x, q.y - p.y) < 2) {
      // 詰まった: 直交方向へ少し動く
      const alt = horiz ? (dy >= 0 ? "ArrowDown" : "ArrowUp") : dx >= 0 ? "ArrowRight" : "ArrowLeft";
      await hold(page, alt, 220);
    }
    p = await pos();
  }
  return false;
}
/** collision.pngで経路を引き、キーを押しっぱなしで滑らかに（斜めも）たどる */
async function followPath(page, sceneKey, nativeWidth, maskUrl, target, { timeout = 12000, clearance = 1 } = {}) {
  const pos = () => page.evaluate(([k, w]) => window.__mq0cap.playerPos(k, w), [sceneKey, nativeWidth]);
  const from = await pos();
  const { points } = await page.evaluate(([m, f, t, c]) => window.__mq0cap.planPath(m, f, t, 8, c), [maskUrl, from, target, clearance]);
  const down = new Set();
  const setKey = async (k, on) => {
    if (on && !down.has(k)) { await page.keyboard.down(k); down.add(k); }
    if (!on && down.has(k)) { await page.keyboard.up(k); down.delete(k); }
  };
  const t0 = Date.now();
  let i = 0;
  while (i < points.length && Date.now() - t0 < timeout) {
    const p = await pos();
    const wp = points[i];
    const dx = wp.x - p.x, dy = wp.y - p.y;
    if (Math.hypot(dx, dy) < 12) { i++; continue; }
    await setKey("ArrowRight", dx > 5);
    await setKey("ArrowLeft", dx < -5);
    await setKey("ArrowDown", dy > 5);
    await setKey("ArrowUp", dy < -5);
    await page.waitForTimeout(40);
  }
  for (const k of [...down]) await setKey(k, false);
  return i >= points.length;
}
async function majinTap(page, key) {
  await page.keyboard.press(key, { delay: 40 });
  await page.waitForTimeout(60);
  await page.waitForFunction(() => !window.__mq0cap.majinBusy(), undefined, { timeout: 8000, polling: 30 });
  await page.waitForTimeout(90);
}
const isActive = (page, key) => page.evaluate((k) => window.__mq0cap.isActive(k), key);

export const CLIPS = {
  cap_opening: {
    url: "/",
    note: "タイトル→はじめから→起動ノイズ→焚き火の明転（ナレーション前まで）",
    async run(page, rec) {
      await sleep(page, 2500);
      await tap(page, "Enter", 1500); // オープニング回想をスキップ→メニュー
      await rec.start();
      await sleep(page, 2000); // 録画開始直後の負荷と「はじめから」を重ねない
      await tap(page, "Enter", 0); // はじめから
      await sleep(page, 15000);
      await rec.stop();
    },
  },
  cap_worldmap: {
    url: "/?worldMapTest=1",
    note: "カーソル移動→はじまりのまちを決定→拡大演出",
    async run(page, rec) {
      await sleep(page, 2000);
      await rec.start();
      await sleep(page, 600);
      await tap(page, "ArrowRight", 700);
      await tap(page, "ArrowDown", 700);
      await tap(page, "Enter", 0);
      await sleep(page, 5000);
      await rec.stop();
    },
  },
  cap_no02: {
    url: "/?mapTest=no02",
    note: "はじまりのまちを3人追従で歩く（タロサ・ミレイは一時ブラウザ内のPartySystemへ追加）",
    async run(page, rec) {
      await sleep(page, 2000);
      await page.evaluate(() => window.__mq0cap.addParty(["tarosa", "mirei"]));
      await page.evaluate(() => window.__game.scene.getScene("StartingTownScene").scene.restart());
      await sleep(page, 2000);
      await rec.start();
      await hold(page, "ArrowUp", 3000);
      await hold(page, "ArrowRight", 1400);
      await hold(page, "ArrowUp", 1800);
      await sleep(page, 600);
      await rec.stop();
    },
  },
  cap_bie: {
    url: "/?mapTest=bie-village",
    note: "水車小屋の前の道を行き来する（録画前に一時ブラウザ内で水車小屋の前へ移動）。チリチリの発生時刻と画面内かどうかを tearEvents に記録",
    async run(page, rec) {
      const K = "BieVillageTestScene", W = 1536;
      await sleep(page, 2500);
      await page.evaluate(([k, w]) => window.__mq0cap.placePlayer(k, w, { x: 430, y: 390 }), [K, W]);
      await sleep(page, 1200);
      await page.evaluate((k) => window.__mq0cap.tearWatch(k), K);
      await rec.start();
      for (let loop = 0; loop < 3; loop++) {
        await hold(page, "ArrowLeft", 700);
        await sleep(page, 1800);
        await hold(page, "ArrowRight", 900);
        await sleep(page, 1500);
        await hold(page, "ArrowDown", 500);
        await sleep(page, 1200);
        await hold(page, "ArrowUp", 500);
        await sleep(page, 1500);
      }
      rec.extra = { tearEvents: await page.evaluate(() => window.__mq0cap.tearEvents()) };
      await rec.stop();
    },
  },
  cap_castle3d: {
    url: "/?mapTest=rainland-castle-3d",
    note: "絨毯に沿って王座へ前進",
    async run(page, rec) {
      await sleep(page, 4000);
      await rec.start();
      await sleep(page, 500);
      await hold(page, "ArrowUp", 7000);
      await sleep(page, 500);
      await rec.stop();
    },
  },
  cap_majin_explore: {
    url: "/?mapTest=majin-cave&seed=8008",
    note: "1Fを1マスずつ探索（下り階段へ向かう）",
    async run(page, rec) {
      await sleep(page, 2500);
      const keys = await page.evaluate(() => window.__mq0cap.majinApproachStairs(40));
      await sleep(page, 500);
      await rec.start();
      await sleep(page, 400);
      for (const k of keys.slice(0, 26)) await tap(page, k, 240);
      await sleep(page, 400);
      await rec.stop();
    },
  },
  cap_majin_house: {
    url: "/?mapTest=majin-cave&seed=8008",
    note: "モンスターハウス階の1つ上から階段を下り、「モンスターハウス！」表示まで（途中階は一時ブラウザ内でDEVの10Fスキップと同じ手順で省略）",
    async run(page, rec) {
      await sleep(page, 2500);
      const house = await page.evaluate(() => window.__mq0cap.majinState().houseFloor);
      await page.evaluate((f) => window.__mq0cap.majinSkipTo(f - 1), house);
      const keys = await page.evaluate(() => window.__mq0cap.majinApproachStairs(6));
      await sleep(page, 800);
      await rec.start();
      await sleep(page, 300);
      for (const k of keys) await majinTap(page, k);
      await page.keyboard.press("Enter", { delay: 40 });
      await sleep(page, 5500);
      await rec.stop();
    },
  },
  cap_majin_boss: {
    url: "/?mapTest=majin-cave&seed=8008&majinCaveFloor=10",
    note: "10F: ボス部屋の手前から前進→「まじんが あらわれた！」→攻撃の応酬",
    async run(page, rec) {
      await sleep(page, 2500);
      const keys = await page.evaluate(() => window.__mq0cap.majinPlaceNearBoss(7));
      await sleep(page, 800);
      await rec.start();
      await sleep(page, 300);
      for (const k of keys) {
        await majinTap(page, k);
        const again = await page.evaluate(() => window.__mq0cap.majinKeysTowardBoss());
        if (!again.length) break;
      }
      for (let i = 0; i < 7; i++) {
        const dir = await page.evaluate(() => {
          const s = window.__mq0cap.majinState();
          const d = { x: s.boss.x - s.pos.x, y: s.boss.y - s.pos.y };
          return d.x > 0 ? "ArrowRight" : d.x < 0 ? "ArrowLeft" : d.y > 0 ? "ArrowDown" : "ArrowUp";
        });
        await majinTap(page, dir);
        await sleep(page, 250);
      }
      await sleep(page, 600);
      await rec.stop();
    },
  },
  cap_forest_battle: {
    url: "/?mapTest=starting-forest",
    note: "エンカウント→こうげき→「たおした！」",
    async run(page, rec) {
      await sleep(page, 2000);
      await rec.start();
      for (let i = 0; i < 12; i++) {
        const k = i % 2 ? "ArrowDown" : "ArrowUp";
        await page.keyboard.down(k);
        try {
          await page.waitForFunction(() => window.__mq0cap.isActive("BattleScene"), undefined, { timeout: 1600, polling: 30 });
        } catch {}
        await page.keyboard.up(k);
        if (await isActive(page, "BattleScene")) break;
      }
      await sleep(page, 1500);
      for (let i = 0; i < 16; i++) {
        await tap(page, "Enter", 650);
        if (!(await isActive(page, "BattleScene"))) break;
      }
      await sleep(page, 1200);
      await rec.stop();
    },
  },
  cap_shoot_chain: {
    url: "/?mapTest=iwayama-shooting&shootingSection=chain",
    note: "爆発岩の連鎖（画面に入った爆発岩の真下へ寄せてZを連打）",
    async run(page, rec) {
      await sleep(page, 800);
      await rec.start();
      const t0 = Date.now();
      let lastShot = 0;
      let held = null;
      while (Date.now() - t0 < 12500) {
        const aim = await page.evaluate(() => {
          const s = window.__game.scene.getScene("IwayamaShootingScene");
          const targets = s.rocks.filter((r) => r.alive && r.kind === "explosive" && r.y > 40 && r.y < s.playerY - 80);
          if (!targets.length) return null;
          targets.sort((a, b) => b.y - a.y);
          return targets[0].x - s.playerX;
        });
        const want = aim === null || Math.abs(aim) < 14 ? null : aim > 0 ? "ArrowRight" : "ArrowLeft";
        if (want !== held) {
          if (held) await page.keyboard.up(held);
          if (want) await page.keyboard.down(want);
          held = want;
        }
        if (Date.now() - lastShot > 110) {
          // 押しっぱなしだと開始前の入力として扱われ、矢が出ないことがあるので連打する
          await page.keyboard.down("KeyZ");
          await page.waitForTimeout(30);
          await page.keyboard.up("KeyZ");
          lastShot = Date.now();
        } else await page.waitForTimeout(30);
      }
      if (held) await page.keyboard.up(held);
      await sleep(page, 600);
      await rec.stop();
    },
  },
  cap_shoot_wall: {
    url: "/?mapTest=iwayama-shooting&shootingSection=wall",
    note: "巨大岩壁のヒビ→崩落→光（Z連射）",
    async run(page, rec) {
      await sleep(page, 2500);
      await rec.start();
      for (let i = 0; i < 60; i++) await tap(page, "KeyZ", 110);
      await sleep(page, 5000);
      await rec.stop();
    },
  },
  cap_hidden: {
    url: "/?mapTest=hidden-village",
    note: "かくれざとの坂道を歩く",
    async run(page, rec) {
      await sleep(page, 2500);
      await rec.start();
      await hold(page, "ArrowDown", 2200);
      await hold(page, "ArrowRight", 1600);
      await hold(page, "ArrowDown", 2400);
      await sleep(page, 500);
      await rec.stop();
    },
  },
  cap_lake3d: {
    url: "/?mapTest=lake-castle-3d&floor=1",
    note: "一人称で水辺の回廊を前進",
    async run(page, rec) {
      await sleep(page, 4500);
      await rec.start();
      await sleep(page, 400);
      await hold(page, "ArrowUp", 7000);
      await sleep(page, 400);
      await rec.stop();
    },
  },
};
