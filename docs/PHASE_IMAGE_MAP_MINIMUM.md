# No.01 背景画像マップ統合

最終更新: 2026-09-19 JST

## 状態

**PARTIAL — No.01の通常導線は背景画像方式へ移行済み。2026-09-19に背景をユーザー提供の夜版(1448×1086)へ差し替え済み。昼版への切替・正式Object・iPhone Safari実機確認は未完了。**

No.01「はじまりのばしょ」は、[MAP_SYSTEM.md](MAP_SYSTEM.md) の `BACKGROUND` / `COLLISION` / `EVENT` / `OBJECT` 方式を最初に通常導線へ統合したローカルマップである。`StartingPlaceScene` はTiledのTMJ/TMXを読まない。既存Tiled版は `LegacyTiledStartingPlaceScene` と `?mapTest=no01` の `MapTestNo01Scene` にlegacyとして保持する。

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/?mapTest=image-no01
http://127.0.0.1:5173/?mapTest=image-no01&collisionDebug=1
```

通常URLはTitle → Opening → No.01画像マップへ進む。2番目は同じ正式パッケージだけを起動する確認用URL、3番目は最初からCollisionを表示する。DEV時は `D` キーでも表示 / 非表示を切り替えられる。

## 正式パッケージ

```text
assets/maps/starting_place/
├─ background.png  # CURRENT BACKGROUND(夜版)、1448x1086、LINEAR表示
├─ collision.png   # CURRENT COLLISION、同寸法、白=歩行可能 / 黒=歩行不可
├─ map.json        # formatVersion / 背景ピクセル座標 / 4レイヤー参照
├─ events.json     # 北の小道 → WorldMapScene のworld-map Event
└─ objects.json    # CURRENT OBJECTレイヤー。現時点は空配列
```

背景・Collision・Event・Objectの座標は、背景左上を `(0, 0)` とする同一の1448×1086ピクセル座標で管理する(実プレイでは`map.json`の`worldScale`で1.5倍に拡大、`MAP_SYSTEM.md`参照)。背景は高解像度のまま保管し、ゲーム表示時はLINEARフィルタで縮小する。

`collision.png` は人間が修正できる二値マスクである。実行時に画像意味解析やAI認識を行わず、Scene作成時に黒セルを`map.json`の`collisionCellSize`(現在は全マップ8px。2026-09-19に16pxから細分化)単位で結合した静的Arcade Physics Bodyへ変換する。

## 実装内容

- `StartingPlaceScene.ts` はmanifestの寸法を背景・Collisionと照合してから読み込む。不一致はエラーとして止める。
- 通常開始位置と世界地図からの復帰位置は `maps.ts` のNo.01 spawnデータで管理する。Sceneに座標は直書きしない。
- 北門の遷移領域は `events.json` の `world-map` コマンドで `from_starting_place` を指定する。`world_map/map.json` の `entryDestinationIds` が世界地図上の現在地を解決する。
- `WorldMapScene` でNo.01を選ぶと、No.01の `fromWorldMap` spawnへ復帰する。
- `objects.json` は空でも4レイヤー契約を満たす。NPC、宝箱、扉など状態を持つ要素を追加する際は、背景へ焼き込まずこのレイヤーへ追加する。

## legacy Tiledの扱い

`tiled/maps/mq0_map01_starting_place_day.tmj`、tileset、`TiledMapRuntime`、Tiledテスト、`MapTestNo01Scene`は削除しない。通常の `StartingPlaceScene` と同じkeyでTiledを読み続けないよう、旧ランタイムは `LegacyTiledStartingPlaceScene` に分離した。これは画像マップをTiledから自動変換したものではない。

## 検証

次を実行する。

```bash
npm test
npm run typecheck
npm run build
```

テストは4レイヤー参照、CURRENT manifest、北門の `world-map` Event、世界地図入口ID、黒 / 白Collisionの矩形変換を確認する。

## 未完了

1. ~~オープニング用No.01夜背景~~ → 2026-09-19に採用済み(夜版がCURRENT)。同一構図の昼版画像(`はじまりのばしょ.png`)を使った夜→昼の切替Eventは未実装。
2. 背景画像からCollisionの初期案を生成する制作時ツールと、MQ0 Map Editorでの人間修正フローを実装する。
3. 正式NPC、宝箱、出入口演出などのOBJECTを追加し、背景に焼き込まれた静的表現と分離する。
4. iPhone Safariで高解像度背景の読み込み時間、メモリ、Collision変換時間、タッチ操作を確認する。
