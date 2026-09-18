import assert from "node:assert/strict";
import test from "node:test";
import { InputSystem } from "../src/systems/InputSystem.ts";

function setup(t) {
  const target = new EventTarget();
  const document = new EventTarget();
  document.hidden = false;
  const input = new InputSystem(target, document);
  t.after(() => input.destroy());
  const key = (type, code, properties = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, ...properties });
    target.dispatchEvent(event);
    return event;
  };
  return { input, target, document, key };
}

test("a quick press/release is retained once; a held key does not repeat", (t) => {
  const { input, key } = setup(t);
  assert.equal(key("keydown", "KeyZ").defaultPrevented, true);
  key("keyup", "KeyZ");
  assert.equal(input.isDown("confirm"), false);
  assert.equal(input.consumePressed("confirm"), true);
  assert.equal(input.consumePressed("confirm"), false);
  key("keydown", "KeyZ");
  assert.equal(input.consumePressed("confirm"), true);
  key("keydown", "KeyZ", { repeat: true });
  assert.equal(input.consumePressed("confirm"), false);
});

test("aliases share one action and releasing one does not release the other", (t) => {
  const { input, key } = setup(t);
  key("keydown", "KeyZ");
  assert.equal(input.consumePressed("confirm"), true);
  key("keydown", "Enter");
  assert.equal(input.consumePressed("confirm"), false);
  key("keyup", "KeyZ");
  assert.equal(input.isDown("confirm"), true);
  key("keyup", "Enter");
  assert.equal(input.isDown("confirm"), false);
});

test("blur and backgrounding clear held and queued input", (t) => {
  const { input, key, target, document } = setup(t);
  for (const loseFocus of [
    () => target.dispatchEvent(new Event("blur")),
    () => { document.hidden = true; document.dispatchEvent(new Event("visibilitychange")); },
  ]) {
    key("keydown", "ArrowUp");
    loseFocus();
    assert.equal(input.isDown("moveUp"), false);
    assert.equal(input.consumePressed("moveUp"), false);
  }
});

test("locking drops input and requires a fresh press after unlocking", (t) => {
  const { input, key } = setup(t);
  key("keydown", "KeyC");
  input.setLocked(true);
  assert.equal(input.consumePressed("menu"), false);
  key("keydown", "KeyZ");
  input.setLocked(false);
  key("keydown", "KeyZ", { repeat: true });
  assert.equal(input.isDown("confirm"), false);
  key("keyup", "KeyZ");
  key("keydown", "KeyZ");
  assert.equal(input.consumePressed("confirm"), true);
});

test("browser shortcuts pass through and destroy detaches listeners", (t) => {
  const { input, key } = setup(t);
  for (const modifier of ["ctrlKey", "metaKey", "altKey", "isComposing"]) {
    assert.equal(key("keydown", "KeyZ", { [modifier]: true }).defaultPrevented, false);
    assert.equal(input.consumePressed("confirm"), false);
  }
  input.destroy();
  assert.equal(key("keydown", "ArrowLeft").defaultPrevented, false);
  assert.equal(input.isDown("moveLeft"), false);
});

test("pointer and keyboard actions share deduplication and transition locking", (t) => {
  const { input, key } = setup(t);
  input.queuePressed("confirm");
  key("keydown", "KeyZ");
  assert.equal(input.consumePressed("confirm"), true);
  assert.equal(input.consumePressed("confirm"), false);
  input.setLocked(true);
  input.queuePressed("confirm");
  assert.equal(input.consumePressed("confirm"), false);
  input.setLocked(false);
  input.queuePressed("cancel");
  assert.equal(input.consumePressed("cancel"), true);
});
