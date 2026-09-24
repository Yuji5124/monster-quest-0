# ワールドマップ目的地選択（通常導線統合）

最終更新: 2026-09-22 JST

## 状態

**PARTIAL — CURRENT背景上へ正式No.01〜20を配置済み。No.01〜07の既存ローカルマップだけを遷移可能とし、No.08〜20は青い`planned`地点として安全に表示する。SaveSystem接続と未実装ローカルマップは未着手。**

通常起動では、No.01画像マップの北門EventまたはNo.02西端の出口が `WorldMapScene` を開く。`?worldMapTest=1` は同じSceneを単独で確認するためのDEV入口である。既存の徒歩 `FieldScene`、Tiledマップ、関連テスト・アセットはlegacyとして保持するが、通常の地域間導線には使用しない。

```text
http://127.0.0.1:5173/?worldMapTest=1
```

## 操作と画面遷移

1. 地図上の目的地をクリックまたはタップして選択する。方向キーでも選択を移せる。
2. 選択中の地点は地図が拡大表示される。
3. 同じ地点をもう一度クリック / タップ、または `Z` / `Enter` で決定する。
4. `Esc`で選択を解除し、地図全体表示へ戻る。拡大中も別地点をクリック／タップまたは方向キーで選べる。
5. 短い暗転後、選択先のローカルマップSceneへ遷移する。

`destinations.json`は物語順No.01→20で管理する。No.01〜07は現行`MAPS`、登録済みScene、`fromWorldMap` spawnを確認した`implemented`地点である。No.08〜20は`planned`で、Scene/spawnを持たず、タップしても「まだ行くことができない」と表示するだけで遷移しない。世界地図上を主人公が徒歩で移動したり、Collisionを作ったりはしない。

目的地は `visible` と `unlockFlag` をデータとして持つ。`visible: false` は非表示、表示済みで未解放の地点は`？？？`とし、クリック・タップ・キー選択では決定できない。No.01 / No.02は初期導線として常に選択可能である。No.03以降はSaveSystemの `flags` を渡すよう差し替え、解放状態をSceneへ直書きしない。SaveSystemが `flags` を持つまでの暫定として、`map.json` の `developmentUnlockedFlags` を `readInterimUnlockedFlags()` 経由で本番も使う（2026-09-19、ビーエのむらが選択可能）。

## アセットとデータ

```text
assets/maps/world_map/
├─ background.png       # 1448x1086、4:3の高解像度背景
├─ map.json             # 背景寸法、世界地図の形式、ローカル出口→現在地ポイント
└─ destinations.json    # 目的地 / 実装状態 / visible / unlockFlag / target / labelOffset
```

背景はCURRENTのオリジナル高解像度2D世界地図で、実行時は4:3の960×720画面へLINEARフィルタで縮小表示する。添付された世界地図は情報密度・用途の参考にとどめ、地形、配置、固有意匠を複製しない。

No.01〜20の`x` / `y`は、CURRENT `background.png`（1448×1086）を見て地形・港・湖・森林・雪山・砂漠・火山・湿地のランドマークへ合わせた`FINAL_POSITION`である。ラベルだけは`labelOffset`で個別調整できる。

## 実装

- `src/scenes/WorldMapScene.ts` — 通常導線用。背景表示、選択マーカー、拡大カメラ、キーボード / ポインタ操作、暗転遷移を担当する。見た目の小さいCircleとは別に、地図全体の透明Zoneが最寄り地点を判定するため、iPhone Safariの縮小表示でも物理44px以上のタップ領域を保ち、隣接地点のZone重なりにも依存しない。
- `src/scenes/WorldMapTestScene.ts` — `WorldMapScene` のDEV入口。クエリによる将来の解放フラグ検証だけを分離する。
- `src/systems/WorldMapData.ts` — Phaser非依存で `map.json` / `destinations.json` を検証・読込する。
- 目的地は `implementationStatus` / `visible` / `unlockFlag` / `targetMapId` / `targetSpawnId` / `labelOffset` を持つ。`implemented`だけが遷移可能、`planned`はtargetを`null`にする。`map.json` の `entryDestinationIds` は実際に世界地図へ戻れるローカルマップだけを解決する。Scene名、地点座標、進行条件をSceneへ直書きしない。
- `src/main.ts` の通常Scene列に `WorldMapScene` を登録する。`maps.ts` の出口は `kind: "world-map"` と `worldMapEntryId` だけを持つ。

## 検証範囲

- 1448×1086座標系、20地点、No.01→20の並び、C01/C02/C03を含まないこと、最終配置とラベルoffsetをテストする。
- `implemented`のScene/spawn、安全な往復、`planned`のnull targetと非遷移、`visible`、`unlockFlag`、`？？？`ロック表示をテストする。
- ブラウザで`?worldMapTest=1`を開き、20地点、青い未実装地点、44pxの透明hit area、選択ズームと既存地点の遷移を確認する。

## 次に必要なこと

1. SaveSystemの `flags` を接続し、No.03以降のロック状態を進行データから導出する。
2. No.01北門の出口アイコン・短い出発演出を、No.01背景画像と合わせて視覚調整する。
3. タッチの押しやすさ、ロード時間、メモリをiPhone Safari実機で測定する。
