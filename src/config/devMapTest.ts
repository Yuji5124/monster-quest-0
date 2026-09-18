export type DevMapTestId = "no01" | "no02" | "image-no01";

/** 通常の起動導線を変更せず、特定マップを単体確認するためのDEV URLを解決する。 */
export function readDevMapTest(search: string): DevMapTestId | null {
  const requested = new URLSearchParams(search).get("mapTest");
  return requested === "no01" || requested === "no02" || requested === "image-no01" ? requested : null;
}
