/**
 * 「正面/うしろ/右/左 × 3フレーム」の参考画像から生成した歩行スプライトシート
 * (3列×4行: 下/左/右/上)に共通するグリッド計算。主人公・パーティメンバーで共有する。
 */
export type WalkDirection = "down" | "left" | "right" | "up";

export interface WalkSpriteGeometry {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /**
   * 歩行中に1秒間で進めるアニメーションフレーム数。
   * キャラクターごとに、移動速度と足運びの大きさに合わせて明示する。
   */
  readonly walkFrameRate: number;
  /** 各セル内で足元(接地ライン)が揃う共通の基準線。Arcade Bodyのoffset計算に使う。 */
  readonly baselineY: number;
}

// スプライトシートの行順(3フレームずつ)。Phaserのspritesheet読み込みは
// 左→右、上→下の順で自動的にフレーム番号を振るため、この並びと一致させる。
const ROW_ORDER: readonly WalkDirection[] = ["down", "left", "right", "up"];

function rowStart(direction: WalkDirection): number {
  return ROW_ORDER.indexOf(direction) * 3;
}

/** 歩行アニメーションで使う3フレーム(1→2→3、yoyoで2に戻る)のグローバルフレーム番号。 */
export function walkFrames(direction: WalkDirection): number[] {
  const start = rowStart(direction);
  return [start, start + 1, start + 2];
}

/** 停止中に表示する、その方向の基準フレーム(1枚目=直立に近いポーズ)。 */
export function idleFrame(direction: WalkDirection): number {
  return rowStart(direction);
}

/**
 * Arcade Bodyをスプライトの足元(接地ライン)・水平中央に揃えるoffset。
 * setSize(bodyWidth, bodyHeight, false) と組み合わせて使う。
 * Arcade Bodyを持たない表示専用キャラ(パーティfollower等)には不要。
 */
export function bodyOffset(geometry: WalkSpriteGeometry, bodyWidth: number, bodyHeight: number): { x: number; y: number } {
  return {
    x: (geometry.frameWidth - bodyWidth) / 2,
    y: geometry.baselineY - bodyHeight,
  };
}

/**
 * スプライト原点(Phaserのデフォルト0.5,0.5 = フレーム中心)から「体の中心」までのズレ。
 * Arcade Bodyを持たないキャラ(パーティfollower)を、Bodyを持つ主人公と同じ基準点
 * (PartyTrailが記録する`leader.body.center`)に揃えて配置するために使う。
 * setPosition(trailPoint.x - offset.x, trailPoint.y - offset.y) の形で使う。
 * frameWidthに対してbodyWidthは常に中央揃え(bodyOffset.x参照)のため、xは常に0。
 */
export function bodyCenterOffset(geometry: WalkSpriteGeometry, bodyWidth: number, bodyHeight: number): { x: number; y: number } {
  const topLeft = bodyOffset(geometry, bodyWidth, bodyHeight);
  return {
    x: topLeft.x + bodyWidth / 2 - geometry.frameWidth / 2,
    y: topLeft.y + bodyHeight / 2 - geometry.frameHeight / 2,
  };
}
