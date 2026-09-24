// Phase 1の仮キー配列。action名はUI_INPUT_SPECに合わせる。
export const INPUT_BINDINGS = {
  moveUp: ["ArrowUp"],
  moveDown: ["ArrowDown"],
  moveLeft: ["ArrowLeft"],
  moveRight: ["ArrowRight"],
  confirm: ["KeyZ", "Enter"],
  cancel: ["KeyX", "Escape"],
  menu: ["KeyC"],
  /** No.08 consumes this as the explored-floor map overlay; other scenes ignore it. */
  map: ["KeyM"],
  /** 2D⇄3Dの表示切替。3D表示を持つマップ(レインランドじょう)だけが使い、他のSceneは無視する。 */
  view: ["KeyV"],
} as const;

export type InputAction = keyof typeof INPUT_BINDINGS;
export const INPUT_ACTIONS = Object.keys(INPUT_BINDINGS) as InputAction[];
