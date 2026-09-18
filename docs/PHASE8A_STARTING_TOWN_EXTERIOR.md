# Phase 8-A No.02「はじまりのまち」外観

最終更新: 2026-09-13 JST

## 今回の範囲

Phase 8全体（No.02正式実装）のうち、今回は8-A「町の外観・歩行・NPC・建物入口」のみ。建物内部・店機能・宿泊・教会機能・購入・宝箱・戦闘・セーブ・音・No.03以降はPhase 8-B以降。

## 開始時の確認

- `git status`/`git diff`でPhase 7完了時点からの変更がないことを確認。
- `docs/MAP_FLOW_SPEC.md` §4「No.02 はじまりのまち」: 最初の通常拠点、内部設計データは`assets/maps/data/no02_start_town_interiors.json`で管理、宿屋/道具屋/武器屋/教会/民家等をコンパクトに構成、と確認。
- `docs/NPC_SPEC.md`: はじまりのまちは「会話原案あり / NPC構成・人数は再検討」であり、既存会話・人数案は素材扱いで確定していないことを確認。「旧NPC人数を自動的に採用してはいけない」「AIが独自に重要設定を確定してはいけない」を確認。
- `assets/maps/data/no02_start_town_interiors.json`（DESIGN_DATA）: 宿屋・どうぐや・ぶきや・きょうかい・民家A・民家Bの6棟が存在すると確認。各`exit.spawnId`（`spawn_inn_front`等）から、内部から出た際に対応する「建物前」スポーンが将来必要になることを確認。民家A/Bは`npcs: []`（内部NPCなし）。
- `docs/ASSET_INDEX.md` / `assets/asset_catalog.json`: No.02の正式タイルセット・建物画像は存在しない（`tileset.base`/`tileset.extra`はREADY_TO_IMPORTだが実ファイルは`assets/maps/tilesets/`に無い）ことを確認。
- 既存コード（`StartingTownScene.ts` / `StartingPlaceScene.ts` / `Player.ts` / `Npc.ts` / `Interaction.ts` / `DialogueBox.ts` / `maps.ts` / `MapTransition.ts`）を確認し、Phase 6/7のロジックを変更せず拡張できる形を検討した。

## 正式素材監査

- **CURRENT**: なし（No.02外観・建物の正式画像は存在しない）。
- **REFERENCE**: `assets/maps/reference/`配下に一般的な参考画像群はあるが、No.02外観として正式採用された画像はない。今回は使用していない。
- **SUPERSEDED**: 該当なし。
- **TBD**: `tileset.base` / `tileset.extra`（`asset_catalog.json`上READY_TO_IMPORTだが実ファイル未配置）。No.02正式タイル・建物外観画像は引き続きTBD。

正式画像が無いため、建物・NPC・地面はすべてPhaserの`Rectangle`/`Graphics`によるDEV_PLACEHOLDER_COLLISION表示とした。新規画像は生成していない。

## No.02外観

960×720（旧320×240基準×3）の単一画面内に町を配置（カメラスクロールは今回追加していない）。

- 西端（x:0〜48, y:312〜672）: No.01への出口（Phase 6のまま）。
- 西寄り（x=120, y=420）: No.01からの入口スポーン`fromStartingPlace`（Phase 6のまま、位置変更なし）。
- 中央: 東西に開けた広場（道）。上下2段に建物3棟ずつを配置。
- NPC1体を広場中央付近（x=570, y=360）に配置。

## 建物一覧

`assets/maps/data/no02_start_town_interiors.json`で存在が確認できる6棟のみ配置。

| id | 名称 | 種別 | 対応interiorId |
|---|---|---|---|
| bld_02_item_shop | どうぐや | item_shop | map_02_item_shop |
| bld_02_weapon_shop | ぶきや | weapon_shop | map_02_weapon_shop |
| bld_02_church | きょうかい | church | map_02_church |
| bld_02_inn | やどや | inn | map_02_inn |
| bld_02_house_a | 民家A | house | map_02_house_a |
| bld_02_house_b | 民家B | house | map_02_house_b |

## 建物配置

上段（y=90〜198）: どうぐや・ぶきや・きょうかい（西から東）。
下段（y=522〜630）: やどや・民家A・民家B（西から東）。
各建物は幅168×高さ108（旧基準56×36の3倍）、種別ごとに色分けしたDEV_PLACEHOLDER_COLLISION矩形。入口は建物前面（上段は下辺、下段は上辺）に暗色の仮マーカーを表示するのみで、まだ機能しない。

## No.01からの入口

Phase 6の`fromStartingPlace`スポーン（x=120, y=420, facing:right）を変更せず、正式入口としてそのまま採用した。spawnId構造・MapTransitionロジックは無変更。

## NPC一覧

正式なNo.02外観NPCの人数・役割・配置は`NPC_SPEC.md`により再検討中のため未確定。今回はPhase 7のDEV_PLACEHOLDER_NPC（`dev_npc_test`）を新しい町割りに合わせて広場中央付近へ再配置しただけで、新規NPCの追加・削除は行っていない。

## 正式会話

確定済みの正式会話本文は存在しない（`NPC_SPEC.md`により既存会話案は「素材」扱いで未確定）。今回、正式会話の新規実装・創作は行っていない。

## DEV_PLACEHOLDER_DIALOGUE

Phase 7の`dev_npc_test`（2ページ）をそのまま再利用。新規文章は作成していない。

## Player

Phase 5の`Player`クラス・4方向移動・facing・Collision・InputSystemをそのまま使用。変更なし。主人公の正式歩行素材は引き続きTBD。

## Collision

- 建物6棟: 各`footprint`全体を`physics.add.collider`で通行不可に（入口タイルも含め、まだ入れない＝DEV_PLACEHOLDER_COLLISION）。
- NPC: Phase 7のまま。
- マップ境界: `physics.world.setBounds`のまま（Phase 6から変更なし）。
- 水辺等: 現行デザインデータに存在しないため未実装。

建物・NPCの座標はすべて`src/config/maps.ts`の`MapDefinition.buildings`/`npcs`に集約し、Sceneへ座標ifを直書きしていない。

## MapTransition

Phase 6の`beginMapTransition`/`createExitZone`/`handleExit`/`transitioning`ガードは無変更。No.01⇄No.02の往復を実際に検証済み（後述）。

## 建物入口

各建物前面に暗色マーカーを表示し、入口の位置が視覚的に分かるようにした。建物全体（入口含む）にCollisionを設定しているため、現時点では入口へ「近づく」ことはできるが「入る」ことはできない（Phase 8-Bで接続予定）。存在しないSceneへの遷移コードは書いていないため、入口へ触れてもエラーは発生しない。

## no02_start_town_interiors.jsonの扱い

DESIGN_DATAとして「どの建物が存在するか」の確認資料としてのみ利用した。Tilemapとして読み込む処理は実装していない。各建物の`interiorId`フィールドに、このJSONの`interiors[].id`と同じ文字列を記録し、Phase 8-Bでの接続時に突き合わせやすくした。

## npm test

39/39成功（既存32件 + 新規`tests/buildings.test.mjs`7件）。

## typecheck

成功。

## build

成功。

## ブラウザ確認

Browserペインが今回も非表示（`requestAnimationFrame`停止）のため、`window.__game`を一時公開しScene状態を直接検証する方式で確認（検証後にコード完全復元、`git diff`で残存なしを確認）。

- 静止画で6棟の建物・ドアマーカー・NPC・Player・出口マーカーが設計通りの位置に表示されることを確認。
- `physics.world.colliders`が8件（建物6 + NPC1 + 出口1）登録されていることを確認。
- 各建物の`body`座標・サイズが`maps.ts`の定義（×3倍）と一致することを確認。
- NPCへ隣接・正面を向いた状態で`tryStartDialogue()`→1ページ目→2ページ目→終了までPhase 7と同じ挙動を確認。
- 西端の出口ゾーンへ`physics.world.step()`で疑似移動させ、`transitioning`が正しく立つ（No.02→No.01遷移が発火する）ことを確認。
- 全操作を通じてconsoleエラー0件、ネットワークリクエストはすべて200 OK。

## console error

0件。

## missing texture

0件（新規画像を追加しておらず、`Rectangle`/`Graphics`/`Text`のみで構成）。

## Phase 8-B前のTBD

- 建物内部Scene・ドアからの実際の遷移（`interiorId`を使って接続）。
- 正式なNo.02外観NPCの人数・役割・配置・会話（`NPC_SPEC.md`の再検討が先）。
- 正式な町タイル・建物外観画像。
- 町の外へ出る出口（No.03方面、Phase 9のワールドマップと合わせて検討）。
- 実際のキーボード操作によるブラウザ手触り確認（今回はScene状態検証で代替）。
- iPhone Safari実機確認。

PHASE 8-A STATUS:
PASS
