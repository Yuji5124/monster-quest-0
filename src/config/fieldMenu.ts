export type FieldMenuItemId = "status" | "items" | "record" | "return-title";

export interface FieldMenuItem {
  readonly id: FieldMenuItemId;
  readonly label: string;
}

/**
 * UI_INPUT_SPEC.md §6の最低6項目(ステータス/どうぐ/まほう/そうび/ジャンカード閲覧/設定)のうち、
 * 今回はステータス・どうぐ・ぼうけんのきろくを実装する。残りは追加実装まで意図的に含めない。
 */
export const FIELD_MENU_ITEMS: readonly FieldMenuItem[] = [
  { id: "status", label: "ステータス" },
  { id: "items", label: "どうぐ" },
  { id: "record", label: "ぼうけんのきろく" },
  { id: "return-title", label: "タイトル画面へ" },
] as const;
