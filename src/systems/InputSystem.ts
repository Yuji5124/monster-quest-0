import { INPUT_ACTIONS, INPUT_BINDINGS } from "../config/input.ts";
import type { InputAction } from "../config/input.ts";

/** キー入力を共通actionへ変換する。Sceneのshutdown時にdestroyする。 */
export class InputSystem {
  private readonly target: Window;
  private readonly document: Document;
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<InputAction>();
  private readonly actionByCode = new Map<string, InputAction>();
  private locked = false;

  constructor(target: Window, document: Document) {
    this.target = target;
    this.document = document;
    for (const action of INPUT_ACTIONS) {
      for (const code of INPUT_BINDINGS[action]) {
        this.actionByCode.set(code, action);
      }
    }
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.reset);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  isDown(action: InputAction): boolean {
    return INPUT_BINDINGS[action].some((code) => this.keys.has(code));
  }

  // 長押しの自動リピートや、同じactionの別キーで二重発火させない。
  consumePressed(action: InputAction): boolean {
    return this.pressed.delete(action);
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    this.reset();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = this.actionByCode.get(event.code);
    const element = event.target as HTMLElement | null;
    if (
      !action || event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
      element?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName ?? "")
    ) {
      return;
    }
    event.preventDefault();
    if (this.locked || event.repeat || this.keys.has(event.code)) return;
    if (!this.isDown(action)) this.pressed.add(action);
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onVisibilityChange = (): void => {
    if (this.document.hidden) this.reset();
  };

  private readonly reset = (): void => {
    this.keys.clear();
    this.pressed.clear();
  };

  destroy(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.reset);
    this.document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.reset();
  }
}
