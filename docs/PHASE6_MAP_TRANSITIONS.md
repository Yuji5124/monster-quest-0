# Phase 6 マップ遷移（No.01⇔No.02往復基盤）

最終更新: 2026-09-13 JST

## Phase 6.1 ランタイム検証（2026-09-13）

Phase 6のコード自体は変更せず、ランタイム確認のみを行った。Claude Code側のBrowserペインは今回もhidden状態が続き`requestAnimationFrame`が発火しなかったため、**ユーザーが通常のChrome/Edge（Browserペイン外）で手動操作により確認**した。

確認結果（ユーザー報告）:
- Title → OpeningGlitchScene → No.01: 正常
- No.01内の4方向移動: 正常
- No.01右端 → No.02: 正常
- fadeOut / fadeIn: 正常
- No.02の`fromStartingPlace`spawn: 正常
- No.02内の移動: 正常
- No.02左端 → No.01: 正常
- No.01の`fromStartTown`spawn復帰: 正常
- 出口へのキー長押しでも二重遷移なし（`transitioning`フラグが有効に機能）
- 遷移中（fadeOut中）の異常移動なし（入力ロックが有効に機能）
- 焚き火Collision維持
- 表示崩れなし
- コンソール上に目立つエラーなし

`npm test`20/20・`npm run typecheck`・`npm run build`の成功と合わせて、Phase 6の「No.01⇔No.02往復基盤」は実機で動作することを確認した。コード変更は行っていない。

## 今回の範囲

ユーザー指定のPhase 6は、No.01「はじまりのばしょ」↔No.02「はじまりのまち」DEV_PLACEHOLDER間を往復できる、マップ遷移の最小基盤のみ。No.02の正式な町（建物・NPC・店・会話）、Phase 7以降の要素（戦闘・セーブ・ジャンカード等）は対象外。

## 開始時の確認

- 着手前に`git status`/`git diff`/`git log`を確認。前セッションでPhase 1〜5.5のチェックポイントコミット（`c7e0883`）済みで、作業ツリーはクリーンだった。
- `docs/MAP_FLOW_SPEC.md`でNo.01/No.02が別マップであること、正確な出入口座標・接続条件が未確定（TBD）であることを確認した。
- `docs/DATA_CONTRACTS.md` §8「map」の`connections`概念を参考に、mapId/spawn/exitの最小構造を設計した。
- `src/scenes/StartingPlaceScene.ts` / `src/entities/Player.ts` / `src/systems/InputSystem.ts` / `src/config/startingPlace.ts` / `src/main.ts` を確認し、Phase 5の歩行・Collisionロジックを変更せずに拡張できる形を検討した。

## No.01

DEV_PLACEHOLDER。地面・焚き火・当たり判定・移動速度はPhase 4/5のまま無変更。今回追加したのは右端の出口領域（`DEV_PLACEHOLDER_EXIT`、bounds x:304-320,y:104-224）のみで、正式な出入口座標ではない。

## No.02

DEV_PLACEHOLDER。`StartingTownScene`を新規作成し、単色の地面・Player（Phase5と同一クラス）・No.01へ戻る入口領域（左端、bounds x:0-16,y:104-224）のみを持つ。建物・NPC・店・会話は一切なく、正式な町はPhase 8で別途設計する。

## 変更ファイル

- `src/scenes/StartingPlaceScene.ts`: `MAP_ID`定数、`map.exits`ループでの出口ゾーン生成・`physics.add.overlap`、`handleExit()`、`data.spawnId`に応じた出現位置の分岐、`camera.fadeIn`を追加。地面・焚き火の描画、Phase 5のデフォルト出現位置計算、既存Collider（地面より上のブロッカー・焚き火の当たり判定）は1行も変更していない。
- `src/main.ts`: `StartingTownScene`のimportとScene配列への追加のみ。

## 新規ファイル

- `src/config/maps.ts`: `MapId`型、`SpawnPoint`/`MapExitTrigger`/`MapDefinition`、`MAPS`（No.01・No.02のspawn・exit定義）、`MAP_TRANSITION_FADE_MS`(220ms)。
- `src/systems/MapTransition.ts`: `createExitZone()`（出口の可視マーカー+静的Body生成）、`beginMapTransition()`（入力ロック→`camera.fadeOut`→完了後`scene.start(targetSceneKey, {spawnId})`）。
- `src/scenes/StartingTownScene.ts`: No.02のDEV_PLACEHOLDER Scene。
- `src/config/startingTown.ts`: No.02の地面色等の最小設定。
- `tests/maps.test.mjs`: `MAPS`データの整合性テスト5件。

## Map ID構造

`mapId`（例: `map_01_starting_place`）とPhaserの`sceneKey`（例: `StartingPlaceScene`）を分離し、`MAPS: Record<MapId, MapDefinition>`で一箇所に集約した。将来マップが増えても、Scene名と表示上のマップIDを同一視しない構造にしている。

## Transition構造

各`MapDefinition`が`exits: MapExitTrigger[]`を持ち、`{id, bounds, targetMapId, targetSpawnId}`で1出口を表す。Scene側は`for (const exit of map.exits)`でPhaserの`physics.add.overlap`に登録するだけで、`if (player.x > 302)`のような座標のハードコードはしていない。

## Spawn Point構造

`MapDefinition.spawns: Record<string, SpawnPoint>`（`{x, y, facing}`）。遷移時はSceneの`create(data)`へ`{spawnId}`のみを渡し、受け取り側が`MAPS[MAP_ID].spawns[spawnId]`で実座標を解決する。座標をScene間で直接渡す方式には固定していない。
No.01の「はじめから」到達時のデフォルト出現位置は、Phase 5から継続して焚き火基準のオフセット計算（`STARTING_PLACE_NIGHT.devPlayerSpawn`）を使う。`maps.ts`に重複した絶対座標を持たせず、`data.spawnId`が`fromStartTown`など既知のIDに一致する場合のみ`MAPS`のspawnで上書きする設計にした。

## No.01 → No.02

No.01右端の出口ゾーンにPlayerが重なると`handleExit()`が発火し、`map_02_starting_town`の`fromStartingPlace`スポーン（x:40, y:140, facing:right）へ遷移する。

## No.02 → No.01

No.02左端の出口ゾーンから、`map_01_starting_place`の`fromStartTown`スポーン（x:290, y:165, facing:left）へ遷移する。

## 暗転

`beginMapTransition()`が入力ロック直後に`camera.fadeOut(220ms, 0,0,0)`を開始し、完了イベント（`FADE_OUT_COMPLETE`）を待ってから`scene.start()`する。新Scene側は`create()`冒頭で`camera.fadeIn(220ms, 0,0,0)`を呼ぶ。`OpeningGlitchScene`の演出（横線・ズレ・文字化け等）は再利用せず、単純な暗転のみ。

## 入力ロック

既存`InputSystem.setLocked(true)`を`beginMapTransition()`内で呼ぶ。新Sceneでは`create()`のたびに新しい`InputSystem`インスタンスを生成するため（Phase 1〜5と同じパターン）、ロック状態は引き継がれず自動的に「解除」された状態で始まる。

## Player再利用

`src/entities/Player.ts`はNo.01・No.02の両方で同一クラスをそのまま使用。No.02専用のPlayer実装は作っていない。

## Collisionへの影響

No.01の既存Collider（地面より上のブロッカー、焚き火の当たり判定）、World bounds、移動速度・優先規則は無変更。出口ゾーンは`physics.add.overlap`（通過可能・重なり検知のみ）であり、`physics.add.collider`ではないため既存の衝突/歩行不可判定を邪魔しない。

## 自動テスト

`tests/maps.test.mjs`（5件）:
- 各mapが空でない`sceneKey`を持つ
- 各exitの`targetMapId`/`targetSpawnId`が実在するmap/spawnを指す
- 出口boundsが幅・高さとも正の矩形
- No.01↔No.02の往復が互いの到着spawnへ解決する
- 未知のspawn IDへのルックアップは`undefined`になる（Scene側の安全なフォールバック判定が成立する前提を保証）

## npm test

20/20成功（既存15件 + 今回の5件）。

## typecheck

`npm run typecheck`: 成功。

## build

`npm run build`: 成功。`dist`のバンドルに`map_01_starting_place`・`handleExit`等が含まれることを`grep`で確認。

## ブラウザ確認

Phase 6.1でユーザーが通常のChrome/Edgeで手動確認し、上記「Phase 6.1 ランタイム検証」の通りすべて正常と報告された。以下はPhase 6実装時点（Claude Code側）の記録。

**Phase 6実装時のセッションでは、Browserペインがホストアプリ側で非表示（hidden）の状態が続き、実際のキー操作を伴う対話的確認を完了できなかった。** 正直に経過を記録する。

- `vite preview`（静的ビルド）で新規タブを作成し検証を試みたが、`window.requestAnimationFrame`が3〜23秒待っても一度も発火しないことを直接計測で確認した。`tabs_context`は一貫して「The Browser pane is currently hidden.」を返しており、ホストUI側でBrowserペインが表示されていないためPhaserの描画ループ自体が進行していないと判断した。
- 原因切り分けのため一時的なデバッグコード（`BootScene`への`?debugScene=`クエリ分岐、`StartingPlaceScene`/`OpeningGlitchScene`/`Player`への`console.log`）を追加して検証し、**`StartingPlaceScene.create()`が例外なく完走し、想定どおりの位置（焚き火基準128,156）にPlayerが生成され、出口ゾーンも登録されることをconsoleログとcanvasピクセル読み取りの両方で確認した。** これによりPhase 6のScene初期化コード自体に構文・実行時エラーがないことは検証済み。
- 一方、`requestAnimationFrame`が停止しているため、実際の移動・出口オーバーラップ・Scene遷移が発生する瞬間を対話的に再現・確認することはできなかった。デバッグコードはすべて元に戻し、最終ビルドのハッシュが最初のクリーンビルドと一致することを確認した。
- 過去のPhase（1〜5.5）ではBrowserペインが表示された状態で同種の検証に成功しており、今回のコード変更が原因で描画が止まっているわけではないと判断している。

## missing texture

Phase 6.1のユーザー確認で0件（表示崩れなしと報告）。ビルド出力に新規画像は含まれておらず、`Graphics`/`Rectangle`のみで構成している。

## console error

Phase 6.1のユーザー確認で「目立つエラーなし」と報告。

## Phase 7前に残っているTBD

- No.01/No.02の正式な出入口座標（現在は両方ともDEV_PLACEHOLDER_EXIT）。
- No.02の正式な町のデザイン・NPC・会話（Phase 8）。
- 暗転時間(220ms)・入力ロックの体感は人間による調整が必要。
- iPhone Safari実機確認は引き続き未完了。

PHASE 6 STATUS:
PASS
