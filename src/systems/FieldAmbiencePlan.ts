import type { GustConfig, MoteConfig, Range } from "../config/fieldAmbience.ts";

/**
 * フィールド環境エフェクトの「どこに・どう動くか」を決める純粋関数。Phaserに依存しないのでテストから乱数を注入できる。
 * 座標はすべて画面ピクセル(960×720)。カメラのスクロールは視差を掛けて差し引き、画面の外へ出た粒は反対側へ回り込ませる。
 */
export type Random = () => number;

export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

export interface MoteState {
  /** 画面外の余白を含む回り込み空間での基準位置(カメラ補正前)。 */
  baseX: number;
  baseY: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly size: number;
  readonly alpha: number;
  readonly color: number;
  readonly swayAmplitude: number;
  readonly swayPeriodMs: number;
  readonly twinklePeriodMs: number;
  /** 揺れ・明滅の位相(0〜1)。粒ごとにずらして揃って動かないようにする。 */
  readonly phase: number;
  readonly spinPerSecond: number;
}

export interface MotePose {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly rotation: number;
  /** 落ち葉の裏返り(-1〜1)。横幅に掛けてひらひらさせる。 */
  readonly flip: number;
}

/** 回り込み空間の余白。粒が画面端でぱっと消えたり出たりしないよう、画面より少し広く取る。 */
export const WRAP_MARGIN = 48;

export function randomIn(random: Random, range: Range): number {
  return range.min + random() * (range.max - range.min);
}

/** valueを[0, span)へ回り込ませる(負の値も正しく扱う)。 */
export function wrap(value: number, span: number): number {
  return ((value % span) + span) % span;
}

export function scaledCount(count: number, scale: number): number {
  return Math.max(0, Math.round(count * scale));
}

export function createMote(random: Random, config: MoteConfig, view: ViewSize): MoteState {
  return {
    baseX: random() * (view.width + WRAP_MARGIN * 2),
    baseY: random() * (view.height + WRAP_MARGIN * 2),
    velocityX: randomIn(random, config.velocityX),
    velocityY: randomIn(random, config.velocityY),
    size: randomIn(random, config.size),
    alpha: randomIn(random, config.alpha),
    color: config.colors[Math.floor(random() * config.colors.length) % config.colors.length],
    swayAmplitude: randomIn(random, config.swayAmplitude),
    swayPeriodMs: randomIn(random, config.swayPeriodMs),
    twinklePeriodMs: randomIn(random, config.twinklePeriodMs),
    phase: random(),
    spinPerSecond: config.kind === "leaf" ? (random() < 0.5 ? -1 : 1) * randomIn(random, { min: 0.6, max: 1.6 }) : 0,
  };
}

/** 粒を経過時間ぶん進める。風(windX)は横速度へ加算し、落ち葉ほど強く流れる。 */
export function advanceMote(mote: MoteState, deltaMs: number, windX: number, windResponse: number): void {
  const seconds = deltaMs / 1000;
  mote.baseX += (mote.velocityX + windX * windResponse) * seconds;
  mote.baseY += mote.velocityY * seconds;
}

/** 現在時刻・カメラ位置から画面上の姿勢を求める。 */
export function poseMote(mote: MoteState, nowMs: number, scrollX: number, scrollY: number, parallax: number, view: ViewSize): MotePose {
  const spanX = view.width + WRAP_MARGIN * 2;
  const spanY = view.height + WRAP_MARGIN * 2;
  const swayAngle = (nowMs / mote.swayPeriodMs + mote.phase) * Math.PI * 2;
  const sway = Math.sin(swayAngle) * mote.swayAmplitude;
  const x = wrap(mote.baseX + sway - scrollX * parallax, spanX) - WRAP_MARGIN;
  const y = wrap(mote.baseY - scrollY * parallax, spanY) - WRAP_MARGIN;
  const twinkle = mote.twinklePeriodMs > 0
    ? 0.55 + 0.45 * Math.sin((nowMs / mote.twinklePeriodMs + mote.phase) * Math.PI * 2)
    : 1;
  return {
    x,
    y,
    alpha: mote.alpha * twinkle,
    rotation: (nowMs / 1000) * mote.spinPerSecond + mote.phase * Math.PI * 2,
    flip: Math.cos(swayAngle),
  };
}

export interface GustPlan {
  readonly startInMs: number;
  readonly durationMs: number;
  readonly strength: number;
  /** 1で右向き、-1で左向き。 */
  readonly direction: 1 | -1;
}

export function planGust(random: Random, config: GustConfig): GustPlan {
  return {
    startInMs: randomIn(random, config.intervalMs),
    durationMs: randomIn(random, config.durationMs),
    strength: randomIn(random, config.strength),
    // 基本は雲と同じ右向き。ときどき逆向きの風で単調さを崩す。
    direction: random() < 0.75 ? 1 : -1,
  };
}

/** 風の強さの時間変化(0→最大→0)。立ち上がり・収まりをなめらかにする。 */
export function gustStrengthAt(elapsedMs: number, plan: GustPlan): number {
  if (elapsedMs <= 0 || elapsedMs >= plan.durationMs) return 0;
  return Math.sin((elapsedMs / plan.durationMs) * Math.PI) * plan.strength * plan.direction;
}
