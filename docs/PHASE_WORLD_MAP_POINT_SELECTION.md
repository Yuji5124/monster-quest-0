# ワールドマップ目的地選択（通常導線統合）

最終更新: 2026-09-18 JST

## 状態

**PARTIAL — CURRENT背景、通常のNo.01／No.02往復、目的地選択・拡大・ローカルマップ遷移、データ定義のロック表示を実装。SaveSystem接続とNo.03以降は未着手。**

通常起動では、No.01東端またはNo.02西端の出口が `WorldMapScene` を開く。`?worldMapTest=1` は同じSceneを単独で確認するためのDEV入口である。既存の徒歩 `FieldScene`、Tiledマップ、関連テスト・アセットはlegacyとして保持するが、通常の地域間導線には使用しない。

```text
http://127.0.0.1:5173/?worldMapTest=1
```

## 操作と画面遷移

1. 地図上の目的地をクリックまたはタップして選択する。方向キーでも選択を移せる。
2. 選択中の地点は地図が拡大表示される。
3. 同じ地点をもう一度クリック / タップ、または `Z` / `Enter` で決定する。
4. `Esc`で選択を解除し、地図全体表示へ戻る。拡大中も別地点をクリック／タップまたは方向キーで選べる。
5. 短い暗転後、選択先のローカルマップSceneへ遷移する。

初期データはNo.01「はじまりのばしょ」とNo.02「はじまりのまち」の2地点だけである。どちらも既存のローカルマップSceneと安全な `fromWorldMap` spawnを参照する。世界地図上を主人公が徒歩で移動したり、Collisionを作ったりはしない。

目的地は `visible` と `unlockFlag` をデータとして持つ。`visible: false` は非表示、表示済みで未解放の地点は`？？？`とし、クリック・タップ・キー選択では決定できない。No.01 / No.02は初期導線として常に選択可能である。No.03以降はSaveSystemの `flags` を渡すよう差し替え、解放状態をSceneへ直書きしない。

## アセットとデータ

```text
assets/maps/world_map/
├─ background.png       # 1448x1086、4:3の高解像度背景
├─ map.json             # 背景寸法、世界地図の形式、ローカル出口→現在地ポイント
└─ destinations.json    # 目的地ポイント / visible / unlockFlag / mapId / spawnId
```

背景はCURRENTのオリジナル高解像度2D世界地図で、実行時は4:3の960×720画面へLINEARフィルタで縮小表示する。添付された世界地図は情報密度・用途の参考にとどめ、地形、配置、固有意匠を複製しない。

2地点の `x` / `y` は `DEV_PLACEHOLDER_POSITION` であり、No.03〜No.20の正式な世界地理上の位置を決めるものではない。

## 実装

- `src/scenes/WorldMapScene.ts` — 通常導線用。背景表示、選択マーカー、拡大カメラ、キーボード / ポインタ操作、暗転遷移を担当する。
- `src/scenes/WorldMapTestScene.ts` — `WorldMapScene` のDEV入口。クエリによる将来の解放フラグ検証だけを分離する。
- `src/systems/WorldMapData.ts` — Phaser非依存で `map.json` / `destinations.json` を検証・読込する。
- 目的地は `visible` / `unlockFlag` / `targetMapId` / `targetSpawnId` を持ち、`map.json` の `entryDestinationIds` がローカル出口から現在地ポイントを解決する。Scene名、地点座標、進行条件をSceneへ直書きしない。
- `src/main.ts` の通常Scene列に `WorldMapScene` を登録する。`maps.ts` の出口は `kind: "world-map"` と `worldMapEntryId` だけを持つ。

## 検証範囲

- 背景の4:3比率、実ファイル、目的地データの読込をテストする。
- `visible`、`unlockFlag`、`？？？`ロック表示、ローカル出口→世界地図入口→目的地→安全なspawnの往復をテストする。
- ブラウザでNo.01 / No.02から世界地図へ入り、選択、拡大、決定、両ローカルマップへの遷移を確認する。

## 次に必要なこと

1. 正式な世界地理に合わせて、No.03以降をストーリー順に少数ずつ追加し、目的地座標と解放条件をデータ化する。
2. SaveSystemの `flags` を接続し、No.03以降のロック状態を進行データから導出する。
3. No.01東端の出口アイコン・短い出発演出を、No.01の背景画像正本化と合わせて視覚調整する。
4. タッチの押しやすさ、ロード時間、メモリをiPhone Safari実機で測定する。
