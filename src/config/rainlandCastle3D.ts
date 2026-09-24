/**
 * No.06レインランドじょう(内部map_05_rainland_castle)と王の間(map_rainland_throne_room)の3D表示(ブロック城)。
 * 2Dと同じcollision.png・NPC・Eventを使い、見た目だけをブロックで組み立てる。座標はすべて各2Dのbackground.png(1448×1086)の
 * ネイティブ背景ピクセル。見た目の参照: assets/maps/reference/reference/レインランドじょう_マイクラ風.png。
 * 数値はすべてTEMP_TEST_VALUE(見た目・操作感の調整は人間側)。
 * 共通の見た目・操作(CASTLE_3D_COMMON)と、マップごとの配置(絨毯・壁飾り・置物・ランタン・人物)に分けている。
 */
import type { CharacterGear } from "../systems/Castle3DCharacterModel.ts";
import type { CharacterLook } from "../systems/Castle3DCharacterSkins.ts";

export type WallFace = "north" | "south" | "east" | "west";

export interface Castle3DRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** 壁の面に貼るもの。(x, y)は面の上の中心点(2Dの床と壁の境目)、faceはその面が向いている方角。 */
export interface Castle3DWallDecor {
  readonly kind: "banner" | "sconce" | "door" | "painting" | "window" | "tapestry";
  readonly x: number;
  readonly y: number;
  readonly face: WallFace;
}

/** 床に置くもの。rectは2Dの障害物(各collision生成ツールのOBSTACLES)と同じ範囲。elevationは置く床の高さ(ブロック、王の間の壇上など)。 */
export interface Castle3DProp {
  readonly kind: "pedestal" | "topiary" | "lamp_post" | "bench" | "console_table" | "throne" | "candelabra" | "candle_pedestal" | "balustrade";
  readonly rect: Castle3DRect;
  readonly elevation?: number;
}

/** 人物の見た目。elevationは立つ床の高さ(ブロック)、offsetは2Dの位置からの見た目上のずれ(背景px。玉座に座る王など)。 */
export interface Castle3DNpcModel {
  readonly look: CharacterLook;
  readonly gear: CharacterGear;
  readonly elevation?: number;
  readonly offset?: { readonly x: number; readonly y: number };
}

/**
 * 描画の品質(2026-09-24「3Dデータを崩さずにクオリティを上げる」)。配置・当たり判定・人物には一切関わらず、
 * 光と影の描き方だけを変える。端末に合わせて`desktop`/`mobile`を選び、`basic`は従来と同じ描き方(比較・非常用)。
 */
export interface Castle3DQuality {
  /** 頂点AO: 接しているブロックの数(0〜3)ごとの明るさ。[1,1,1,1]でAOなし。 */
  readonly ambientOcclusion: readonly [number, number, number, number];
  /** 日差しの影(読み込み時に一度だけ計算する静的な影)。nullで影なし。 */
  readonly shadows: { readonly mapSize: number; readonly radius: number; readonly bias: number; readonly normalBias: number } | null;
  /** 画面の四隅をわずかに暗くする強さ(0でなし)。 */
  readonly vignette: number;
  /** ランタン・ろうそくの明るさのゆらぎ(0でなし)。 */
  readonly flicker: number;
  /** 石の凹凸(テクスチャの明暗から作るバンプ、0でなし)。 */
  readonly bumpScale: number;
  /** 品質を上げた分の明るさの補正(トーンマッピングの露出に掛ける)。 */
  readonly exposureBoost: number;
}

export type Castle3DQualityProfile = "desktop" | "mobile" | "basic";

export interface Castle3DConfig {
  readonly blockSize: number;
  readonly wallHeight: number;
  readonly eyeHeight: number;
  readonly moveSpeed: number;
  readonly turnSpeed: number;
  readonly fov: number;
  readonly renderScale: number;
  readonly exposure: number;
  readonly glow: { readonly sconce: number; readonly lantern: number; readonly candle: number };
  readonly fogColor: number;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly light: { readonly skyColor: number; readonly groundColor: number; readonly hemisphere: number; readonly sunColor: number; readonly sun: number };
  readonly lanterns: {
    readonly points: readonly { readonly x: number; readonly y: number }[];
    readonly lightCount: number;
    readonly color: number;
    readonly intensity: number;
    readonly distance: number;
    readonly hangHeight: number;
  };
  readonly talkReach: number;
  readonly talkAngleDeg: number;
  readonly toggleFadeMs: number;
  /** 画面左上の地名。 */
  readonly title: string;
  readonly carpets: readonly Castle3DRect[];
  readonly carpetEmblems: readonly { readonly x: number; readonly y: number }[];
  /** 階段(南端が低く、北へ上がって北端でrise)。見た目と目の高さだけで、歩ける範囲は2Dと同じ。 */
  readonly stairs?: { readonly rect: Castle3DRect; readonly rise: number };
  /** 一段高い床(王の間の壇など)。 */
  readonly platforms?: readonly { readonly rect: Castle3DRect; readonly height: number }[];
  /** 天井まで届かない低い壁(壇の前面など)。 */
  readonly lowWalls?: readonly { readonly rect: Castle3DRect; readonly height: number }[];
  readonly wallDecor: readonly Castle3DWallDecor[];
  readonly props: readonly Castle3DProp[];
  readonly npcModels: Readonly<Record<string, Castle3DNpcModel>>;
  readonly npcScale: number;
  readonly architecture: {
    readonly pilasterSpacing: number;
    readonly pilasterAvoidRadius: number;
    readonly vineRate: number;
    readonly vineMaxLength: number;
    readonly lightShaftOpacity: number;
    readonly dustCount: number;
  };
  readonly quality: Readonly<Record<Castle3DQualityProfile, Castle3DQuality>>;
}

const SOLDIER: Castle3DNpcModel = {
  look: { outfit: "soldier", skin: 0xf0c8a0, hair: 0x4a3222, hairStyle: "short", eyes: 0x3a4a7a, primary: 0x2f4f9e, secondary: 0xb8c0cc, trim: 0xe2b84a },
  gear: { weapon: "spear" },
};
const ROYAL_GUARD: Castle3DNpcModel = {
  look: { outfit: "royal_guard", skin: 0xe8bc92, hair: 0x2a2018, hairStyle: "short", eyes: 0x2a3a6a, primary: 0x2f4f9e, secondary: 0xe8e6e0, trim: 0xe2b84a },
  gear: { weapon: "halberd", cape: 0x2f4f9e, plume: 0xc0342a },
};

/** 描画品質の3段階(desktop / mobile / basic)。 */
const CASTLE_3D_QUALITY: Castle3DConfig["quality"] = {
  desktop: {
    ambientOcclusion: [1, 0.8, 0.64, 0.5],
    shadows: { mapSize: 2048, radius: 3, bias: -0.0006, normalBias: 0.02 },
    vignette: 0.32,
    flicker: 0.14,
    bumpScale: 1.4,
    exposureBoost: 1.08,
  },
  // iPhone等: 影の解像度を下げ、ぼかしを軽くする(描画負荷対策)。
  mobile: {
    ambientOcclusion: [1, 0.8, 0.64, 0.5],
    shadows: { mapSize: 1024, radius: 2, bias: -0.0008, normalBias: 0.03 },
    vignette: 0.28,
    flicker: 0.12,
    bumpScale: 1.2,
    exposureBoost: 1.08,
  },
  // 従来どおりの描き方(AO・影・凹凸・ゆらぎ・周辺減光なし)。
  basic: {
    ambientOcclusion: [1, 1, 1, 1],
    shadows: null,
    vignette: 0,
    flicker: 0,
    bumpScale: 0,
    exposureBoost: 1,
  },
};

/** 共通の見た目・操作。 */
const CASTLE_3D_COMMON = {
  /** 1ブロック = 背景16px(2DのCollisionセル8pxの2×2)。 */
  blockSize: 16,
  /** 壁の高さ = 天井の高さ(ブロック)。天井は床の上すべてに張る(2026-09-23ユーザー指示「天井も作る」)。 */
  wallHeight: 6,
  eyeHeight: 1.7,
  /** 前後移動の速さ[背景px/秒]。2D(120背景px/秒)より少し遅くして一人称で酔いにくくする。 */
  moveSpeed: 84,
  turnSpeed: 2.3,
  fov: 70,
  /** 3Dを描く解像度(ゲーム画面960×720に対する比率)。 */
  renderScale: 1,
  /** 映画調のトーンマッピングの露出。 */
  exposure: 0.82,
  /** 燭台・ランタン・ろうそくの光の輪(加算合成の板)の大きさ(ブロック)。 */
  glow: { sconce: 1.3, lantern: 2.4, candle: 1 },
  fogColor: 0xefe2c6,
  fogNear: 18,
  fogFar: 64,
  light: { skyColor: 0xfff3dc, groundColor: 0xc4b08c, hemisphere: 1.5, sunColor: 0xffe6b8, sun: 1.7 },
  talkReach: 22,
  talkAngleDeg: 55,
  toggleFadeMs: 180,
  npcScale: 0.95,
  architecture: { pilasterSpacing: 4, pilasterAvoidRadius: 1.4, vineRate: 0.07, vineMaxLength: 3, lightShaftOpacity: 0.22, dustCount: 260 },
  quality: CASTLE_3D_QUALITY,
};
/** 天井から鎖で下がるランタン。points(背景px)のうち先頭lightCount個だけ実際の光源にする(iPhoneの描画負荷対策)。 */
const LANTERN_LIGHT = { color: 0xffc878, intensity: 5, distance: 11, hangHeight: 3.7 };

/** 城内(入口ホール・中央ホール・西翼・東翼)。 */
export const RAINLAND_CASTLE_3D: Castle3DConfig = {
  ...CASTLE_3D_COMMON,
  title: "レインランドじょう",
  lanterns: {
    ...LANTERN_LIGHT,
    points: [
      { x: 724, y: 240 }, { x: 724, y: 440 }, { x: 724, y: 660 }, { x: 724, y: 900 },
      { x: 450, y: 700 }, { x: 1000, y: 700 }, { x: 172, y: 470 }, { x: 1284, y: 470 },
    ],
    lightCount: 8,
  },
  carpets: [
    { x: 656, y: 128, width: 136, height: 880 },
    { x: 128, y: 320, width: 88, height: 336 },
    { x: 1232, y: 344, width: 96, height: 312 },
    { x: 1160, y: 584, width: 168, height: 72 },
  ],
  carpetEmblems: [{ x: 724, y: 208 }, { x: 724, y: 976 }],
  /** 西翼の上階への階段。 */
  stairs: { rect: { x: 112, y: 192, width: 128, height: 112 }, rise: 2.5 },
  wallDecor: [
    { kind: "door", x: 724, y: 128, face: "south" },
    { kind: "sconce", x: 664, y: 128, face: "south" },
    { kind: "sconce", x: 784, y: 128, face: "south" },
    { kind: "banner", x: 616, y: 296, face: "south" },
    { kind: "banner", x: 832, y: 296, face: "south" },
    { kind: "banner", x: 464, y: 520, face: "south" },
    { kind: "sconce", x: 416, y: 520, face: "south" },
    { kind: "sconce", x: 512, y: 520, face: "south" },
    { kind: "banner", x: 980, y: 520, face: "south" },
    { kind: "sconce", x: 936, y: 520, face: "south" },
    { kind: "painting", x: 1056, y: 520, face: "south" },
    { kind: "banner", x: 1280, y: 344, face: "south" },
    { kind: "sconce", x: 1240, y: 344, face: "south" },
    { kind: "sconce", x: 1320, y: 344, face: "south" },
    { kind: "sconce", x: 104, y: 392, face: "east" },
    { kind: "sconce", x: 248, y: 392, face: "west" },
    // 外の景色が見えるアーチ窓(2Dの絵には無い、3Dだけの飾り)。
    { kind: "window", x: 320, y: 720, face: "east" },
    { kind: "window", x: 320, y: 800, face: "east" },
    { kind: "window", x: 1128, y: 720, face: "west" },
    { kind: "window", x: 1128, y: 800, face: "west" },
    { kind: "window", x: 400, y: 840, face: "north" },
    { kind: "window", x: 1048, y: 840, face: "north" },
    { kind: "window", x: 512, y: 900, face: "east" },
    { kind: "window", x: 936, y: 900, face: "west" },
  ],
  props: [
    ...[568, 840].flatMap((x) => [520, 616, 728].map((y) => ({ kind: "pedestal" as const, rect: { x, y, width: 40, height: y === 616 ? 96 : 88 } }))),
    { kind: "topiary", rect: { x: 344, y: 480, width: 48, height: 80 } },
    { kind: "topiary", rect: { x: 344, y: 752, width: 48, height: 72 } },
    { kind: "topiary", rect: { x: 1056, y: 480, width: 48, height: 80 } },
    { kind: "topiary", rect: { x: 1056, y: 752, width: 48, height: 72 } },
    { kind: "topiary", rect: { x: 592, y: 952, width: 32, height: 48 } },
    { kind: "topiary", rect: { x: 824, y: 952, width: 32, height: 48 } },
    { kind: "lamp_post", rect: { x: 616, y: 912, width: 40, height: 88 } },
    { kind: "lamp_post", rect: { x: 792, y: 912, width: 40, height: 88 } },
    { kind: "bench", rect: { x: 424, y: 752, width: 80, height: 88 } },
    { kind: "console_table", rect: { x: 1240, y: 296, width: 80, height: 24 } },
  ],
  /** 役割に合わせた仮の見た目(docs/NPC/04_rainland_castle.md がNEXT_TO_DESIGN)。正式な人物設定ではない。 */
  npcModels: {
    default: {
      look: { outfit: "villager", skin: 0xf0c8a0, hair: 0x6a4a2a, hairStyle: "short", eyes: 0x3a6a3a, primary: 0x6b8f4e, secondary: 0xe8dcc8, trim: 0xf2ead8 },
      gear: {},
    },
    rainland_castle_gate_soldier: SOLDIER,
    rainland_castle_hall_soldier: { ...SOLDIER, look: { ...SOLDIER.look, skin: 0xe8bc92, hair: 0x2a2018, eyes: 0x4a3222 } },
    rainland_castle_throne_guard: ROYAL_GUARD,
    rainland_castle_servant: {
      look: { outfit: "maid", skin: 0xf3d0aa, hair: 0x7a4a26, hairStyle: "bun", eyes: 0x5a3a22, primary: 0x2a2a36, secondary: 0xf6f3ea, trim: 0xf6f3ea },
      gear: {},
    },
    rainland_castle_resident: {
      look: { outfit: "villager", skin: 0xf0c8a0, hair: 0xa8562e, hairStyle: "long", eyes: 0x3a6a4a, primary: 0x8a4a6a, secondary: 0xf2ead8, trim: 0xf2ead8 },
      gear: {},
    },
  },
};

/**
 * 王の間(2026-09-23、ユーザー提供の`レインランドじょう_城内2.png`)。南の入口 → 燭台の台座が並ぶ広間 → 左右の翼 →
 * 中央の階段を上がった一段高い壇(手すり・燭台・植木)と玉座、その後ろの大きな紋章の垂れ幕。
 */
export const RAINLAND_THRONE_ROOM_3D: Castle3DConfig = {
  ...CASTLE_3D_COMMON,
  title: "レインランドじょう  おうのま",
  lanterns: {
    ...LANTERN_LIGHT,
    points: [
      { x: 724, y: 250 }, { x: 724, y: 470 }, { x: 724, y: 650 }, { x: 724, y: 860 },
      { x: 384, y: 520 }, { x: 1064, y: 520 },
    ],
    lightCount: 6,
  },
  carpets: [
    { x: 648, y: 176, width: 144, height: 784 },
    { x: 312, y: 448, width: 144, height: 152 },
    { x: 992, y: 448, width: 144, height: 152 },
  ],
  carpetEmblems: [{ x: 724, y: 456 }, { x: 724, y: 872 }],
  stairs: { rect: { x: 640, y: 288, width: 152, height: 80 }, rise: 1 },
  platforms: [{ rect: { x: 528, y: 176, width: 392, height: 112 }, height: 1 }],
  lowWalls: [{ rect: { x: 512, y: 280, width: 424, height: 88 }, height: 1 }],
  wallDecor: [
    { kind: "tapestry", x: 724, y: 144, face: "south" },
    { kind: "banner", x: 578, y: 176, face: "south" },
    { kind: "banner", x: 868, y: 176, face: "south" },
    { kind: "banner", x: 362, y: 448, face: "south" },
    { kind: "banner", x: 1072, y: 448, face: "south" },
    { kind: "sconce", x: 320, y: 448, face: "south" },
    { kind: "sconce", x: 1128, y: 448, face: "south" },
    { kind: "sconce", x: 648, y: 912, face: "east" },
    { kind: "sconce", x: 800, y: 912, face: "west" },
    { kind: "window", x: 488, y: 700, face: "east" },
    { kind: "window", x: 960, y: 700, face: "west" },
  ],
  props: [
    { kind: "throne", rect: { x: 680, y: 144, width: 96, height: 104 }, elevation: 1 },
    { kind: "candelabra", rect: { x: 608, y: 176, width: 40, height: 32 }, elevation: 1 },
    { kind: "candelabra", rect: { x: 800, y: 176, width: 40, height: 32 }, elevation: 1 },
    { kind: "topiary", rect: { x: 552, y: 192, width: 48, height: 48 }, elevation: 1 },
    { kind: "topiary", rect: { x: 848, y: 192, width: 48, height: 48 }, elevation: 1 },
    { kind: "balustrade", rect: { x: 528, y: 288, width: 112, height: 56 }, elevation: 1 },
    { kind: "balustrade", rect: { x: 800, y: 288, width: 120, height: 56 }, elevation: 1 },
    ...[544, 856].flatMap((x) => [{ y: 400, h: 136 }, { y: 584, h: 144 }].map(({ y, h }) => ({ kind: "candle_pedestal" as const, rect: { x, y, width: 48, height: h } }))),
    { kind: "topiary", rect: { x: 400, y: 448, width: 48, height: 56 } },
    { kind: "topiary", rect: { x: 1000, y: 448, width: 48, height: 56 } },
  ],
  /** 王・近衛兵の見た目。台詞・人数は仮(DEV_PLACEHOLDER)。ミレイ・王家の事情に関わる人物は置かない。 */
  npcModels: {
    default: ROYAL_GUARD,
    rainland_throne_king: {
      look: { outfit: "king", skin: 0xf0c8a0, hair: 0xe8e4dc, hairStyle: "short", eyes: 0x3a4a6a, primary: 0xa8242a, secondary: 0xf6f3ea, trim: 0xe2b84a },
      gear: { cape: 0xa8242a, crown: true, pose: "seated", scepter: true },
      elevation: 1,
      offset: { x: 0, y: -26 },
    },
    rainland_throne_guard_west: ROYAL_GUARD,
    rainland_throne_guard_east: ROYAL_GUARD,
  },
};

/**
 * 端末に合わせた品質。タッチ端末(iPhone等)はmobile、それ以外はdesktop。
 * DEV確認用に`?castle3dQuality=desktop|mobile|basic`で上書きできる(basic = 従来の描き方)。
 */
export function chooseCastle3DQualityProfile(search: string, touchDevice: boolean, allowOverride: boolean): Castle3DQualityProfile {
  const requested = allowOverride ? new URLSearchParams(search).get("castle3dQuality") : null;
  if (requested === "desktop" || requested === "mobile" || requested === "basic") return requested;
  return touchDevice ? "mobile" : "desktop";
}
