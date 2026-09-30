// タイトルメニューの正式6項目。docs/UI_INPUT_SPEC.md §3 / docs/PHASER_ARCHITECTURE.md TitleSceneと一致させる。
export interface TitleMenuItem {
  readonly id: string;
  readonly label: string;
  readonly action: string;
  readonly enabled: boolean;
}

// 「つづきから」は、カードやフラグだけではなく手動の「ぼうけんのきろく」がある場合だけ有効にする。
export const TITLE_MENU_ITEMS: readonly TitleMenuItem[] = [
  { id: "newGame", label: "はじめから", action: "START_GAME", enabled: true },
  { id: "continueGame", label: "つづきから", action: "CONTINUE", enabled: false },
  { id: "jancardGacha", label: "ジャンカードガチャ", action: "JANCARD_GACHA", enabled: true },
  { id: "jancardBook", label: "ジャンカード図鑑", action: "JANCARD_BOOK", enabled: true },
  { id: "travelPassword", label: "たびのあいことば", action: "TRAVEL_PASSWORD", enabled: true },
  { id: "settings", label: "設定", action: "SETTINGS", enabled: true },
] as const;

/** Returns a fresh menu so TitleScene can reflect the current manual-save availability. */
export function getTitleMenuItems(canContinue: boolean): readonly TitleMenuItem[] {
  return TITLE_MENU_ITEMS.map((item) => item.id === "continueGame" ? { ...item, enabled: canContinue } : item);
}
