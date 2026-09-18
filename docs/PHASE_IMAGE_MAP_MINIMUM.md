# 背景画像マップ最小検証（No.01）

最終更新: 2026-09-18 JST

## 状態

**PARTIAL — 新方式の実行時検証は完了、正式No.01への移行は未着手。**

`?mapTest=image-no01` は、正式な [MAP_SYSTEM.md](MAP_SYSTEM.md) の方式がPhaser上で成立するかを一つのマップパッケージで確認するDEV専用Sceneである。通常のタイトル導線、`StartingPlaceScene`、`FieldScene`、No.01のTiled runtime、Tiledアセット、Tiledテストは変更しない。

```text
http://127.0.0.1:5173/?mapTest=image-no01
http://127.0.0.1:5173/?mapTest=image-no01&collisionDebug=1
```

後者は最初からCollisionを表示する。実行中は `D` キーで表示 / 非表示を切り替える。

## 検証パッケージ

```text
assets/maps/starting_place/
├─ background.png  # 1536x1024、BACKGROUND。DEV_PLACEHOLDER
├─ collision.png   # 1536x1024、白=歩行可能 / 黒=歩行不可。DEV_PLACEHOLDER
├─ map.json        # 共通の背景ピクセル座標系と4ファイルのmanifest
├─ events.json     # 北ゲートからNo.02へ移るtransferを1件
└─ objects.json    # blockingなNPCマーカーを1件
```

`background.png` は新方式のレイアウト検証用に生成したオリジナルの仮背景であり、正式No.01の昼版・夜版には昇格していない。`collision.png` はその背景を基に手作業で作った二値マスクである。AI解析による初期生成器は今回の範囲外であり、将来このマスクを置き換えても、Phaser側は生成済みのPNG / 軽量データだけを読む。

## 実装内容

- `src/scenes/ImageMapTestNo01Scene.ts` が5ファイルを個別に読み込む。既存の `FieldScene` や `StartingPlaceScene` を継承・置換しない。
- `src/systems/ImageMapCollisionData.ts` が二値マスクを16pxセル単位で読み、黒セルを結合した矩形へ変換する。`ImageMapCollision.ts` はその矩形だけをPhaser Arcadeの静的BodyとDEV表示へ変換する。画像意味解析は実行時にしない。
- 既存の `Player` と `InputSystem` により、背景上の4方向歩行とカメラ追従を確認する。
- `events.json` の北ゲート領域は `transfer` を1件持ち、既存No.02の安全なspawnへ暗転遷移する。この接続はイベントデータ読込の検証用であり、No.02を背景画像方式へ移行するものではない。
- `objects.json` のNPCは青いDEVマーカーとして配置し、静的Bodyで通行を止める。正式NPCスプライト、会話、状態管理は対象外である。

## 検証

次を実行し、129件のテスト、型チェック、本番ビルドを通過した。

```bash
npm test
npm run typecheck
npm run build
```

追加したテストは、PNGマスクの黒 / 白判定と矩形結合、マップmanifestの4レイヤー参照、転送イベント、Object定義を確認する。

## 次に必要なこと

1. 正式採用したNo.01背景（夜版と昼版）へ `DEV_PLACEHOLDER` 背景・マスクを置き換える。
2. 背景解析から初期Collision Maskを作る制作時ツールを作り、MQ0 Map Editorで人間が修正できるようにする。
3. Objectの正式スプライト、会話、宝箱などを既存イベント契約へ接続する。
4. 新方式の2マップ目を追加する前に、実機iPhone Safariでメモリ、マスク変換時間、当たり判定の負荷を測定する。
5. ポイント選択式ワールドマップは別作業として実装し、既存の`FieldScene`はlegacyとして保持する。
