# No.01「はじまりのばしょ」StartingPlaceScene 本番Tiled化

最終更新: 2026-09-17 JST

## ステータス: **DONE — 通常の「はじめから」導線でStartingPlaceSceneが正式Tiled No.01昼マップを表示し、主人公がCollision付きで歩ける状態になった**

`docs/PHASE_NO01_TILED_PHASER_INTEGRATION.md`で`?mapTest=no01`のDEV専用ルートに実装したTiled読み込みを`src/systems/TiledMapRuntime.ts`として共通化し、`src/scenes/StartingPlaceScene.ts`(通常のTitle→Opening→StartingPlace導線の到達先)がGraphics DEV_PLACEHOLDER地形描画に代えて同じ正式Tiledマップを表示するようにした。`MapTestNo01Scene`は削除せず、単体テスト用として維持している。

## 共通化したTiled処理

`src/systems/TiledMapRuntime.ts`(新規)に、`MapTestNo01Scene.ts`が実装していた以下を移設し、両Sceneが同じ関数を呼ぶ形にした(コピペ二重実装なし):

| 関数 | 役割 |
|---|---|
| `preloadTiledMap(scene, def)` | tilemap JSON + 5tileset画像のload |
| `createTiledMap(scene, def, {collisionDebug})` | tilemap構築・tileset結合・Ground/Terrain/Buildings描画・Collision Layer(判定専用、mq0Labelから動的にGID解決)・world bounds設定 |
| `findPlayerSpawn(eventsLayer)` | Events Layerの`playerSpawn`オブジェクトの中心座標を返す |
| `formatTiledProperties(obj)` | Tiled Object Propertiesを人間可読な文字列にする |
| `findGidByLabel(tilesets, label)` | `mq0Label`からGIDを動的解決(前Phaseで発見したCollisionバグの修正を含む) |
| `createTiledEventZones(eventsLayer, types, createZoneBody)` | exit/eventタイプのオブジェクトから重なり判定ゾーンを作る |
| `updateTiledEventZones(scene, zones, playerBody, onEnter)` | 毎フレームの進入検出(edge-trigger) |

マップ定義データ(`NO01_DAY_TILEMAP_KEY`/`NO01_DAY_TILESETS`等)は`src/config/mapTest.ts`から**DEV専用ではない**`src/config/no01TiledMap.ts`へ改名・移設した(内容はDEV/本番共通の正本データであるため)。過剰な抽象化(汎用マルチマップシステム等)はせず、既存の`src/systems/*.ts`の並びにNo.01専用ヘルパーとして追加するに留めた。

## StartingPlaceScene変更内容

- `preload()`を新設し、`preloadTiledMap(this, NO01_DAY_MAP_DEF)`を呼ぶ(旧実装はpreload不要だった)。
- `create()`内で`createTiledMap()`を呼び、Ground/Terrain/Buildings/Collisionの各TilemapLayerを生成。Collisionは非表示のまま判定にのみ使用、`?collisionDebug=1`で可視化(`MapTestNo01Scene`と全く同じ仕組みを再利用)。
- PlayerSpawn: `data?.spawnId`が指定され`MAPS[MAP_ID].spawns`に実在する場合は**そちらを優先**(No.02/Fieldからの帰還等、既存のNo.01⇄Field導線を壊さないため)。未指定時(通常の「はじめから」の場合)は`findPlayerSpawn(eventsLayer)`でTiledの`playerSpawn`オブジェクトの中心座標を使う。**ハードコードされた座標・焚き火矩形からのoffset計算は廃止**。
- 主人公は既存の`Player`/`InputSystem`/`PlayerMovement`を無変更のまま再利用。表示サイズ(30×42px)・速度(180px/秒)は変更していない(タロサ・ミレイと共通の基準サイズを維持)。
- Camera: `configureMapCamera`を`map.widthInPixels`/`map.heightInPixels`(1536×1152、ハードコードなし)で設定。
- Events: `exit_north`/`exit_east`/`event_campfire`を`createTiledEventZones`+`updateTiledEventZones`で検出。**本番遷移・本イベントは実装していない**(検出ログのみ)。通常プレイへのログ大量出力を避けるため、`import.meta.env.DEV`(`GameStateRepository.ts`と同じ既存パターン)でガードし、**本番ビルドではconsole.logが一切出ない**(ビルド出力の`dist/assets/*.js`を検索し該当コード自体が含まれないことを確認)。
- 既存のNo.01→Field遷移(`src/config/maps.ts`の`map.exits`、`beginMapTransition`)は**完全に無変更のまま維持**。Tiledの`exit_north`/`exit_east`オブジェクトへの本格紐付けは行っていない(下記「既知の課題」参照)。

## 旧DEV描画削除内容

- `StartingPlaceScene.ts`から、Graphics(`add.graphics`)による地面矩形・焚き火矩形の描画、`addBlocker`による手動Collision矩形2枚を削除。
- `src/config/startingPlace.ts`(`STARTING_PLACE_NIGHT`定義、Graphics描画専用のPLACEHOLDER仕様)を削除。**Gitで追跡済みのファイルのため、`git log`/`git show`で内容は引き続き参照可能**(いきなり不可逆に消えるわけではない)。他のどのファイルからも参照されていないことを事前に確認済み。

## 既存冒頭導線

`main.ts`のScene登録順序・`OpeningGlitchScene.ts`は無変更。Title→「はじめから」→OpeningGlitchScene→StartingPlaceSceneの流れそのものは維持し、**到達したStartingPlaceSceneの中身だけ**がGraphics DEV_PLACEHOLDERから正式Tiled表示に変わった。

## 昼/夜の扱い

No.01夜/昼マップを二重管理しない方針を維持し、**Nightマップを別途作成していない**。今回はまず「本番StartingPlaceSceneで正式Tiledマップ(昼版データ)が表示される」ところまでに留め、夜の演出(overlay/tint等)は実装していない(指示通り、次Phase以降で検討)。

## 既知の課題(次Phase持ち越し)

1. **Tiledのexit_north/exit_eastは検出のみ**。既存の`toField`遷移(config駆動、`src/config/maps.ts`)とは別物のまま。既存`toField`のトリガー座標(x=912,y=312,w=48,h=360)は、以前の960×720サイズのDEV_PLACEHOLDER世界向けに決められた値で、新しい1536×1152のTiledワールド内では森の中程という特に意味を持たない位置になっている。今回は「勝手なtargetMapを設定しない」「exitの本格遷移は作り直さない」という指示のため、座標・接続先とも一切変更していない(動作確認のみ実施、下記参照)。
2. Y-sort(樹冠と主人公の前後関係)は引き続き未実装(`setDepth(1000)`で常に最前面、既知の見た目の不整合)。
3. 正式主人公sprite・タロサ・ミレイは未着手。表示サイズは変更していない。
4. 夜演出(camera overlay/tint等)は未着手。
5. campfire本イベント・NPC・戦闘接続は未着手。

## 検証結果

### mapTest回帰
`?mapTest=no01`を再確認し、通常版(StartingPlaceScene)と全く同じ`TiledMapRuntime`を経由しているため、マップ・Spawn座標(592,656)・Collision挙動・レイヤー構成に差異が無いことを確認した(同一の座標・同一のイベント検出ログを実機で確認)。

### ブラウザ実機確認(通常URL: `http://localhost:5173/`)
このBrowserペインは背景化されると`requestAnimationFrame`が完全停止する(前Phaseで確認済み)。加えて今回、**PhaserのTweenManagerは`Date.now()`ベースの実時間で進行する**(渡した`delta`引数を使わない)ことが判明し、Title画面の確定演出やOpeningGlitchSceneの5秒演出のような**tween経由のシーン遷移**は、前Phaseの「合成clockで`game.step()`を連打」する方式だけでは進行しないと分かった。これに対し、`await`で実時間を挟みながら`game.step(performance.now(), frameMs)`を呼ぶ実時間ペース版のstep関数を新たに使うことで、Title→「はじめから」確定→OpeningGlitchScene→StartingPlaceScene、という実際のscene遷移をすべて本物のコードパスで進行させることができた。StartingPlaceScene到達後の物理・Collision検証は、既存の(実時間を使わない)合成clock方式に戻すことで前Phaseと同じ精度を確保した。

確認できたこと:
- 正式Tiled No.01が表示(grass/道/木/props/橋/川/崖/滝/広場/北入口、欠落なし)。
- 主人公がTiledの`playerSpawn`(592,656、矩形中心)へスポーン(ハードコードなし)。
- 4方向歩行。
- 木/log(焚き火脇)への衝突。
- 川(橋以外)への衝突。
- 外周(西側森)への衝突。
- 橋通行可能(2タイル分のデッキ中心を通行、前Phaseと同じ既知の制約: Body高さ42pxが欄干行にわずかにかかる箇所がある)。
- 焚き火周辺歩行可能、`event_campfire`検出。
- 北入口到達可能、`exit_north`検出。
- `exit_east`検出(橋を渡って到達)。
- 既存の`toField`(config駆動のNo.01→Field遷移)がoverlap検出→`transitioning=true`まで正しく動作することを確認(実際のFieldSceneへの画面遷移はtweenのfadeOutが絡むため、本Phaseの検証範囲外である「遷移完了後の見た目」までは追っていないが、既存の往復ロジック自体は`tests/maps.test.mjs`のデータレベルテストで担保されている)。
- console error 0件(通常URL、`?collisionDebug=1`、`?mapTest=no01`のいずれでも)。

## テスト・検証コマンド

- `npm test`: **120/120 PASS**(既存112 + 新規8: `tests/tiledMapRuntime.test.mjs`)。
- `npm run typecheck`: PASS。
- `npm run build`: PASS。`import.meta.env.DEV`でガードした`window.__game`フックが本番バンドルから完全に除去されていることを`dist/assets/*.js`の grep で確認済み。

## ドキュメント更新

- `docs/PROJECT_STATUS.md`: `NO.01 STARTING PLACE PRODUCTION = COMPLETE`を記録。
- `docs/CURRENT_WORK.md`: 本Phaseの作業範囲を追記。
- 本ファイル(新規)。

## PHASE STATUS

```
NO.01 TILED VISUAL = COMPLETE
NO.01 PHASER DEV = COMPLETE
NO.01 STARTING PLACE PRODUCTION = COMPLETE
```

次Phase候補: Tiledのexit_north/exit_eastを実際のマップ遷移へ接続する仕様確定、夜演出、Y-sort、正式主人公sprite。
