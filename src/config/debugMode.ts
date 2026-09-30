import type { PartyMemberId } from "../systems/PartySystem.ts";

/**
 * DEBUG_MODE: 開発中の動作確認用の運用モード。DEBUG_ONLY値であり、正式仕様・セーブへ書き戻さない。
 *
 * - DEVビルド(`npm run dev`)では既定でON。`?debug=0`(`off`/`false`も可)でOFFにでき、通常の
 *   成長・加入・セーブ進行のまま確認したいときに使う。本番ビルドは`import.meta.env.DEV`が偽のため常にOFF。
 * - 現在の効果は戦闘だけ: 加入状況・セーブに関係なく、主人公一人がLv30・全快・最強の自動装備で始まる。
 * - 2026-09-29: 3人編成(主人公・タロサ・ミレイ)は戦闘がバグるとのユーザー指示で主人公一人へ戻した。
 * - デバッグ戦闘はEXP・現在HP/MPなどのキャラクター進捗をセーブへ書き込まない(G・道具の報酬は通常どおり)。
 */
export const DEBUG_QUERY_PARAM = "debug";

/** DEBUG_ONLY: 正式な成長上限(Lv25、`expTable.ts`)の外側にある確認用レベル。 */
export const DEBUG_PARTY_LEVEL = 30;

/** デバッグ戦闘は主人公一人。仲間は加入状況に関係なく参加させない。 */
export const DEBUG_PARTY_MEMBER_IDS: readonly PartyMemberId[] = ["hero"];

const DISABLED_VALUES: readonly string[] = ["0", "off", "false"];

/** 純関数。DEVビルドかつ`?debug=`が無効値でないときだけONにする。 */
export function resolveDebugMode(isDevBuild: boolean, search: string): boolean {
  if (!isDevBuild) return false;
  const requested = new URLSearchParams(search).get(DEBUG_QUERY_PARAM);
  return requested === null || !DISABLED_VALUES.includes(requested.toLowerCase());
}

export function isDebugMode(): boolean {
  const isDevBuild = typeof import.meta.env !== "undefined" && import.meta.env.DEV === true;
  return resolveDebugMode(isDevBuild, typeof window === "undefined" ? "" : window.location.search);
}
