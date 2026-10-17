/* Motion-comic engine.
   Builds one paused GSAP timeline from project/timeline.json + assets/build/manifest.json and
   renders any time t deterministically (window.__seek(t)), like awesome-ai-motion's lib/stage.js.
   - no Math.random / Date.now in rendering: everything is a function of t (seeded RNG only)
   - all element state lives in plain proxy objects tweened by GSAP; apply() writes the DOM
   Modes: ?render=1 (wait for __seek), ?t=12.3 (still), default live loop.  ?from=40 starts live at 40s. */
(function () {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const W = 1920, H = 1080;
  const ROOT = qs.get('root') || '../..';
  const P = {
    timeline: qs.get('timeline') || `${ROOT}/project/timeline.json`,
    effects: `${ROOT}/project/effects_config.json`,
    manifest: `${ROOT}/assets/build/manifest.json`,
    voices: `${ROOT}/assets/audio/voice/voice_index.json`,
    build: `${ROOT}/assets/build/`,
  };

  // ---------- deterministic helpers ----------
  function rand(seed) { let a = seed >>> 0 || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const springCurve = t => 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2); // spring-overshoot card
  const el = (tag, cls, parent, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (style) Object.assign(e.style, style); if (parent) parent.appendChild(e); return e; };

  async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }

  // ---------- state ----------
  const S = { tl: null, total: 0, scenes: [], shots: [], lines: {}, env: {}, man: null, fx: null,
    cam: { cx: 0, cy: 0, w: 1000 }, shake: { x: 0, y: 0, r: 0 }, screen: { flash: 0, black: 0, lines: 0, dissolve: 0, dissolveDir: 1, tint: 0 },
    parts: {}, bubbles: {}, sfx: {}, mouths: [], eyes: {}, panelFx: {}, particles: [], speed: [], lipsync: [], eyeTalk: [], dissolves: [], parallax: [] };

  // build-time "current value" tracking so every tween is an explicit fromTo (seek-safe in any order)
  const cur = new WeakMap();
  function now(proxy) { if (!cur.has(proxy)) cur.set(proxy, Object.assign({}, proxy)); return cur.get(proxy); }
  function tw(proxy, to, at, dur, ease) {
    const c = now(proxy), from = {};
    for (const k in to) from[k] = c[k];
    S.tl.fromTo(proxy, from, Object.assign({}, to, { duration: Math.max(0.001, dur), ease: ease || 'power2.out', immediateRender: false }), at);
    Object.assign(c, to);
  }
  function set(proxy, vals, at) { const c = now(proxy); S.tl.set(proxy, vals, at); Object.assign(c, vals); }

  // ---------- DOM ----------
  let backdrop, stage, world, canvas, ctx, flash, black, tint, vignette;
  function buildDom(man) {
    stage = el('div', 'stage', document.body);
    backdrop = el('img', 'backdrop', stage);
    world = el('div', 'world', stage, { width: man.size[0] + 'px', height: man.size[1] + 'px' });
    for (const [id, p] of Object.entries(man.panels)) {
      const d = el('div', 'panel', world, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px', display: 'none' });
      d.dataset.id = id;
      const base = el('img', 'base', d); base.src = P.build + p.src;
      S.panelFx[id] = { div: d, base, layers: [], dark: null, lampEls: [], sweep: null, flicker: null,
        st: { dark: 0, reveal: 1, sweep: -1, flicker: 0, lamps: 0 } };
    }
    for (const [id, p] of Object.entries(man.parts)) {
      const pd = man.panels[p.panel];
      const img = el('img', 'part', S.panelFx[p.panel].div, { left: (p.x - pd.x) + 'px', top: (p.y - pd.y) + 'px', width: p.w + 'px', height: p.h + 'px', transformOrigin: `${p.origin[0] * 100}% ${p.origin[1] * 100}%` });
      img.src = P.build + p.src;
      S.parts[id] = { img, st: { x: 0, y: 0, s: 1, sx: 1, sy: 1, rot: 0, op: 1 }, w: p.w, h: p.h, pw: pd.w };
    }
    for (const [id, m] of Object.entries(man.mouths)) {
      const pd = man.panels[m.panel];
      const img = el('img', 'mouth', S.panelFx[m.panel].div, { left: (m.x - pd.x) + 'px', top: (m.y - pd.y) + 'px', width: m.w + 'px', height: m.h + 'px', opacity: 0 });
      img.src = P.build + m.src;
      S.mouths[id] = { img, panel: m.panel };
    }
    for (const [id, e] of Object.entries(man.eyes)) {
      const pd = man.panels[e.panel];
      const parts = e.points.map(([x, y]) => {
        const glow = el('div', 'eyeglow', S.panelFx[e.panel].div, { left: (x - pd.x - e.r * 2.4) + 'px', top: (y - pd.y - e.r * 2.4) + 'px', width: e.r * 4.8 + 'px', height: e.r * 4.8 + 'px', background: `radial-gradient(circle, ${e.color} 0%, ${e.color}aa 22%, ${e.color}33 45%, transparent 70%)` });
        const lid = el('div', 'eyelid', S.panelFx[e.panel].div, { left: (x - pd.x - e.r * 1.25) + 'px', top: (y - pd.y - e.r * 1.25) + 'px', width: e.r * 2.5 + 'px', height: e.r * 2.5 + 'px' });
        return { glow, lid };
      });
      S.eyes[id] = { parts, st: { glow: 0.0, blink: 0, scale: 1 }, panel: e.panel };
    }
    for (const kind of ['bubbles', 'sfx']) {
      for (const [id, b] of Object.entries(man[kind])) {
        const img = el('img', kind === 'bubbles' ? 'bubble' : 'sfxtext', world, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px', opacity: 0 });
        img.src = P.build + b.src;
        S[kind][id] = { img, panel: b.panel, st: { s: 0, op: 0, x: 0, y: 0, rot: 0, clip: 0 }, w: b.w, h: b.h };
      }
    }
    canvas = el('canvas', 'fx', stage); canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d');
    tint = el('div', 'tint', stage);
    vignette = el('div', 'vignette', stage);
    flash = el('div', 'flash', stage);
    black = el('div', 'black', stage);
  }

  // ---------- timeline construction ----------
  function camFrame(panelId, k) {
    const p = S.man.panels[panelId];
    return { cx: p.x + k.u * p.w, cy: p.y + k.v * p.h, w: k.w * p.w };
  }

  function addEffects() {
    const fx = S.fx.presets;
    const H_ = {
      // ----- camera / screen -----
      shake(e, t) { // effects/shake: [8,-8,5,-5,3,-3,1.5,0] every 0.09s, sine.inOut
        const g = e.gain || 1, step = e.step || fx.shake.step;
        fx.shake.amps.forEach((a, i) => tw(S.shake, { x: a * g, y: (i % 2 ? a : -a) * g * 0.45 * (e.vertical ?? 1), r: a * g * 0.02 * (e.roll ?? 1) }, t + i * step, step, 'sine.inOut'));
      },
      flash(e, t) { tw(S.screen, { flash: e.peak ?? 0.85 }, t, 0.04, 'none'); tw(S.screen, { flash: 0 }, t + 0.04, e.dur || 0.22, 'power2.out'); },
      fade(e, t) { tw(S.screen, { black: e.to }, t, e.dur || 0.5, e.ease || 'power1.inOut'); },
      tint(e, t) { tw(S.screen, { tint: e.to }, t, e.dur || 0.5, 'sine.inOut'); },
      dissolve(e, t) { // effects/noise-dissolve: fixed noise, moving threshold, power1.inOut
        S.dissolves.push({ t0: t, dur: e.dur || fx['noise-dissolve'].duration, dir: e.dir || 'in' });
      },
      speedlines(e, t) { S.speed.push({ t0: t, t1: t + (e.dur || 0.6), focus: e.focus || [0.5, 0.5], peak: e.peak ?? 1, inner: e.inner ?? 0.32, color: e.color || '#fff', seed: e.seed || 11 }); },
      particles(e, t) { S.particles.push(Object.assign({}, e, { t0: t, t1: t + (e.dur || 2) })); },
      // ----- characters / parts -----
      part(e, t) { animPart(S.parts[e.id], e, t); },
      bubble(e, t) { popBubble(S.bubbles[e.id], e, t); },
      sfxtext(e, t) { popSfx(S.sfx[e.id], e, t); },
      lipsync(e, t) { S.lipsync.push({ mouth: e.mouth, line: e.line }); },
      'eyes-talk'(e, t) { S.eyeTalk.push({ eyes: e.eyes, line: e.line, gain: e.gain ?? 1 }); },
      eyes(e, t) { tw(S.eyes[e.id].st, { glow: e.glow ?? S.eyes[e.id].st.glow, scale: e.scale ?? 1 }, t, e.dur || 0.3, e.ease || 'power2.out'); },
      blink(e, t) { const st = S.eyes[e.id].st, d = S.fx.extras['robot-eyes'].blinkDuration; tw(st, { blink: 1 }, t, d * 0.45, 'power2.in'); tw(st, { blink: 0 }, t + d * 0.45, d * 0.55, 'power2.out'); },
      // ----- panel lighting -----
      darkness(e, t) { set(S.panelFx[e.panel].st, { dark: e.value, reveal: 0 }, t); },
      'lights-on'(e, t) { // mask-reveal style: darkness band slides away top->bottom (power3.out), lamps stagger on
        const pf = S.panelFx[e.panel];
        tw(pf.st, { reveal: 1 }, t + 0.25, e.dur || 1.6, 'power3.out');
        tw(pf.st, { lamps: 1 }, t, (e.dur || 1.6) * 0.8, 'none');
      },
      'light-sweep'(e, t) { // effects/light-sweep: one pass, power1.inOut
        const pf = S.panelFx[e.panel];
        set(pf.st, { sweep: 0 }, t); tw(pf.st, { sweep: 1 }, t, e.dur || fx['light-sweep'].duration, 'power1.inOut'); set(pf.st, { sweep: -1 }, t + (e.dur || fx['light-sweep'].duration));
        pf.sweepRect = e.rect || [0, 0, 1, 1]; pf.sweepPeak = e.peak ?? 0.42;
      },
      flicker(e, t) { const pf = S.panelFx[e.panel]; pf.flickers = (pf.flickers || []).concat([{ t0: t, t1: t + (e.dur || 1), color: e.color || '255,150,60', peak: e.peak ?? 0.35, seed: e.seed || 3 }]); },
      parallax(e, t) { S.parallax.push(Object.assign({}, e, { t0: t, t1: t + e.dur })); setupParallax(e); },
    };

    for (const sc of S.scenes) {
      // shots: camera keyframes + panel visibility
      for (const sh of sc.shots) {
        const t0 = sc.start + sh.t0;
        const ks = sh.cam;
        const f0 = camFrame(sh.panel, ks[0]);
        set(S.cam, f0, t0);
        for (let i = 1; i < ks.length; i++) {
          tw(S.cam, camFrame(sh.panel, ks[i]), sc.start + ks[i - 1].t, ks[i].t - ks[i - 1].t, ks[i].ease || 'sine.inOut');
        }
        S.shots.push({ t0, t1: sc.start + sh.t1, panel: sh.panel, clamp: sh.clamp !== false, fit: !!sh.fit, also: sh.also || [] });
      }
      const evs = (sc.events || []).map(e => Object.assign({}, e, { at: sc.start + e.t })).sort((a, b) => a.at - b.at);
      for (const e of evs) {
        if (!H_[e.type]) { console.warn('unknown event', e.type); continue; }
        H_[e.type](e, e.at);
        if (e.until !== undefined) e.untilAbs = sc.start + e.until;
      }
      // bubbles/sfx hide at scene end unless 'until' given
      for (const e of evs) {
        if (e.type !== 'bubble' && e.type !== 'sfxtext') continue;
        const obj = e.type === 'bubble' ? S.bubbles[e.id] : S.sfx[e.id];
        set(obj.st, { op: 0 }, e.untilAbs ?? (sc.start + sc.dur - 0.001));
      }
    }
  }

  function animPart(p, e, t) {
    const fx = S.fx.presets, st = p.st, k = e.amount ?? 1;
    const d = e.dist ?? 0.02; // fraction of part width
    switch (e.anim) {
      case 'anticipation': { // effects/anticipation: back 54px/0.25s power2.inOut, launch 0.65s power3.out, stretch 1.3
        const a = fx.anticipation, dx = (e.dir || [1, 0])[0] * d * p.w, dy = (e.dir || [1, 0])[1] * d * p.w;
        const st2 = 1 + (a.stretch - 1) * 0.25 * k;
        tw(st, { x: -dx * 0.6, y: -dy * 0.6, sx: st2, sy: 1 / st2 + 0.08, rot: -(e.rot || 0) }, t, a.backDuration, a.ease[0]);
        tw(st, { x: dx, y: dy, sx: 1, sy: 1, rot: e.rot || 0 }, t + a.backDuration, a.launchDuration * 0.5, a.ease[1]);
        tw(st, { x: 0, y: 0, rot: 0 }, t + a.backDuration + a.launchDuration * 0.5, e.settle || 0.6, 'power2.out');
        break;
      }
      case 'squash-stretch': { // effects/squash-stretch (attenuated for a metal robot / drawn character)
        const g = S.fx.presets['squash-stretch'].partGain * k;
        const sx = s => ({ sy: 1 + (s - 1) * g, sx: 1 / (1 + (s - 1) * g) });
        const seq = e.seq || [[1.55, 0.18, 'power2.inOut'], [0.55, 0.1, 'power2.out'], [1.35, 0.15, 'power2.out'], [1, 0.2, 'power2.out']];
        let tt = t; for (const [s, du, ea] of seq) { tw(st, Object.assign(sx(s), e.hop ? { y: -(s > 1 ? (s - 1) * e.hop * p.w : 0) } : {}), tt, du, ea); tt += du; }
        if (e.hop) tw(st, { y: 0 }, tt, 0.15, 'power2.in');
        break;
      }
      case 'spring-pop': { // effects/spring-overshoot curve on scale, shortened
        const base = e.base ?? 1.0, peak = e.peak ?? 0.08, dur = e.dur || 0.8, o = { v: 0 };
        set(st, { s: base * (e.from ?? 1) }, t);
        const steps = 8; let prev = e.from ?? 1;
        for (let i = 1; i <= steps; i++) { const v = springCurve(i / steps); const sv = lerp(e.from ?? 1, 1, v) + (v > 1 ? 0 : 0); tw(st, { s: base * (sv + (v - 1) * peak * 4) }, t + dur * (i - 1) / steps, dur / steps, 'none'); prev = sv; }
        break;
      }
      case 'follow-through': { // effects/follow-through angle sequence, attenuated
        const ft = S.fx.presets['follow-through'], g = ft.partGain * k;
        for (let i = 0; i < ft.angles.length; i++) {
          const nxt = ft.starts[i + 1] ?? (ft.starts[i] + 0.2);
          tw(st, { rot: ft.angles[i] * g * (e.sign || 1) }, t + ft.starts[i] * (e.speed || 1), (nxt - ft.starts[i]) * (e.speed || 1), i < 2 ? 'power2.out' : 'power1.inOut');
        }
        break;
      }
      case 'overlap-move': { // effects/overlapping-action: stagger 0.07, +0.06s per trailing part
        const oa = S.fx.presets['overlapping-action'], i = e.index || 0;
        const dur = (e.dur || oa.baseDuration) + i * oa.durationStep;
        tw(st, { x: (e.to?.[0] ?? 0) * p.w, y: (e.to?.[1] ?? 0) * p.w, rot: e.rotTo ?? st.rot }, t + i * oa.stagger, dur, oa.ease);
        break;
      }
      case 'to': tw(st, Object.assign({}, e.to, e.to.x !== undefined ? { x: e.to.x * p.w } : {}, e.to.y !== undefined ? { y: e.to.y * p.w } : {}), t, e.dur || 0.5, e.ease || 'power2.out'); break;
      case 'breathe': { // gentle idle loop (scale >= 1 so the cut-out always covers the original)
        const n = Math.max(1, Math.floor((e.dur || 4) / (e.period || 2.4)));
        for (let i = 0; i < n; i++) { const pp = e.period || 2.4; tw(st, { sy: 1 + 0.012 * k, sx: 1 + 0.004 * k, y: -0.004 * k * p.w }, t + i * pp, pp / 2, 'sine.inOut'); tw(st, { sy: 1, sx: 1, y: 0 }, t + i * pp + pp / 2, pp / 2, 'sine.inOut'); }
        break;
      }
      case 'rotate': tw(st, { rot: e.to }, t, e.dur || 4, e.ease || 'none'); break;
      default: console.warn('unknown part anim', e.anim);
    }
  }

  function popBubble(b, e, t) {
    const anim = e.anim || 'spring';
    if (anim === 'mask-reveal') { // effects/mask-reveal: power3.out 1.05s
      set(b.st, { op: 1, s: 1, clip: 1 }, t);
      tw(b.st, { clip: 0 }, t, S.fx.presets['mask-reveal'].duration, 'power3.out');
      return;
    }
    if (anim === 'instant') { set(b.st, { op: 1, s: 1, clip: 0 }, t); return; }
    if (anim === 'fade') { set(b.st, { s: 1, clip: 0 }, t); tw(b.st, { op: 1 }, t, 0.25, 'power1.out'); return; }
    // spring-overshoot (shortened): 0 -> overshoot -> 1
    const dur = e.dur || S.fx.presets['spring-overshoot'].bubbleDuration, n = 8;
    const s0 = e.from ?? 0.8;
    set(b.st, { op: 1, s: s0, clip: 0 }, t);
    for (let i = 1; i <= n; i++) tw(b.st, { s: lerp(s0, 1, springCurve(i / n)) }, t + dur * (i - 1) / n, dur / n, 'none');
  }

  function popSfx(b, e, t) {
    if (e.anim === 'instant') { set(b.st, { op: 1, s: 1, rot: 0, x: 0, y: 0, clip: 0 }, t); return; }
    set(b.st, { op: 1, s: 1.6, rot: e.rot || -6, clip: 0 }, t);
    tw(b.st, { s: 0.92, rot: 0 }, t, 0.12, 'power3.in');
    tw(b.st, { s: 1.0 }, t + 0.12, 0.25, 'back.out(3)');
    S.fx.presets.shake.amps.forEach((a, i) => tw(b.st, { x: a * (e.gain || 3), y: -a * (e.gain || 3) * 0.6 }, t + 0.12 + i * 0.06, 0.06, 'sine.inOut'));
    if (e.hold) tw(b.st, { op: 0 }, t + e.hold, 0.3, 'power1.in');
  }

  function setupParallax(e) {
    // effects/deep-parallax: same panel image as stacked bands, each with its own speed ratio
    const pf = S.panelFx[e.panel];
    if (pf.layers.length) return;
    for (const b of e.bands) {
      const img = el('img', 'layer', pf.div);
      img.src = pf.base.src;
      const m = `linear-gradient(to bottom, transparent ${(b.v0 - b.soft) * 100}%, black ${(b.v0 + b.soft) * 100}%)`;
      img.style.webkitMaskImage = img.style.maskImage = m;
      if (b.blur) img.style.filter = `blur(${b.blur}px)`;
      pf.div.insertBefore(img, pf.base.nextSibling);
      pf.layers.push({ img, ratio: b.ratio });
      pf.div.appendChild(img);
    }
    // keep parts / mouths / eyes above the bands
    for (const n of [...pf.div.children]) if (!n.classList.contains('base') && !n.classList.contains('layer')) pf.div.appendChild(n);
  }

  function buildPanelOverlays() {
    for (const [id, pf] of Object.entries(S.panelFx)) {
      const pd = S.man.panels[id];
      pf.dark = el('div', 'dark', pf.div);
      pf.sweep = el('div', 'sweep', pf.div);
      pf.flick = el('div', 'flick', pf.div);
      const lamps = S.man.lamps[id] || [];
      // lamps light up left->right with a little seeded jitter
      const rng = rand(99);
      pf.lampEls = lamps.map(l => ({ e: el('div', 'lamp', pf.div, { left: (l.x - pd.x - l.r * 3) + 'px', top: (l.y - pd.y - l.r * 3) + 'px', width: l.r * 6 + 'px', height: l.r * 6 + 'px' }), order: (l.x - pd.x) / pd.w * 0.8 + rng() * 0.2 }));
    }
  }

  // ---------- per-frame application ----------
  function activeShot(t) { let s = S.shots[0]; for (const sh of S.shots) if (t >= sh.t0 - 1e-6) s = sh; return s; }

  function lineEnv(lid, t) {
    const L = S.lines[lid]; if (!L) return -1;
    const lt = t - L.at; if (lt < 0 || lt > L.dur) return -1;
    const e = S.env[lid]; if (!e) return 0;
    return e[Math.min(e.length - 1, Math.floor(lt * 30))];
  }

  function apply(t) {
    const shot = activeShot(t);
    for (const [id, pf] of Object.entries(S.panelFx)) pf.div.style.display = (id === shot.panel || shot.also.includes(id)) ? 'block' : 'none';

    // camera
    const p = S.man.panels[shot.panel];
    let { cx, cy, w } = S.cam;
    let h = w * H / W;
    let fitted = false;
    if (shot.clamp) {
      const m = 0.012; // inset so shake never shows the gutter
      const minW = p.w * (1 - 2 * m), minH = p.h * (1 - 2 * m);
      if (shot.fit && (w > minW || h > minH)) {
        // frame larger than the panel: show the whole panel over a blurred copy of itself
        fitted = true;
        cx = w > minW ? cx : clamp(cx, p.x + p.w * m + w / 2, p.x + p.w * (1 - m) - w / 2);
        cy = h > minH ? p.y + p.h / 2 : clamp(cy, p.y + p.h * m + h / 2, p.y + p.h * (1 - m) - h / 2);
      } else {
        if (w > minW) { w = minW; h = w * H / W; }
        if (h > minH) { h = minH; w = h * W / H; }
        cx = clamp(cx, p.x + p.w * m + w / 2, p.x + p.w * (1 - m) - w / 2);
        cy = clamp(cy, p.y + p.h * m + h / 2, p.y + p.h * (1 - m) - h / 2);
      }
    }
    backdrop.style.display = fitted ? 'block' : 'none';
    if (fitted && backdrop.dataset.panel !== shot.panel) { backdrop.src = S.panelFx[shot.panel].base.src; backdrop.dataset.panel = shot.panel; }
    S.panelFx[shot.panel].div.style.outline = fitted ? `${6 * w / W}px solid #f3efe6` : 'none';
    const sc = W / w;
    world.style.transform = `translate(${W / 2 + S.shake.x}px, ${H / 2 + S.shake.y}px) rotate(${S.shake.r}deg) scale(${sc}) translate(${-cx}px, ${-cy}px)`;
    S.view = { cx, cy, sc };

    // parallax bands
    for (const px of S.parallax) {
      const pf = S.panelFx[px.panel];
      const k = clamp((t - px.t0) / (px.t1 - px.t0), 0, 1);
      const e = gsap.parseEase(px.ease || 'sine.inOut')(k);
      pf.layers.forEach(L => { L.img.style.transform = `translate(${-(px.movePx || 0) * (L.ratio - 1) * e}px, 0) scale(${1 + Math.max(0, L.ratio - 1) * 0.02})`; });
    }

    // parts
    for (const pr of Object.values(S.parts)) {
      const s = pr.st;
      pr.img.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg) scale(${s.s * s.sx}, ${s.s * s.sy})`;
      pr.img.style.opacity = s.op;
    }
    // bubbles & sfx text
    for (const kind of ['bubbles', 'sfx']) for (const b of Object.values(S[kind])) {
      const s = b.st;
      const vis = s.op > 0.001 && (b.panel === shot.panel || shot.also.includes(b.panel));
      b.img.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      b.img.style.opacity = s.op;
      b.img.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg) scale(${s.s})`;
      b.img.style.clipPath = s.clip > 0 ? `inset(0 0 ${s.clip * 100}% 0)` : 'none';
    }
    // lip flaps: closed overlay when the voice is quiet, original (open) mouth when loud
    const thr = S.fx.extras['lip-flap'].threshold;
    for (const m of Object.values(S.mouths)) m.img.style.opacity = 0;
    for (const ls of S.lipsync) {
      const v = lineEnv(ls.line, t); if (v < 0) continue;
      const v2 = lineEnv(ls.line, t - 1 / 30);
      S.mouths[ls.mouth].img.style.opacity = (Math.max(v, v2 < 0 ? 0 : v2 * 0.6) < thr) ? 1 : 0;
    }
    // robot eyes
    const re = S.fx.extras['robot-eyes'];
    for (const [id, ey] of Object.entries(S.eyes)) {
      let g = ey.st.glow;
      for (const et of S.eyeTalk) if (et.eyes === id) { const v = lineEnv(et.line, t); if (v >= 0) g = Math.max(g, re.glowBase + re.glowGain * v * et.gain); }
      for (const pt of ey.parts) {
        pt.glow.style.opacity = clamp(g, 0, 1.4);
        pt.glow.style.transform = `scale(${ey.st.scale * (0.9 + 0.25 * clamp(g, 0, 1))})`;
        pt.lid.style.transform = `scaleY(${ey.st.blink})`;
        pt.lid.style.opacity = ey.st.blink > 0.01 ? 1 : 0;
      }
    }
    // panel lighting
    for (const [id, pf] of Object.entries(S.panelFx)) {
      if (pf.div.style.display === 'none') continue;
      const st = pf.st;
      if (st.dark > 0 && st.reveal < 1) {
        const r = st.reveal * 130 - 15;
        pf.dark.style.opacity = st.dark;
        pf.dark.style.webkitMaskImage = pf.dark.style.maskImage = `linear-gradient(to bottom, transparent ${r - 15}%, black ${r + 15}%)`;
      } else pf.dark.style.opacity = 0;
      pf.lampEls.forEach(L => { const on = st.lamps >= L.order ? 1 : (st.dark > 0 ? 0 : 1); L.e.style.opacity = on * (0.75 + 0.25 * Math.sin(t * 9 + L.order * 40)); });
      if (st.sweep >= 0) {
        const [u0, v0, u1, v1] = pf.sweepRect, pd = S.man.panels[id];
        Object.assign(pf.sweep.style, { display: 'block', left: u0 * pd.w + 'px', top: v0 * pd.h + 'px', width: (u1 - u0) * pd.w + 'px', height: (v1 - v0) * pd.h + 'px',
          backgroundPosition: `${lerp(96.4, 3.6, st.sweep)}% 0%`, opacity: pf.sweepPeak });
      } else pf.sweep.style.display = 'none';
      let fl = 0, fc = '255,150,60';
      for (const f of pf.flickers || []) if (t >= f.t0 && t <= f.t1) { const r = rand(f.seed + Math.floor(t * 24))(); fl = Math.max(fl, f.peak * (r > 0.55 ? r : r * 0.3)); fc = f.color; }
      pf.flick.style.background = `rgba(${fc},${fl})`;
    }
    // screen
    flash.style.opacity = S.screen.flash;
    black.style.opacity = S.screen.black;
    tint.style.opacity = S.screen.tint;
    drawCanvas(t);
  }

  // ---------- canvas FX: particles, speed lines, noise dissolve ----------
  let NZ = null; const NW = 480, NH = 270; let nzCanvas, nzCtx, nzImg;
  function buildNoise() { // effects/noise-dissolve: value-noise octaves 190/95/48/16 px + histogram flattening
    const oct = S.fx.presets['noise-dissolve'].octavesPx.map(v => v / 4);
    const rnd = rand(71), sm = t => t * t * (3 - 2 * t);
    NZ = new Float32Array(NW * NH);
    oct.forEach((g, oi) => {
      const gw = Math.ceil(NW / g) + 2, gh = Math.ceil(NH / g) + 2, L = new Float32Array(gw * gh).map(() => rnd());
      const amp = [1, 0.5, 0.25, 0.12][oi];
      for (let y = 0; y < NH; y++) { const fy = y / g, iy = fy | 0, ty = sm(fy - iy);
        for (let x = 0; x < NW; x++) { const fx = x / g, ix = fx | 0, tx = sm(fx - ix), k = iy * gw + ix;
          const a = L[k] + (L[k + 1] - L[k]) * tx, b = L[k + gw] + (L[k + gw + 1] - L[k + gw]) * tx;
          NZ[y * NW + x] += (a + (b - a) * ty) * amp; } }
    });
    const idx = Array.from(NZ.keys()).sort((a, b) => NZ[a] - NZ[b]);
    idx.forEach((k, r) => { NZ[k] = r / (idx.length - 1); });
    nzCanvas = document.createElement('canvas'); nzCanvas.width = NW; nzCanvas.height = NH; nzCtx = nzCanvas.getContext('2d'); nzImg = nzCtx.createImageData(NW, NH);
  }

  function w2s(x, y) { const v = S.view; return [(x - v.cx) * v.sc + W / 2 + S.shake.x, (y - v.cy) * v.sc + H / 2 + S.shake.y]; }

  function drawCanvas(t) {
    ctx.clearRect(0, 0, W, H);
    for (const ps of S.particles) if (t >= ps.t0 && t <= ps.t1) drawParticles(ps, t);
    for (const sl of S.speed) if (t >= sl.t0 && t <= sl.t1) drawSpeedLines(sl, t);
    for (const d of S.dissolves) if (t >= d.t0 - 1e-6 && t <= d.t0 + d.dur + 0.04) drawDissolve(d, t);
  }

  function drawSpeedLines(sl, t) {
    const k = (t - sl.t0) / (sl.t1 - sl.t0);
    const a = sl.peak * (k < 0.15 ? k / 0.15 : 1 - Math.pow((k - 0.15) / 0.85, 2));
    const rng = rand(sl.seed + Math.floor(t * 15)); // re-jitter every 2 frames, manga energy
    const fx = sl.focus[0] * W, fy = sl.focus[1] * H, R = Math.hypot(W, H) * 0.62, r0 = sl.inner * H;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = sl.color;
    const n = S.fx.extras['speed-lines'].count;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rng() * 0.05, wd = 0.004 + rng() * 0.01, rr = r0 * (0.9 + rng() * 0.6);
      ctx.beginPath();
      ctx.moveTo(fx + Math.cos(ang) * rr, fy + Math.sin(ang) * rr);
      ctx.lineTo(fx + Math.cos(ang - wd) * R, fy + Math.sin(ang - wd) * R);
      ctx.lineTo(fx + Math.cos(ang + wd) * R, fy + Math.sin(ang + wd) * R);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawDissolve(d, t) {
    let k = clamp((t - d.t0) / d.dur, 0, 1);
    k = gsap.parseEase(S.fx.presets['noise-dissolve'].ease)(k);
    const cover = d.dir === 'in' ? 1 - k : k; // fraction of screen covered by black
    const rim = S.fx.presets['noise-dissolve'].rim, th = -rim - 0.01 + cover * (1 + rim + 0.02);
    const rc = [255, 179, 107], D = nzImg.data;
    for (let i = 0; i < NZ.length; i++) {
      const e = NZ[i] - th, j = i * 4;
      if (e < 0) { D[j] = 5; D[j + 1] = 6; D[j + 2] = 12; D[j + 3] = 255; }
      else if (e < rim) { const a = 1 - e / rim; D[j] = rc[0]; D[j + 1] = rc[1]; D[j + 2] = rc[2]; D[j + 3] = 255 * a; }
      else D[j + 3] = 0;
    }
    nzCtx.putImageData(nzImg, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(nzCanvas, 0, 0, W, H); ctx.restore();
  }

  function drawParticles(ps, t) {
    const lt = t - ps.t0, rng = rand(ps.seed || 1), n = ps.count || 40;
    const pd = ps.panel ? S.man.panels[ps.panel] : null;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const r = [rng(), rng(), rng(), rng(), rng(), rng(), rng()];
      switch (ps.preset) {
        case 'dust': { // screen-space floating motes, depth-scaled drift (deep-parallax ratios)
          const depth = [0.1, 0.45, 0.95, 1.8][i % 4];
          const x = ((r[0] * W + (ps.vx ?? 12) * depth * lt + (S.view.cx * 0.0)) % W + W) % W;
          const y = ((r[1] * H + (ps.vy ?? -8) * depth * lt) % H + H) % H;
          const s = (0.8 + r[2] * 2.2) * depth;
          ctx.globalAlpha = (ps.alpha ?? 0.5) * (0.4 + 0.6 * Math.sin(lt * (1 + r[3] * 2) + r[4] * 6) ** 2) * fadeIO(lt, ps);
          ctx.fillStyle = ps.color || '#ffe9c8';
          ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
          break;
        }
        case 'debris-float': { // world-space slow drifting rock fragments (P01 sky)
          const u = ps.area[0] + r[0] * (ps.area[2] - ps.area[0]), v = ps.area[1] + r[1] * (ps.area[3] - ps.area[1]);
          const wx = pd.x + (u + (r[2] - 0.5) * 0.02 * lt) * pd.w, wy = pd.y + (v - (0.004 + r[3] * 0.01) * lt) * pd.h;
          const [sx, sy] = w2s(wx, wy), s = (2 + r[4] * 7) * S.view.sc * 2.2;
          ctx.globalAlpha = 0.9 * fadeIO(lt, ps);
          rock(sx, sy, s, r[5] * 6 + lt * (r[6] - 0.5) * 0.8, '#1c1a2a', '#8a7fa8', rand(i + 7));
          break;
        }
        case 'burst': { // rubble / debris explosion from a world point with gravity
          const delay = r[6] * (ps.spread ?? 0.08), lt2 = lt - delay; if (lt2 < 0) continue;
          const ang = (ps.angle ?? -90) * Math.PI / 180 + (r[0] - 0.5) * (ps.cone ?? 140) * Math.PI / 180;
          const sp = (ps.speed ?? 0.5) * (0.4 + r[1] * 0.9) * pd.w;
          const g = (ps.gravity ?? 1.2) * pd.w;
          const wx = pd.x + ps.at[0] * pd.w + Math.cos(ang) * sp * lt2, wy = pd.y + ps.at[1] * pd.h + Math.sin(ang) * sp * lt2 + 0.5 * g * lt2 * lt2;
          const [sx, sy] = w2s(wx, wy), s = (ps.size ?? 6) * (0.4 + r[2]) * S.view.sc * 4;
          ctx.globalAlpha = clamp(1 - lt2 / (ps.life ?? 1.4), 0, 1);
          rock(sx, sy, s, r[3] * 6 + lt2 * (r[4] - 0.5) * 12, ps.color || '#2a2632', ps.edge || '#c9a56a', rand(i + 3));
          break;
        }
        case 'sparks': { // engine sparks: short bright streaks, several bursts
          const per = ps.period ?? 0.45, burst = Math.floor((lt - r[6] * per) / per), lt2 = lt - burst * per - r[6] * per;
          if (burst < 0 || lt2 > (ps.life ?? 0.5)) continue;
          const rb = rand((ps.seed || 1) * 1000 + burst * 97 + i);
          const ang = (ps.angle ?? -60) * Math.PI / 180 + (rb() - 0.5) * (ps.cone ?? 120) * Math.PI / 180;
          const sp = (ps.speed ?? 0.35) * (0.4 + rb() * 0.9) * pd.w, g = 0.9 * pd.w;
          const at = ps.points ? ps.points[burst % ps.points.length] : ps.at;
          const x0 = pd.x + at[0] * pd.w, y0 = pd.y + at[1] * pd.h;
          const p1 = w2s(x0 + Math.cos(ang) * sp * lt2, y0 + Math.sin(ang) * sp * lt2 + 0.5 * g * lt2 * lt2);
          const lt3 = Math.max(0, lt2 - 0.035);
          const p0 = w2s(x0 + Math.cos(ang) * sp * lt3, y0 + Math.sin(ang) * sp * lt3 + 0.5 * g * lt3 * lt3);
          ctx.globalAlpha = clamp(1 - lt2 / (ps.life ?? 0.5), 0, 1);
          ctx.strokeStyle = rb() > 0.5 ? '#fff4c2' : '#ffb347'; ctx.lineWidth = 1.5 + rb() * 2.5; ctx.lineCap = 'round';
          ctx.shadowColor = '#ff9a2a'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        }
        case 'sparkle': { // twinkling 4-point stars around an area (wonder / excitement)
          const u = ps.area[0] + r[0] * (ps.area[2] - ps.area[0]), v = ps.area[1] + r[1] * (ps.area[3] - ps.area[1]);
          const [sx, sy] = w2s(pd.x + u * pd.w, pd.y + v * pd.h);
          const ph = (lt * (ps.rate ?? 1.2) + r[2]) % 1, a = Math.sin(ph * Math.PI) ** 3;
          const s = (ps.size ?? 14) * (0.5 + r[3]) * a;
          ctx.globalAlpha = a * fadeIO(lt, ps); ctx.fillStyle = ps.color || '#fffbe8';
          star4(sx, sy, s);
          break;
        }
        case 'embers': { // warm motes rising in the hangar (world space, slow)
          const u = ps.area[0] + r[0] * (ps.area[2] - ps.area[0]);
          const v = ps.area[3] - ((r[1] + lt * (0.02 + r[2] * 0.03)) % 1) * (ps.area[3] - ps.area[1]);
          const [sx, sy] = w2s(pd.x + (u + Math.sin(lt * (0.6 + r[3]) + r[4] * 6) * 0.006) * pd.w, pd.y + v * pd.h);
          ctx.globalAlpha = (ps.alpha ?? 0.7) * fadeIO(lt, ps) * (0.5 + 0.5 * Math.sin(lt * 3 + r[5] * 9));
          ctx.fillStyle = ps.color || '#ffcf7a'; ctx.shadowColor = ps.color || '#ffb347'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(sx, sy, 1 + r[6] * 2.4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
          break;
        }
      }
    }
    ctx.restore();
  }
  function fadeIO(lt, ps) { const d = ps.t1 - ps.t0, f = ps.fade ?? 0.6; return clamp(Math.min(lt / f, (d - lt) / f), 0, 1); }
  function star4(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); }
  function rock(x, y, s, a, fill, edge, rr) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
    const k = 6; for (let j = 0; j < k; j++) { const an = j / k * Math.PI * 2, rad = s * (0.6 + rr() * 0.5); j ? ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad) : ctx.moveTo(Math.cos(an) * rad, Math.sin(an) * rad); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.12); ctx.strokeStyle = '#0b0a10'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.4); ctx.lineTo(s * 0.3, -s * 0.45); ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * 0.12); ctx.stroke();
    ctx.restore();
  }

  // ---------- boot ----------
  async function boot() {
    const [tl, fx, man, voices] = await Promise.all([json(P.timeline), json(P.effects), json(P.manifest), json(P.voices).catch(() => ({}))]);
    S.man = man; S.fx = fx;
    // absolute times
    let t = 0;
    for (const sc of tl.scenes) { sc.start = sc.start ?? t; t = sc.start + sc.dur; S.scenes.push(sc);
      for (const L of sc.lines) { S.lines[L.id] = { at: sc.start + L.at, dur: voices[L.id]?.duration ?? 1 }; if (voices[L.id]) S.env[L.id] = voices[L.id].envelope; } }
    S.total = t;
    buildDom(man); buildPanelOverlays(); buildNoise();
    S.tl = gsap.timeline({ paused: true });
    addEffects();
    S.tl.to({}, { duration: 0 }, S.total);
    window.__dur = S.total;
    window.__seek = (sec) => { sec = clamp(sec, 0, S.total); S.tl.seek(sec, false); apply(sec); };
    // wait for every image to decode before declaring ready
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    window.__seek(0);
    window.__ready = true;
    const mode = qs.has('render') ? 'render' : qs.has('t') ? 'still' : 'live';
    if (mode === 'still') window.__seek(parseFloat(qs.get('t')));
    if (mode === 'live') { const from = parseFloat(qs.get('from') || '0'); let t0 = null; const loop = (n) => { if (t0 === null) t0 = n; window.__seek(from + ((n - t0) / 1000) % (S.total - from)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  boot().catch(e => { document.body.textContent = 'ENGINE ERROR: ' + e.message; console.error(e); window.__error = String(e); });
})();
