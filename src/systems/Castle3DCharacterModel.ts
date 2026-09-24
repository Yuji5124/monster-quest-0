import type * as ThreeTypes from "three";
import { paintCharacterPart, wearsSkirt } from "./Castle3DCharacterSkins.ts";
import type { CharacterLook } from "./Castle3DCharacterSkins.ts";

type Three = typeof ThreeTypes;

/** 持ち物・飾り。兵士は槍、近衛兵は斧槍とマントと羽根飾り。 */
export interface CharacterGear {
  readonly weapon?: "spear" | "halberd";
  readonly cape?: number;
  readonly plume?: number;
  /** 金の王冠。 */
  readonly crown?: boolean;
  /** 右手に金の王笏。 */
  readonly scepter?: boolean;
  /** seated: 玉座に座る(脚を前へ、腕をひじ掛けへ)。 */
  readonly pose?: "standing" | "seated";
}

/** 動かすための関節と状態。rootの向きが体全体の向き(前 = +z)。 */
export interface CharacterRig {
  readonly root: ThreeTypes.Group;
  readonly headPivot: ThreeTypes.Group;
  readonly body: ThreeTypes.Mesh;
  readonly armLeft: ThreeTypes.Group;
  readonly armRight: ThreeTypes.Group;
  readonly headMaterials: ThreeTypes.Material[];
  readonly faceOpen: ThreeTypes.Material;
  readonly faceBlink: ThreeTypes.Material;
  readonly holdsWeapon: boolean;
  readonly seated: boolean;
  readonly phase: number;
  /** 体を向けたい向き(ラジアン)。話しかけられたらプレイヤーの方へ。 */
  targetYaw: number;
  talking: boolean;
}

type MakeMaterial = (canvas: HTMLCanvasElement) => ThreeTypes.Material;

/**
 * ブロック人形の人物を組み立てる。高さ約2ブロック(頭0.5・胴0.75・脚0.75)を全体scale倍する。
 * 腕は肩、脚は腰、頭は首を支点にしたGroupなので、回すだけで自然に動く。
 */
export function buildCharacter(
  three: Three,
  look: CharacterLook,
  gear: CharacterGear,
  makeMaterial: MakeMaterial,
  colorMaterial: (color: number, emissive?: number) => ThreeTypes.Material,
  box: ThreeTypes.BoxGeometry,
  scale: number,
  phase: number,
): CharacterRig {
  const root = new three.Group();
  const figure = new three.Group();
  figure.scale.setScalar(scale);
  root.add(figure);

  const partMesh = (part: Parameters<typeof paintCharacterPart>[1], w: number, h: number, d: number): { mesh: ThreeTypes.Mesh; materials: ThreeTypes.Material[]; blink?: ThreeTypes.Material } => {
    const painted = paintCharacterPart(look, part);
    const materials = painted.faces.map((face) => makeMaterial(face));
    const mesh = new three.Mesh(box, materials);
    mesh.scale.set(w, h, d);
    return { mesh, materials, blink: painted.blinkFront ? makeMaterial(painted.blinkFront) : undefined };
  };

  const seated = gear.pose === "seated";
  // 座る人は腰の高さを座面(床から約0.5ブロック)へ下げる。
  if (seated) figure.position.y = -0.24 * scale;
  // 脚(腰が支点)。座るときは脚を前へ90度倒す。
  for (const side of [-1, 1]) {
    const hip = new three.Group();
    hip.position.set(side * 0.125, 0.75, 0);
    if (seated) hip.rotation.x = -Math.PI / 2;
    const leg = partMesh("leg", 0.25, 0.75, 0.25).mesh;
    leg.position.y = -0.375;
    hip.add(leg);
    figure.add(hip);
  }
  // 胴
  const body = partMesh("body", 0.5, 0.75, 0.25).mesh;
  body.position.y = 1.125;
  figure.add(body);
  if (wearsSkirt(look)) {
    const skirt = partMesh("skirt", 0.58, 0.52, 0.36).mesh;
    skirt.position.y = 0.62;
    figure.add(skirt);
  }
  // 腕(肩が支点)。+xが人物の左、-xが右。
  const makeArm = (side: number): ThreeTypes.Group => {
    const shoulder = new three.Group();
    shoulder.position.set(side * 0.375, 1.5, 0);
    const arm = partMesh("arm", 0.25, 0.75, 0.25).mesh;
    arm.position.y = -0.375;
    shoulder.add(arm);
    figure.add(shoulder);
    return shoulder;
  };
  const armLeft = makeArm(1);
  const armRight = makeArm(-1);
  // 頭(首が支点)
  const headPivot = new three.Group();
  headPivot.position.y = 1.5;
  const head = partMesh("head", 0.5, 0.5, 0.5);
  head.mesh.position.y = 0.25;
  headPivot.add(head.mesh);
  figure.add(headPivot);
  const faceOpen = head.materials[4];
  const faceBlink = head.blink ?? faceOpen;

  if (look.hairStyle === "bun" && look.outfit !== "soldier" && look.outfit !== "royal_guard") {
    const bun = new three.Mesh(box, colorMaterial(look.hair));
    bun.scale.set(0.2, 0.2, 0.16);
    bun.position.set(0, 0.36, -0.3);
    headPivot.add(bun);
  }
  if (gear.plume !== undefined) {
    const plume = new three.Mesh(box, colorMaterial(gear.plume));
    plume.scale.set(0.1, 0.24, 0.4);
    plume.position.set(0, 0.6, -0.04);
    headPivot.add(plume);
  }
  if (gear.cape !== undefined) {
    const cape = new three.Mesh(box, makeMaterial(paintCape(gear.cape)));
    cape.scale.set(0.58, 1.08, 0.04);
    cape.position.set(0, 0.98, -0.15);
    figure.add(cape);
  }
  if (gear.crown) {
    // 金の王冠: 輪と6つの山、正面に青い宝石
    const gold = colorMaterial(0xe2b84a, 0x3a2a08);
    const ring = new three.Mesh(box, gold);
    ring.scale.set(0.54, 0.12, 0.54);
    ring.position.set(0, 0.56, 0);
    headPivot.add(ring);
    for (const [x, z] of [[-0.21, 0.21], [0.21, 0.21], [-0.21, -0.21], [0.21, -0.21], [0, 0.25], [0, -0.25]]) {
      const point = new three.Mesh(box, gold);
      point.scale.set(0.1, 0.14, 0.1);
      point.position.set(x, 0.68, z);
      headPivot.add(point);
    }
    const gem = new three.Mesh(box, colorMaterial(0x3a6ad8, 0x10204a));
    gem.scale.set(0.09, 0.07, 0.03);
    gem.position.set(0, 0.56, 0.28);
    headPivot.add(gem);
  }
  if (gear.scepter) {
    const rod = new three.Mesh(box, colorMaterial(0xe2b84a, 0x2a1e06));
    rod.scale.set(0.06, 0.95, 0.06);
    rod.position.set(0, -0.62, 0.2);
    armRight.add(rod);
    const orb = new three.Mesh(box, colorMaterial(0xd83a3a, 0x3a0a0a));
    orb.scale.set(0.14, 0.14, 0.14);
    orb.position.set(0, -0.12, 0.2);
    armRight.add(orb);
  }
  if (gear.weapon) {
    // 右手で立てて持つ(石突きは床の少し上)。腕を少し前へ出す。
    const shaft = new three.Mesh(box, colorMaterial(gear.weapon === "halberd" ? 0x5a3a1e : 0x7a5230));
    shaft.scale.set(0.07, 2.5, 0.07);
    shaft.position.set(0, -0.28, 0.16);
    armRight.add(shaft);
    const steel = colorMaterial(0xd4dae4);
    const tip = new three.Mesh(box, steel);
    tip.scale.set(0.1, 0.34, 0.05);
    tip.position.set(0, 1.1, 0.16);
    armRight.add(tip);
    if (gear.weapon === "halberd") {
      const blade = new three.Mesh(box, steel);
      blade.scale.set(0.34, 0.26, 0.03);
      blade.position.set(-0.17, 0.78, 0.16);
      armRight.add(blade);
      const ring = new three.Mesh(box, colorMaterial(0xe2b84a));
      ring.scale.set(0.12, 0.06, 0.12);
      ring.position.set(0, 0.62, 0.16);
      armRight.add(ring);
    } else {
      const guard = new three.Mesh(box, steel);
      guard.scale.set(0.2, 0.04, 0.05);
      guard.position.set(0, 0.92, 0.16);
      armRight.add(guard);
    }
  }

  // 足元のやわらかい影
  const shadow = new three.Mesh(new three.PlaneGeometry(0.95, 0.95), new three.MeshBasicMaterial({
    map: new three.CanvasTexture(paintShadow()), transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  return {
    root, headPivot, body, armLeft, armRight,
    headMaterials: head.materials, faceOpen, faceBlink,
    holdsWeapon: gear.weapon !== undefined || gear.scepter === true,
    seated,
    phase,
    targetYaw: 0,
    talking: false,
  };
}

/** 息づかい・腕の揺れ・あたりを見回す・まばたき・話し相手の方へ向き直る。 */
export function animateCharacter(rig: CharacterRig, time: number, delta: number): void {
  const p = rig.phase;
  const breath = Math.sin(time * 2.1 + p);
  rig.body.scale.y = 0.75 * (1 + breath * 0.014);
  rig.headPivot.position.y = 1.5 + breath * 0.01;
  const sway = Math.sin(time * 1.3 + p) * 0.06;
  // 座っている人は腕をひじ掛けに置く(前へ倒す)。
  const rest = rig.seated ? -0.75 : 0;
  rig.armLeft.rotation.set(rest + sway * (rig.seated ? 0.3 : 1), 0, 0.05);
  rig.armRight.rotation.set(rig.holdsWeapon ? rest - 0.22 : rest - sway, 0, -0.05);

  const follow = delta > 0 ? Math.min(1, delta * 3) : 1;
  const look = rig.talking ? 0 : Math.sin(time * 0.37 + p * 1.7) * 0.38 * Math.max(0, Math.sin(time * 0.21 + p));
  rig.headPivot.rotation.y += (look - rig.headPivot.rotation.y) * follow;

  let turn = rig.targetYaw - rig.root.rotation.y;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  rig.root.rotation.y += turn * (delta > 0 ? Math.min(1, delta * 7) : 1);

  const cycle = 3.4 + (p % 1.7);
  const closed = (time + p * 2) % cycle < 0.13;
  rig.headMaterials[4] = closed ? rig.faceBlink : rig.faceOpen;
}

function paintCape(color: number): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = 18;
  element.height = 34;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  for (let x = 0; x < 18; x += 1) {
    const fold = x % 4 === 0 ? 0.78 : x % 4 === 2 ? 1.06 : 0.94;
    ctx.fillStyle = `rgb(${Math.round(r * fold)},${Math.round(g * fold)},${Math.round(b * fold)})`;
    ctx.fillRect(x, 0, 1, 34);
  }
  ctx.fillStyle = "#e2b84a";
  ctx.fillRect(0, 0, 18, 2);
  ctx.fillRect(0, 31, 18, 3);
  return element;
}

function paintShadow(): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = 32;
  element.height = 32;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  const gradient = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
  gradient.addColorStop(0, "rgba(30,20,10,0.5)");
  gradient.addColorStop(1, "rgba(30,20,10,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return element;
}
