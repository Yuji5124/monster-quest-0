# DEV 3人パーティー・経路追従

最終更新: 2026-09-19 JST

## 状態

`DONE`（正式な本編加入イベントではなく、安全に独立したDEV検証）。

## 実装範囲

- `PartySystem` が `hero` / `tarosa` / `mirei` の `id`、表示名、joined状態、固定順を一元管理する。
- 初期状態は主人公のみ。タロサ、ミレイの順以外では加入できない。重複加入は無効。
- 加入順は既存の `GameStateRepository` の単一キーへ保存する。旧セーブに`party`が無い場合は主人公のみへ安全に正規化する。
- `PartyFollowers` は主人公の実座標履歴を後方距離で参照する。タロサは1キャラクター分、ミレイはそのさらに1キャラクター分後ろを通るため、曲がり角を斜めに短絡しない。
- 適用範囲(2026-09-19): 通常フィールドの画像マップ全て(No.01/No.02/はじまりのもり/ビーエのむら/レインランドのもり)と建物内部(`InteriorScene`)、legacy `FieldScene`。ビーエのむら・はじまりのもりは当初未組み込みで、同日追加した。各Sceneの`preload()`でタロサ・ミレイの歩行Spriteを読み込み、主人公の`setDepth(1000)`後に`new PartyFollowers(this, this.player)`を作る。
- followerは表示専用であり、Physics Body・NPC会話・出口判定を持たない。タロサ・ミレイとも2026-09-19に正式歩行Sprite(`tarosa_walk.png`/`mirei_walk.png`)へ置き換え済み(動いているかで歩行/直立を自動切り替え)。
- Spriteのfollowerは原点(フレーム中心)が主人公のbody中心(足元寄り)とズレるため、`characterWalkSprite.ts`の`bodyCenterOffset()`でそのズレを打ち消してから配置している。当初はこの補正が無く、横移動時にタロサの足元が主人公と約11pxズレて浮いて見える不具合があった(ユーザー指摘で発見・修正)。
- 3人が縦に並ぶ向き(上下移動)で、常に主人公が最前面・タロサがその次・ミレイが最背面という固定順で重なっていたため、進行方向によっては画面下(カメラに近い側)にいるはずのメンバーが後ろのメンバーに隠れる不自然な重なりになっていた(ユーザー指摘で発見)。`PartyFollowers.positionFollowers()`で毎フレーム、主人公・各followerのdepthをY座標に応じて動的に並べ替えるようにし(Sceneが設定する基準depthを中心に小さな帯の中でY-sort)、画面下にいる者ほど手前に描かれるよう修正した。横移動時はY差がほぼ無く縦の重なりも起きないため影響しない。
- `StartingPlaceScene` / `StartingTownScene` / legacy `FieldScene` / `InteriorScene` で再生成する。ワールドマップはプレイヤーを置かない選択UIのため対象外。

## DEV加入NPC

No.02「はじまりのまち」に、正式NPC仕様へ影響しない以下の仮NPCを置く。

| ID | 会話ID | 条件 | 結果 |
|---|---|---|---|
| `dev_party_join_tarosa_npc` | `dev_party_join_tarosa` | タロサ未加入 | `DEV_PARTY_JOIN_TAROSA`でタロサ加入 |
| `dev_party_join_mirei_npc` | `dev_party_join_mirei` | タロサ加入済み、ミレイ未加入 | `DEV_PARTY_JOIN_MIREI`でミレイ加入 |

ミレイNPCへ先に話すと加入せず、加入済みNPCは通常の再会話へ分岐する。

## 検証

- `npm test`: 全件PASS（加入順、保存正規化、会話分岐、曲がり角の経路追従を含む）。
- `npm run typecheck` / `npm run build`: PASS。
- `tests/browser/partyRuntime.html?partyRuntimeTest=1`: 実Phaser Sceneで、ミレイ先行拒否 → タロサ加入・追従 → ミレイ加入 → `WorldMapScene` → No.01で3人再生成までALL PASS。これはメモリ内PartySystemを使い、ユーザーのLocalStorageを変更しない。

## 正式化時の差し替え箇所

- No.02のDEV NPCと `getDialogue` のDEV分岐を、正式マップの`events.json`と共通`joinParty`イベントランナーへ置き換える。
- `PartyFollowers` の仮Rectangleを、正式配置済みの歩行Spriteと既存歩行アニメーションへ置き換える。主人公・タロサ・ミレイは2026-09-19に完了。わたべ(`watabe_walk.png`)は参考画像が届き次第、同じ手順(`tools/character_walk_sheet.py`)で追加する。
- BattleSystemは今回未変更。戦闘参加者・成長値・編成UIは `PartySystem.getActiveMembers()` を入力にする別フェーズで接続する。
