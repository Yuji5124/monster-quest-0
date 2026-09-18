# Battle Event 1.1 実装結果

最終更新: 2026-09-14 JST

## 作業前競合監査

`git status`、`git diff --name-status`、`git diff --stat`、`git diff -- src/main.ts`を確認した。Tiled・Field・Map・main.ts・README・進捗docsには並行作業の未コミット差分があったため、変更を保持した。`main.ts`にはBattleScene登録済みだったため今回変更していない。

## NPC Event構造

`NPC → dialogueId → Dialogue.afterDialogue → BattleDialogueEvent → BattleScene`の最小構造を追加した。Phaser依存しない`BattleEventData.ts`にはイベントデータ型・安全判定・BattleScene開始データ変換を置き、Phaser依存のfade/Scene遷移だけを`DialogueEvents.ts`に分離した。戦闘をNPCへ直接ハードコードしていない。

現在のイベント型は`type: "battle"`だけだが、会話後のアイテム・仲間・マップ遷移を追加できる余地を残す。巨大なEvent Engineや正式EventSystemは実装していない。

## DEV Battle NPC

No.02に`dev_battle_event_npc`を追加。分類はDEV_PLACEHOLDER_NPC / DEV_BATTLE_EVENT。既存`dev_npc_test`は変更していない。位置は(720,360)、復帰spawnは(720,420)で、Player 30×42のBodyとNPC・建物入口が重ならない。

## Dialogue

`dev_battle_event_npc`はDEV_PLACEHOLDER_DIALOGUEの一頁`しょうぶしてみるか？`のみ。正式シナリオへ登録していない。

## Dialogue → Battle

NPC正面でZ / Enterを押すと既存DialogueBoxを開く。最後の頁を閉じた確認入力だけが`afterDialogue`を起動し、入力ロック→220ms fadeOut→BattleSceneへ移る。会話開始・会話終了・戦闘コマンドの同フレーム二重消費はない。

## Battle開始データ

BattleSceneへ以下を渡す。

```ts
{ mode: "event", type: "battle", eventId, monsterId, returnSceneKey, returnSpawnId }
```

最初のイベントは`dev_battle_event_003`、monsterIdは`003`。006への差し替えはデータ側のmonsterIdだけで可能。URL Battle Testのquery経路は維持する。

## Monster

イベント戦の敵は`MONSTER 003`。003 / 006にCURRENT正式名称の対応は未確認のため、名称を創作していない。DEV_BATTLE_BALANCEも従来どおり最終値ではない。

## Battle → Map復帰

イベント戦の勝利後、Z / EnterでfadeOutし、StartingTownSceneの`spawn_battle_event_return`へ戻る。Battle Test URLでは勝敗後の従来どおりの再戦を維持する。

## 即再戦防止

Battle復帰時は`battleEventReturn`を渡す。StartingTownSceneはconfirmが一度releaseされるまで会話開始を受け付けない。その後はNPCに近づき直せば、保存フラグなしで再戦できる。

## Defeat時の挙動

DEFEATは表示する。イベント戦ではZ / Enterで同じイベント戦を再試行、X / EscapeでNo.02へ戻る。正式Game Over・セーブ・復活処理ではない。

## Battle画面レイアウト

960×720を維持。`DEV_BATTLE_UI_LAYOUT`へ敵表示域、Status / Command / Message Window、余白・文字サイズを集約した。

```
DEV Graphics Background
  ↓
Enemy portrait
  ↓
Status Window | Command Window
  ↓
Message Window
```

## Battle Background

- CURRENT: なし。
- REFERENCE: `assets/battle/backgrounds/reference/`のみ。
- READY_TO_IMPORT: 台帳上のbattle_bg_*だが、実ファイルは存在しない。
- DEV: 空・地面・小さな星だけのGraphics背景。新規画像生成なし。

## Enemy表示

中央(480,220)、最大360×270。003 / 006ともLINEAR filterで縦横比を維持し、元画像の加工・トリミング・pixel-art化をしていない。

## Status / Command / Message Window

暗色地＋白枠のFC〜初期SFC風Window。敵HPはDEV_BATTLE_UIとして表示し、本番仕様に確定しない。コマンドは`▶ たたかう`だけで、将来コマンド追加が可能な独立Windowとしている。

## Attack演出

主人公攻撃は敵の短い横揺れ・点滅、敵攻撃は主人公Status Windowの短い点滅。BattleSystemの状態・ダメージ計算は演出タイミングに依存しない。

## Victory演出

敵HPが0の後、VICTORY確定時に敵画像を160msでfadeする。勝利後はイベント戦とURLテストで異なる終了動作を取る。

## BattleSystemへの変更

なし。既存のCOMMAND / PLAYER_ACTION / ENEMY_ACTION / VICTORY / DEFEAT、最小ダメージ、撃破後の反撃なしを維持。

## NPCシステムへの変更

既存Npc / Interaction / DialogueBox / InputSystemを再利用。StartingTownSceneに`afterDialogue`処理と復帰後confirm release待ちだけを追加。

## 変更ファイル

- `src/scenes/BattleScene.ts`
- `src/config/battle.ts`
- `src/data/dialogues.ts`
- `src/config/maps.ts`
- `src/scenes/StartingTownScene.ts`
- `tests/battleEvent.test.mjs`

新規:

- `src/events/BattleEventData.ts`
- `src/events/DialogueEvents.ts`
- 本書

## Tiled / Fieldへの変更

なし。`tiled/`、FieldScene、field.ts、MapCamera、MapTransition、StartingPlaceScene、InteriorScene、main.tsは変更していない。

## 自動テスト

新規4件: Dialogue→Battle Event、monsterId / eventId / returnSceneKey / returnSpawnId引渡し、再実行可能、無効イベント安全処理。既存Battle Test 6件を保持。

## npm test / typecheck / build

- `npm test`: **81/81 PASS**（既存77 + Event 1.1の4件）。
- `npm run typecheck`: **PASS**。
- `npm run build`: **PASS**。44 modulesを変換し、003 PNGと006 JPEGをdist/assetsへ出力。既存の500kB超chunk警告は残るが、build失敗ではない。

## NPC→Battle runtime確認

ChromeでStartingTownSceneへ入り、実キー入力でNPC正面→Z→会話→Z→BattleScene→003表示→複数ターン・敵反撃→VICTORY→Z→No.02復帰を確認する。復帰直後の会話なしと、近づき直した再会話も確認する。

実行済み。復帰座標は(720,420)、復帰直後のDialogueBoxは閉じたまま、近づき直すと同じDEV会話を再び開始できた。console error 0、missing texture 0、404 0。

## Battle Test 003 / 006

`?battleTest=003`と`?battleTest=006`の両方を維持し、勝利まで回帰確認する。

実行済み。003は主人公HP 26/30、006は18/30で勝利。両URLでconsole error、missing texture、404はいずれも0。

## 次のBattle実装前TBD

正式戦闘背景、正式モンスター名・全25体対応、戦闘UIの最終デザイン、魔法・どうぐ・にげる、行動順、だいヒット、タッチ入力、Encounter、報酬、仲間、セーブ、正式Game Over。

BATTLE EVENT 1.1 STATUS:
PASS
