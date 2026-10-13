// フレーム送り録画（record_stepped.mjs）の台本。30fps。キーは押したまま rec.step() で進める。
// 3D城・王の間は操作説明とミニマップも隠す（window.__mq0hide3dHud）。タッチボタンは lib/pageHelpers.js が一時ブラウザ内だけで隠す（requestAnimationFrame はループ停止中も動く）。

const sleep = (page, ms) => page.waitForTimeout(ms);

export const STEPPED_CLIPS = {
  cap_castle3d_pc: {
    url: "/?mapTest=rainland-castle-3d",
    note: "3D城内。絨毯に沿って扉へ前進（8秒）",
    async run(page, rec) {
      await page.evaluate(() => { window.__mq0hide3dHud = true; });
      await sleep(page, 6000);
      await rec.freeze();
      await rec.step(10);
      await page.keyboard.down("ArrowUp");
      await rec.step(220);
      await page.keyboard.up("ArrowUp");
      await rec.step(15);
    },
  },
  cap_throne3d_pc: {
    url: "/?mapTest=rainland-throne-room",
    note: "王の間。Vで3Dへ切替→南の入口から玉座へ前進（約10秒）",
    async run(page, rec) {
      await sleep(page, 4000);
      await page.evaluate(() => { window.__mq0hide3dHud = true; });
      await page.keyboard.press("v", { delay: 60 });
      await sleep(page, 6000);
      await rec.freeze();
      await rec.step(10);
      await page.keyboard.down("ArrowUp");
      await rec.step(290);
      await page.keyboard.up("ArrowUp");
      await rec.step(20);
    },
  },
  cap_majin_boss_pc: {
    url: "/?mapTest=majin-cave&seed=8008&majinCaveFloor=10",
    note: "10F: ボス部屋の手前から前進→「まじんが あらわれた！」→攻撃の応酬",
    async run(page, rec) {
      await sleep(page, 3000);
      const keys = await page.evaluate(() => window.__mq0cap.majinPlaceNearBoss(7));
      await sleep(page, 800);
      await rec.freeze();
      await rec.step(8);
      const press = async (k) => {
        await page.keyboard.down(k);
        await rec.step(2);
        await page.keyboard.up(k);
        await rec.step(2);
        await rec.stepUntil(() => !window.__mq0cap.majinBusy(), 300);
        await rec.step(3);
      };
      for (const k of keys) {
        await press(k);
        const again = await page.evaluate(() => window.__mq0cap.majinKeysTowardBoss());
        if (!again.length) break;
      }
      for (let i = 0; i < 7; i++) {
        const dir = await page.evaluate(() => {
          const s = window.__mq0cap.majinState();
          const d = { x: s.boss.x - s.pos.x, y: s.boss.y - s.pos.y };
          return d.x > 0 ? "ArrowRight" : d.x < 0 ? "ArrowLeft" : d.y > 0 ? "ArrowDown" : "ArrowUp";
        });
        await press(dir);
        await rec.step(6);
      }
      await rec.step(20);
    },
  },
};
