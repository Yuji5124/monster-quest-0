// Phase 1の仮キー配列。action名はUI_INPUT_SPECに合わせる。
export const INPUT_BINDINGS = {
  moveUp: ["ArrowUp"],
  moveDown: ["ArrowDown"],
  moveLeft: ["ArrowLeft"],
  moveRight: ["ArrowRight"],
  confirm: ["KeyZ", "Enter"],
  cancel: ["KeyX", "Escape"],
  menu: ["KeyC"],
} as const;

export type InputAction = keyof typeof INPUT_BINDINGS;
export const INPUT_ACTIONS = Object.keys(INPUT_BINDINGS) as InputAction[];
