# Phase 8.6 荒フィールド実装結果

最終更新: 2026-09-13 JST

**DONE — Phase 8.6限定範囲。正式世界地理・Tiled実装の完成を意味しない。**

## 作業前監査

README / AGENTS / CLAUDE、PROJECT_STATUS / CURRENT_WORK / INDEX、GAME_SPEC / CREATIVE_DIRECTION / OPENING_SPEC / STORY_FLOW / MAP_FLOW_SPEC、AI_EXECUTION_PROTOCOL / PHASER_ARCHITECTURE / DATA_CONTRACTS / ASSET_INDEX / asset_catalog / TBD_REGISTRY / DEFINITION_OF_DONE、Phase 8.5記録と関連UI・移動仕様を確認。

FieldScene / field / maps / MapCamera / MapTransition / Player / StartingPlaceScene / StartingTownScene / InteriorScene / main / 既存testsを確認。git status・diff・statを確認し、未コミットのPhase 6〜8.5、タイトル・解像度変更を保持。作業前の既存63テストは全件成功。既存src/testsの開始時SHA256と照合すると、今回変更した既存コードはfield.ts / maps.ts / FieldScene.tsのみ。作業途中に見えたtiled/、tools/mq0-map-ai/、.gitignore等の別作業には手を加えていない。

## 使用したREFERENCE画像

- サイズ: **1448×1086、RGB PNG**。依頼文のRGBAとは異なるが、背景表示に支障なし。
- 分類: 台帳REFERENCE、実行用途DEV_REFERENCE_BACKGROUND。CURRENTへ昇格しない。
- 保存場所: `assets/maps/reference/world/mq0_world_map_001_4813475e07.png`。
- 依頼文中の「(1)」付き別名ではなく、ユーザーが添付した上記実在パスを使用。
- SHA256: `4813475e0740357aed595f54d6e04fa038bbfced1e79d59523844178dcd781da`。
- 原本のコピー・移動・加工・削除なし。Viteの相対new URL参照で配信し、本番buildではハッシュ付きファイルへ出力。
- 旧台帳の未存在パスworld_map_reference.pngを実在パスへ修正。画像内の地名は推測で追加しない。

目視できる主要要素は南西の町、中央南の町、西側と湖上の城、北西の雪山・山脈、東の荒地、北東の城、南東の洞窟、複数の川・橋。No.01/No.02以外の正式番号・名称・遷移先は割り当てていない。

## Field runtimeサイズ

1920×1440（既存DISPLAYの2倍）を維持。内部表示960×720、Player 180px/秒・30×42、4方向移動を維持。

## REFERENCE→runtime座標変換

`runtimeX = referenceX / 1448 * 1920`、`runtimeY = referenceY / 1086 * 1440`。
両軸倍率は240/181 ≈ 1.325967。同じ4:3なので変形・余白・トリミングなし。FieldSceneの背景も同じ倍率。数値変換はfield.tsへ集約。

## No.01 world position

- REFERENCE座標: (835,630)。runtime: (1107.18,835.36)。
- 分類: DEV_PLACEHOLDER_WORLD_POSITION。
- 根拠: 中央東寄りの森付近を開発用の入口候補とした。No.01の森・水辺の方向性と照合したが、正本にこの世界座標の確定はない。
- 正式mapId: map_01_starting_place。Field帰還地点は別座標(780,630) → (1034.25,835.36)。

## No.02 world position

- REFERENCE座標: (240,780)。runtime: (318.23,1034.25)。
- 分類: DEV_PLACEHOLDER_WORLD_POSITION。
- 根拠: 南西の町の絵を目印に仮対応。既存の初期町としての役割のみが正本で、画像上のこの町との対応は未確定。
- 正式mapId: map_02_starting_town。Field帰還地点は別座標(295,780) → (391.16,1034.25)。

## No.01ランドマーク

金色の単純矩形。REFERENCE 24×24相当、黒い縁取り。開発用の目印で正式な建物や素材ではない。中心と入口のデータをWORLD_LOCATIONSへ集約。

## No.02ランドマーク

淡色の単純矩形。No.01と同じ寸法。町の絵の近くに表示し、文字ラベルや独自名は追加しない。

## No.01 → Field

No.01右側の既存toFieldからFieldScene / fromStartingPlaceへ。Field帰還座標(1034.25,835.36)、左向き。No.01側のScene・出口形状は維持。

## Field → No.01

No.01ランドマーク周辺の48×48 REFERENCE相当の入口からmap_01_starting_place / fromFieldへ。ローカル座標(870,495)、左向きを維持。

## Field → No.02

No.02ランドマークの入口からmap_02_starting_town / fromFieldへ。ローカル座標(120,420)、右向きを維持。

## No.02 → Field

No.02左側の既存toFieldからFieldScene / fromStartingTownへ。Field帰還座標(391.16,1034.25)、右向き。

## No.01→No.02歩行ルート

REFERENCE座標で、No.01帰還点(780,630) → (780,690) → (440,690) → (440,768) → (295,768) → (295,780) → No.02入口(240,780)。南へ進み、南西の橋の中央を西へ渡る。逆順でも往復可能。

FIELD_WALK_ROUTEはQA用の確認経路のみ。自動歩行・Collision解除は実装していない。全区間を30×42のPlayer全体でruntime 1px刻みに検証し、ブラウザの実キー入力でも往復した。

## Field描画

既存横帯の仮地形をREFERENCE背景へ置換。NEAREST、アスペクト比維持。背景→目印→Playerの順。静的背景で、船・他の町・城・洞窟は絵として見えるだけ。

## Field Collision

fieldTerrain.tsに手指定の大まかな陸地輪郭と山・崖・湖・川・南西の橋を分離。RoughFieldCollision.tsがREFERENCE 24pxセル中心で通行可否を評価し、横に連続するセルを結合して**167個**の不可視Static Bodyへ変換する。Playerの既存Arcade Colliderで処理。

24pxは今回の荒い判定用で正式タイルサイズではない。海岸・地形の絵とピクセル単位では一致しない。すべての橋・島・細い道の通行は保証せず、今回の2地点往復だけを通行保証する。画像解析や本格的地形エンジンは追加していない。

## Cameraへの影響

MapCamera.ts無変更。Player生成後に既存configureMapCameraを呼び、lerp=1、bounds、roundPixelsを維持。Field帰還時に即座に正しい位置を表示。ブラウザで追従・左端/下端のクランプ・リサイズを確認。

## MapTransitionへの影響

MapTransition.ts無変更。mapId / spawnId、入力ロック、220ms暗転、Scene内transitioningフラグをそのまま再利用。接続先はNo.01とNo.02のみ。

## 即再入場防止

Field復帰spawnは入口中心から55 REFERENCE px離し、Player全体と全入口が重ならないことをテスト。

回帰確認で、既存の建物帰還spawnはPlayer中心だけが入口外で、体が9px重なって即再入場する不具合を再現。maps.tsの6つのy座標のみを修正した。上段は210→234、下段は510→486。ドアとPlayerの間に15px確保。6棟すべてを実際に入退室して帰還後550ms以上安定することを確認。新しい再入場タイマーや全体遷移の書き換えは不要だった。

## Tiled移行を意識したデータ構造

- field.ts: 背景参照、runtime bounds、REFERENCE変換、仮world position、入口、帰還spawn。
- fieldTerrain.ts: 描画に依存しない荒地形データ。
- RoughFieldCollision.ts: 地形→Arcade矩形への小さな変換。
- maps.ts: 既存mapId・spawnId・遷移契約。
- FieldScene.ts: 読み込み、描画、Player、Camera、既存遷移の接続。

Tiled導入時は地形変換と描画を置換できるが、今回Tiled読み込みや正式タイル寸法は実装・確定しない。

## 正式素材

CURRENT: 既存のタイトルロゴ・タイトル背景を維持。新規CURRENTなし。

## REFERENCE

上記世界地図1枚。台帳のstatusはreferenceのまま。

## DEV_PLACEHOLDER

ROUGH_FIELD / REFERENCE_BASED、DEV_REFERENCE_BACKGROUND、DEV_PLACEHOLDER_WORLD_POSITION、DEV_PLACEHOLDER_LANDMARK、DEV_PLACEHOLDER_COLLISION。既存Player・No.01・No.02・NPC・内部の仮実装も維持。

## TBD

正式world position、地理対応、入口アイコン、正式地形・通行幅・橋の採否、正式タイル/主人公素材、地形の見え方と移動テンポ。追加の正式地名・設定は作っていない。

## 自動テスト

新規tests/roughField.test.mjsに8件。画像SHA/寸法、変換、地点とmapId、Body全体の入口非重複、設定の一元化、全徒歩経路、主要地形と橋、6棟の帰還Bodyを検証。既存63件は変更せず保持。

## npm test

**71/71 PASS**（既存63 + 新規8）。

## typecheck

**PASS**。npm run typecheck、最終npm run build内のtsc --noEmitとも成功。

## build

**PASS**。Phaser 3.90.0 / Vite 8.3.0を変更せず、38 modulesをbuild。画像はdist/assetsへ出力され、存在しない画像を参照しない。REFERENCE画像2,927.56kB、JS 1,227.64kB（gzip328.54kB）。500kB超のchunk警告あり。今回はコード分割や画像圧縮は対象外。

## runtime確認

PlaywrightでローカルChromeをheadless起動し、開発サーバーのゲームを検証。観測用game参照はブラウザテスト時にmainレスポンスへ一時追加し、製品コードへは追加していない。

- Title → ボタン → メニュー → はじめから → 約5秒Opening → No.01。
- 以後はScene強制変更・ワープなしの方向キー操作でNo.01→Field→No.02→Field→No.01。
- NPC会話開始、ページ送り、終了、会話中の移動停止。
- どうぐやは上記旅程の実歩行で入退室。追加6棟確認は各建物前をテスト開始状態にし、実キーで入退室。設定された帰還座標への一致と安定を確認。
- 山・海・橋以外の川はテスト開始座標から方向キーを押し、境界で停止、長押し継続でも侵入しないことを確認。
- 960×720、375×812、1280×720ブラウザで4:3表示・画面内への収まりを確認。Fieldスクリーンショットも目視確認。
- iPhone Safari実機・タッチ操作は今回未検証。縦長Chrome検証をSafari合格とは扱わない。

ローカル検証補助と画像: `.qa/verify-phase86.cjs`、`.qa/verify-phase86-extra.cjs`、`.qa/phase86-browser.json`、`.qa/phase86-extra.json`、`.qa/phase86-field-start.png`、`.qa/phase86-field-375.png`。これらはignoredのローカルQA出力で製品機能ではない。操作の再確認はnpm run devで起動し、上記徒歩ルートを使用する。

## console error

0件。

## missing texture

0件。

## 404

0件（主旅程・追加回帰とも）。

## 変更ファイル

既存実装: src/config/field.ts、src/config/maps.ts、src/scenes/FieldScene.ts。
新規実装: src/config/fieldTerrain.ts、src/systems/RoughFieldCollision.ts。
新規テスト: tests/roughField.test.mjs。
文書・台帳: README.md、docs/PROJECT_STATUS.md、CURRENT_WORK.md、CONTENT_MATRIX.md、MAP_FLOW_SPEC.md、INDEX.md、ASSET_INDEX.md、assets/asset_catalog.json、本書。

## 次のTiled作業前に残るTBD

人間がNo.01/No.02の仮対応位置、歩行距離、主人公と地形の縮尺、粗い海岸/橋判定を確認する。正式地形・正式タイルサイズ・他の橋や地域への導線は別途確定する。本PhaseのPASSを正式世界地理の承認としない。Phase 9には進んでいない。

PHASE 8.6 STATUS:
PASS
