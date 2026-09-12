// タイトルメニューの正式6項目。docs/UI_INPUT_SPEC.md §3 / docs/PHASER_ARCHITECTURE.md TitleSceneと一致させる。
export interface TitleMenuItem {
  readonly id: string;
  readonly label: string;
  readonly action: string;
  readonly enabled: boolean;
}

// SaveSystem未実装のため「つづきから」は常時disabled。実装後にenabledをセーブ有無で切り替える。
export const TITLE_MENU_ITEMS: readonly TitleMenuItem[] = [
  { id: "newGame", label: "はじめから", action: "START_GAME", enabled: true },
  { id: "continueGame", label: "つづきから", action: "CONTINUE", enabled: false },
  { id: "jancardGacha", label: "ジャンカードガチャ", action: "JANCARD_GACHA", enabled: true },
  { id: "jancardBook", label: "ジャンカード図鑑", action: "JANCARD_BOOK", enabled: true },
  { id: "travelPassword", label: "たびのあいことば", action: "TRAVEL_PASSWORD", enabled: true },
  { id: "settings", label: "設定", action: "SETTINGS", enabled: true },
] as const;
