import Phaser from "phaser";
import { PLAYER } from "../config/player.ts";
import { bodyCenterOffset, idleFrame } from "../config/characterWalkSprite.ts";
import type { WalkSpriteGeometry } from "../config/characterWalkSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { Player } from "../entities/Player.ts";
import type { Facing } from "./PlayerMovement.ts";
import { partySystem } from "./PartySystem.ts";
import type { PartyMemberId, PartySystem } from "./PartySystem.ts";
import { PartyTrail } from "./PartyTrail.ts";
import type { PartyTrailPoint } from "./PartyTrail.ts";
import { ensureWalkAnimations, walkAnimKey } from "./CharacterWalkSprite.ts";
import { createCharacterGroundShadow, placeCharacterGroundShadow } from "./CharacterGroundShadow.ts";

// 仲間同士の間隔。スプライト(54×70)の大きさに合わせた値で、当たり判定(PLAYER.height)とは独立に保つ。
// 2026-09-19に当たり判定を24×24へ縮めた際も、従来の隊列間隔(42px)を変えないよう固定値にした。
export const PARTY_FOLLOW_DISTANCE = 42;

// Y座標が大きい(画面下=カメラに近い)キャラクターほど手前に描く簡易Y-sort。
// マップ側のY-sortは未実装(既知の制約)だが、パーティ内の前後関係だけは
// leader.visual.depth(各Sceneが設定する基準値、通常1000)を中心とした
// 小さな帯の中で並べ替えれば、既存の「背景より必ず手前」という前提を崩さない。
const DEPTH_Y_FACTOR = 0.01;

type FollowerAppearance =
  | { readonly kind: "sprite"; readonly geometry: WalkSpriteGeometry }
  | { readonly kind: "rectangle"; readonly color: number };

const FOLLOWER_APPEARANCE: Readonly<Record<Exclude<PartyMemberId, "hero">, FollowerAppearance>> = {
  tarosa: { kind: "sprite", geometry: TAROSA_SPRITE },
  mirei: { kind: "sprite", geometry: MIREI_SPRITE },
};

type FollowerGameObject = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

interface FollowerVisual {
  readonly memberId: Exclude<PartyMemberId, "hero">;
  readonly visual: FollowerGameObject;
  readonly groundShadow: Phaser.GameObjects.Ellipse;
  facing: Facing;
  // 直前に配置した座標。nullは「まだ一度も配置していない」= 初回は歩行アニメを鳴らさない。
  lastX: number | null;
  lastY: number | null;
}

/** Visual-only field followers. They intentionally have no Arcade body or interaction target. */
export class PartyFollowers {
  private readonly followers = new Map<Exclude<PartyMemberId, "hero">, FollowerVisual>();
  private readonly trail: PartyTrail;
  private readonly scene: Phaser.Scene;
  private readonly leader: Player;
  private readonly party: PartySystem;
  private readonly baseDepth: number;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    leader: Player,
    party: PartySystem = partySystem,
  ) {
    this.scene = scene;
    this.leader = leader;
    this.party = party;
    // Sceneがcreate()直後に設定する固定depth(背景・Objectより必ず手前、通常1000)を
    // 帯の中心として保持する。以後、この値そのものは書き換えない。
    this.baseDepth = leader.visual.depth;
    // Spriteのテクスチャ自体はScene#preload()で読み込み済みである前提(未読み込みならScene側の設定漏れ)。
    for (const appearance of Object.values(FOLLOWER_APPEARANCE)) {
      if (appearance.kind === "sprite") ensureWalkAnimations(scene, appearance.geometry);
    }
    this.trail = new PartyTrail(this.leaderPoint(), PARTY_FOLLOW_DISTANCE * 8);
    this.syncMembers();
    this.positionFollowers();
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.handlePostUpdate, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  /** Can be called immediately after a join dialogue so the new member appears without a scene reload. */
  syncMembers(): void {
    const desired = new Set(this.party.getPartyOrder().filter((id): id is Exclude<PartyMemberId, "hero"> => id !== "hero"));
    for (const [id, follower] of this.followers) {
      if (!desired.has(id)) {
        follower.visual.destroy();
        follower.groundShadow.destroy();
        this.followers.delete(id);
      }
    }
    for (const id of desired) {
      if (this.followers.has(id)) continue;
      const appearance = FOLLOWER_APPEARANCE[id];
      const facing = this.leader.facing;
      const visual = appearance.kind === "sprite"
        ? this.scene.add.sprite(0, 0, appearance.geometry.key, idleFrame(facing))
        : this.scene.add.rectangle(0, 0, PLAYER.width, PLAYER.height, appearance.color);
      visual.setDepth(this.baseDepth);
      const groundShadow = createCharacterGroundShadow(this.scene, 0, 0, this.baseDepth);
      this.followers.set(id, { memberId: id, visual, groundShadow, facing, lastX: null, lastY: null });
    }
    this.positionFollowers();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.handlePostUpdate, this);
    for (const follower of this.followers.values()) {
      follower.visual.destroy();
      follower.groundShadow.destroy();
    }
    this.followers.clear();
  }

  private handlePostUpdate(): void {
    if (this.destroyed) return;
    this.trail.record(this.leaderPoint());
    this.syncMembers();
  }

  private positionFollowers(): void {
    const leaderPoint = this.leaderPoint();
    this.leader.setDepth(this.baseDepth + leaderPoint.y * DEPTH_Y_FACTOR);

    const activeIds = this.party.getPartyOrder().filter((id): id is Exclude<PartyMemberId, "hero"> => id !== "hero");
    activeIds.forEach((id, index) => {
      const follower = this.followers.get(id);
      if (!follower) return;
      const target = this.trail.getPointBehind(PARTY_FOLLOW_DISTANCE * (index + 1));
      const moved = follower.lastX !== null && follower.lastY !== null &&
        Phaser.Math.Distance.Between(follower.lastX, follower.lastY, target.x, target.y) > 0.01;
      // trailは主人公のbody中心(足元寄り)を記録している。Rectangleは原点=見た目の中心が
      // そのままbody中心相当だが、Spriteは原点(フレーム中心)がそれとズレる(頭・髪の分、
      // 中心より下に体がある)ため、そのズレを打ち消してから配置しないと横移動時に
      // 主人公の足元ラインとfollowerの足元ラインが揃わない。
      const anchor = this.anchorOffset(id);
      follower.visual.setPosition(target.x - anchor.x, target.y - anchor.y);
      // 画面下(=カメラに近い側)にいるキャラクターほど手前に描く。隊列が縦に並ぶ向き
      // (上下移動)では、後ろのメンバーほど画面下に来るため自然に手前へ出て、
      // 前のメンバーを正しく隠す。横移動時はY差がほぼ0でdepthも同点近くになるが、
      // その向きでは縦の重なりがそもそも起きないため問題にならない。
      const depth = this.baseDepth + target.y * DEPTH_Y_FACTOR;
      follower.visual.setDepth(depth);
      placeCharacterGroundShadow(follower.groundShadow, target.x, target.y + PLAYER.height / 2, depth);
      follower.facing = target.facing;
      follower.lastX = target.x;
      follower.lastY = target.y;
      this.updateAnimation(id, follower, moved);
    });
  }

  private anchorOffset(id: Exclude<PartyMemberId, "hero">): { x: number; y: number } {
    const appearance = FOLLOWER_APPEARANCE[id];
    if (appearance.kind !== "sprite") return { x: 0, y: 0 };
    return bodyCenterOffset(appearance.geometry, PLAYER.width, PLAYER.height);
  }

  private updateAnimation(id: Exclude<PartyMemberId, "hero">, follower: FollowerVisual, moved: boolean): void {
    const appearance = FOLLOWER_APPEARANCE[id];
    if (appearance.kind !== "sprite") return;
    const sprite = follower.visual as Phaser.GameObjects.Sprite;
    if (moved) {
      sprite.play(walkAnimKey(appearance.geometry, follower.facing), true);
    } else {
      sprite.anims.stop();
      sprite.setFrame(idleFrame(follower.facing));
    }
  }

  private leaderPoint(): PartyTrailPoint {
    const center = this.leader.body.center;
    return { x: center.x, y: center.y, facing: this.leader.facing };
  }
}
