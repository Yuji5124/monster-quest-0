# Phase 7 NPC + 会話システム

最終更新: 2026-09-13 JST

## 今回の範囲

ユーザー指定のPhase 7は、「主人公→NPCの隣へ移動→NPCの方を向く→Z/Enter→会話ウィンドウ→ページ送り→終了→操作復帰」というRPG基本会話システムの最小実装のみ。No.02の正式な町・正式NPC配置・正式台詞・選択肢/分岐会話・イベントフラグはPhase 8以降。

## 開始時の確認

- `git status`/`git diff`/`git log`でPhase 6完了時点（PASS、コード変更なし）から作業ツリーがクリーンであることを確認。
- `docs/NPC_SPEC.md`でNPC人数・配置・会話は「再検討段階」であり、旧会話案は素材扱いで確定でないことを確認。正式台詞は創作しない。
- `docs/UI_INPUT_SPEC.md` §5「会話UI」: 短文優先、iPhone実機で読める文字サイズ、長文を1画面へ詰め込まない、会話送り中の二重入力を防ぐ、を確認。
- `docs/DATA_CONTRACTS.md` §6 npc（id/mapId/position/dialogueId）・§7 dialogue（id/variants）を確認。Phase 7では`variants`（進行フラグ分岐）は使わず、`pages`（単純な複数ページ）へ簡略化した。分岐が必要になった時点でDATA_CONTRACTSの形式へ寄せる前提。
- `src/entities/Player.ts` / `src/systems/InputSystem.ts` / `src/scenes/StartingPlaceScene.ts` / `src/scenes/StartingTownScene.ts` / `src/systems/MapTransition.ts` / `src/config/maps.ts` / `src/main.ts` / `tests/` を確認し、Phase 5・6のロジックを変更せずに拡張できる形を検討した。

## DEV_PLACEHOLDER_NPC

`src/config/maps.ts`の`map_02_starting_town.npcs`に1体だけ定義（`dev_npc_test`、位置(160,140)、facing:"down"）。正式NPC画像は生成せず、`src/entities/Npc.ts`が`Phaser.GameObjects.Rectangle`（`src/config/npc.ts`の色・サイズ）で表示する。`asset_catalog.json`への登録は行っていない。

## DEV_PLACEHOLDER_DIALOGUE

`src/data/dialogues.ts`の`dev_npc_test`に2ページの確認文のみ。

```
1: "ここは　かいわテストです。"
2: "つぎのページです。"
```

本編ストーリー・世界設定を新しく創作していない。

## 変更ファイル

- `src/config/maps.ts`: `NpcDefinition`型と`MapDefinition.npcs`フィールドを追加。`map_01`は`npcs: []`、`map_02`に上記1体を追加。既存のspawn/exit定義・型は無変更。
- `src/scenes/StartingTownScene.ts`: NPC生成・NPC Collision・会話開始判定・`DialogueBox`統合・入力tickの分岐を追加。Phase 6のマップ遷移ロジック（`handleExit`/`transitioning`/spawn解決）は無変更。

`src/scenes/StartingPlaceScene.ts`・`src/entities/Player.ts`・`src/systems/InputSystem.ts`・`src/systems/MapTransition.ts`・`src/main.ts`は今回変更していない（`main.ts`は既にPhase6でStartingTownSceneを登録済みのため追加登録は不要）。

## 新規ファイル

- `src/systems/Interaction.ts`: `facingZone()` / `canInteract()`。Phaser非依存の純粋関数（Node上で単体テスト可能）。
- `src/config/interaction.ts`: 判定距離`INTERACTION_REACH`(8px) / 幅`INTERACTION_SPAN`(12px)。
- `src/config/npc.ts`: NPC仮表示のサイズ・色。
- `src/entities/Npc.ts`: NPCの表示・静的Body。
- `src/data/dialogues.ts`: 会話データ（`{id, pages}`）。
- `src/ui/DialogueBox.ts`: 会話ウィンドウ（背景・本文・次ページ表示）。
- `tests/interaction.test.mjs`: 判定ロジック5件。
- `tests/npcDialogue.test.mjs`: NPC/会話データの整合性5件。

## NPC構造

`NpcDefinition = { id, mapId, position: {x, y}, facing, dialogueId }`。`DATA_CONTRACTS.md` §6のid/position/dialogueId命名に合わせた。当たり判定サイズ・色はPlayerと同じパターンでNPCインスタンスにではなく`config/npc.ts`（`NPC_VISUAL`）に持たせている。

## Interaction構造

`facingZone(center, facing, reach, span)`が主人公中心から向いている方向へ伸びる小さな矩形を返し、`canInteract()`がその矩形とNPCの矩形が重なるかどうかを判定する。判定はPhaserのGameObjectやSceneに依存しない純粋関数で、座標のif文をSceneへ直書きしていない。NPCに限らず、今後「対象の矩形」さえ渡せば宝箱・扉・看板にもそのまま使える構造。ただし今回は巨大なInteractionEngineやイベントキュー等は作っていない。

## Player facingの利用

Phase 5の`Player.facing`（up/down/left/right）をそのまま参照するだけで、Player側へ新しい向きシステムは追加していない。

## Dialogueデータ構造

`Dialogue = { id, pages: string[] }`。`DIALOGUES: Record<string, Dialogue>`でdialogueIdから引く。`variants`（進行フラグ分岐）・選択肢・イベントフラグは今回実装していない。

## 会話ウィンドウ

320×240の下部に固定表示（`x:8, y:168, width:304, height:64`、8px余白）。背景は暗色の塗り矩形+明るい1色の枠線（`setStrokeStyle`）のみで、角丸・吹き出し・顔アイコン・グラデーション・Tweenは使っていない。文字はmonospace 12px、`wordWrap`で幅304-16pxに収め、画面外にはみ出さない。次ページがある間だけ右下に「▼」を表示する（点滅等のアニメーションなし）。

## ページ送り

1文字ずつのタイプライター演出は今回実装せず、ページ内容を即時表示する。最低2ページ（`dev_npc_test`）でページ送りを確認できる。

## 入力ロック

既存`InputSystem`はロックが「全キー無効」のみのため、会話中に確定入力（ページ送り）まで塞いでしまう`setLocked(true)`は使わず、Scene側で「会話が開いている間は`Player.update()`を呼ばない」という形で移動だけを止めている。会話を開いた瞬間は`player.body.setVelocity(0,0)`で即座に静止させる。`consumePressed("confirm")`を1フレームにつき1回だけ読み、会話が開いているかどうかで「ページ送り」か「話しかけ開始」かに振り分けるため、同一フレームでの二重消費（話しかけ+1ページ目スキップ、終了+即再開始）は起きない。MapTransitionの`setLocked`はこれまで通り遷移専用で無変更。

## NPC Collision

Phase 5のPlayer Collisionと同じ`physics.add.collider`パターンを、NPCの静的Body（`Npc.body`）に対しても使っている。今回1体のみのため、専用のCollision管理システムは作っていない。

## MapTransitionとの共存

会話中は`Player.update()`を呼ばないため主人公は移動せず、出口ゾーンへ新たに侵入することもない。`handleExit`の`transitioning`ガードや`beginMapTransition`はPhase 6のまま変更していない。NPCの配置(160,140)は出口ゾーン(x:0-16)から離しており、通常操作で干渉しない。

## 自動テスト

`tests/interaction.test.mjs`（5件）: 正面の対象と反応する/しない、遠い対象と反応しない、上下方向、`facingZone`の形状。
`tests/npcDialogue.test.mjs`（5件）: 各dialogueが1ページ以上かつid一致、テストNPCの会話が2ページ以上、NPCが参照するdialogueIdの実在性、マップ内NPC idの重複なし、NPCのmapIdがそのマップと一致。

## npm test

30/30成功（既存20件 + 今回の10件）。

## typecheck

`npm run typecheck`: 成功。

## build

`npm run build`: 成功。

## ブラウザ確認（2026-09-13 追記・監査で完了）

Browserペインが引き続き非表示（hidden）で`requestAnimationFrame`が安定しないため、通常のキー操作による対話的確認の代わりに、`window.__game`を一時的に公開してScene・オブジェクトの実状態を直接検証する方式で確認した（検証後にコードは元に戻し、`git diff`で残存なしを確認済み）。

- No.02にNPCが1体表示され、`physics.add.collider`でPlayer↔NPCのCollider(2件中の1件)が登録されていることを確認。
- Playerを遠方に置いた状態で`tryStartDialogue()`を呼んでも会話が開始しないこと（離れたNPCと話せない）を確認。
- NPCへ隣接させたうえで`facing:"left"`（背中側）では会話が開始せず、`facing:"right"`（正面）に変えると開始することを確認。
- 開始直後の1ページ目が「ここは　かいわテストです。」と正しく表示され、即座に2ページ目へ飛ばないことを確認。
- 会話中、`player.body.velocity`が`(0,0)`のまま変化しないことを確認（移動不可）。
- `advance()`で2ページ目「つぎのページです。」へ進み、2回目の`advance()`で会話が終了(`isOpen`が`false`)することを確認。
- No.01の`fromStartTown`スポーン、No.02出口ゾーンでの`physics.world.step()`による疑似移動で`transitioning`フラグが正しく立ち、その後の追加ステップで二重発火しないことを確認。
- 全操作を通じてconsoleエラー0件。

## missing texture

0件。新規画像は追加しておらず、`Graphics`/`Rectangle`/`Text`のみで構成している。

## console error

0件。

## Phase 8前に残っているTBD

- 正式NPC配置・正式台詞・NPC人数（`NPC_SPEC.md`により再検討中）。
- 選択肢付き会話・分岐会話・イベントフラグ（Phase 7の範囲外、将来`variants`形式で拡張予定）。
- 文字送り演出・会話SEの要否。
- 会話ウィンドウのサイズ・文字サイズ・行間・NPCとの距離感は人間による最終調整が望ましい（現状22pxで運用中）。
- iPhone Safari実機確認は引き続き未完了。
- 実際のキーボード操作によるブラウザ対話的確認（本監査はScene状態の直接検証で代替したため、可能であれば通常のChrome/Edgeでの手触り確認も推奨）。

PHASE 7 STATUS:
PASS
