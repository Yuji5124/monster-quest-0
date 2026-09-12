import assert from "node:assert/strict";
import test from "node:test";
import { getMovementDirection } from "../src/systems/PlayerMovement.ts";
import { InputSystem } from "../src/systems/InputSystem.ts";

const keys = ["moveUp", "moveDown", "moveLeft", "moveRight"];
const input = (...held) => ({ isDown: (action) => held.includes(action) });

test("movement supports four directions and stops without held input", () => {
  assert.equal(getMovementDirection(input()), null);
  for (const [index, direction] of ["up", "down", "left", "right"].entries()) {
    assert.equal(getMovementDirection(input(keys[index])), direction);
  }
});

test("simultaneous directions select one axis; opposite keys cancel", () => {
  for (const vertical of ["moveUp", "moveDown"]) {
    for (const horizontal of ["moveLeft", "moveRight"]) {
      assert.equal(getMovementDirection(input(vertical, horizontal)), vertical === "moveUp" ? "up" : "down");
    }
  }
  assert.equal(getMovementDirection(input("moveUp", "moveDown")), null);
  assert.equal(getMovementDirection(input("moveLeft", "moveRight")), null);
  assert.equal(getMovementDirection(input(...keys)), null);
  assert.equal(getMovementDirection(input("moveUp", "moveDown", "moveRight")), "right");
});

test("held movement stops on lock and blur, and requires fresh input after unlocking", (t) => {
  const target = new EventTarget();
  const document = new EventTarget();
  const actions = new InputSystem(target, document);
  t.after(() => actions.destroy());
  const press = () => {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { code: "ArrowRight" });
    target.dispatchEvent(event);
  };
  press();
  assert.equal(getMovementDirection(actions), "right");
  actions.setLocked(true);
  press();
  assert.equal(getMovementDirection(actions), null);
  actions.setLocked(false);
  assert.equal(getMovementDirection(actions), null);
  press();
  assert.equal(getMovementDirection(actions), "right");
  target.dispatchEvent(new Event("blur"));
  assert.equal(getMovementDirection(actions), null);
});
