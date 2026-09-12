# Phase 4 No.01「はじまりのばしょ」夜の場面表示

最終更新: 2026-09-13 JST

## Codex Astra 引き継ぎ確認

作業開始時のHEADは `main` / `bc2a6cf`。`git status`、`git diff`、`git diff --stat`、`git log --oneline -10` と、追跡対象外のsrc/tests/package/public/docsも直接確認した。
追跡済み7ファイルに79行追加・10行削除があり、Phase 1〜3のソース・テスト・起動環境・正式ロゴ配信用コピー・素材ライブラリ等は未追跡だった。
これらを引き継ぎ、reset / restore / checkoutによる破棄・削除・コミット・pushは行っていない。
`PHASE3_OPENING_GLITCH.md`の「着手前は差分なし」という過去記録と、今回の未コミット状態は区別する。

継承したもの:
- Phaser 3.90.0 / Vite 8.3.0 / TypeScript 5.9.3と既存npmスクリプト。
- BootScene → TitleScene、正式ロゴ、6項目メニュー、InputSystem。
- はじめから → OpeningGlitchScene、約5000msの黒→横線→ズレ→強い乱れ→暗転、黒画面停止。
- Phase 1入力5件、Phase 2メニュー3件、Phase 3設定4件のテスト。

ゲームコードの変更前に検証:
- `npm test`: 12/12成功。
- `npm run typecheck`: 成功。
- `npm run build`: 成功。既存の500kB超チャンク警告あり。
- Chrome headless + Playwright: Zで約4.98秒、Enterで約5.00秒後に黒画面停止。
- 演出中のZ / Enter / X / Escape / ↑ / ↓でスキップしない。終了後の可視ノイズ文字0、カメラのズレ0。
- 375×812 / 1280×720へのリサイズで4:3維持、画面内に収まる。
- HTTPエラー / missing texture / コンソールエラー0件。

PHASE 3 VERIFIED: PASS

## 最新仕様と今回の範囲

`PROJECT_STATUS.md` / `OPENING_SPEC.md` / `MAP_FLOW_SPEC.md` / `STORY_FLOW.md` / `TBD_REGISTRY.md`を正本として確認。
正式番号はNo.01、名称は「はじまりのばしょ」。No.02の町とは別のイベント専用小規模マップで、開始時は夜、焚き火付近で目覚める。同じ場所の昼版も全体仕様にはある。
最終タイル構成、焚き火周辺の配置、主人公の正式素材・初期座標、最終台詞、昼への切替条件は未確定。

今回のユーザー指定範囲は「夜の場面と焚き火を表示して停止」まで。正式素材未確定の場合のGraphics PLACEHOLDERは今回の指示で許可されている。
正式マップやオープニング全体の完成とは扱わない。

## 素材監査

台帳の既存ステータスは保持し、CURRENT（現行の正式採用）、REFERENCE、SUPERSEDED、TBDを以下のように整理した。
`ready_to_import`は実ファイルの存在・採用完了を意味しない。

| 対象 | 現在の確認結果 | 分類 / Phase 4での扱い |
|---|---|---|
| No.01夜背景・マップ `map.starting_place.night` | path:null / needs_review | TBD。CURRENTなし、画像不使用 |
| No.01昼版 `map.starting_place.day` | path:null / needs_review | TBD。今回未実装 |
| 地形 `tileset.base` / `tileset.extra` | ready_to_importだが指定PNGは実在しない | TBD（取り込み待ち）。不使用 |
| 焚き火 `effect.campfire` | path:null / needs_review | TBD。CURRENTなし |
| 最新男性主人公 `char.protagonist.walk` | needs_review、指定PNGなし、初期配置未確定 | TBD。仮主人公も置かない |
| 旧 `char.hero.walk` | superseded、指定PNGなし | SUPERSEDED。不使用 |
| 夜のキャンプ場参考画像 | `assets/maps/reference/world/mq0_world_map_011_a3fa47cf82.png`、画像内容も確認 | REFERENCE。不使用、正式採用に昇格しない |
| その他の地形・キャラ参考画像 | `assets/maps/reference/` / `assets/characters/reference/`とライブラリ台帳 | REFERENCE。No.01用の採用根拠なし、不使用 |
| タイトルロゴ | 既存ユーザー採用済みのpromo_026とpublic配信用コピー | CURRENT相当の採用済み素材。既存TitleScene内のみで使用 |
| Phase 4の地面・焚き火 | Phaser Graphicsの矩形描画 | PLACEHOLDER。画像ファイル生成なし、正式台帳への登録なし |

元画像名と配置先は `source_manifest.csv` / `allocation_manifest.csv` で照合した。
素材台帳2箇所（asset_catalogの夜・昼noteとASSET_INDEX本文）に残っていた旧No.18表記をNo.01に訂正。素材のpath/statusや参照画像は変更していない。

## 変更ファイル

今回の開始時点からの変更（Git上はsrc自体が未追跡である点に注意）:
- `src/main.ts`: StartingPlaceSceneのimportとScene登録のみ追加。
- `src/scenes/OpeningGlitchScene.ts`: 終了時のconsole出力をStartingPlaceSceneへの遷移に変更。関連コメントを同期。演出ロジック・尺・設定は維持。
- `README.md` / `docs/PROJECT_STATUS.md` / `docs/CURRENT_WORK.md` / `docs/CONTENT_MATRIX.md`: Phase 4の限定範囲と現在状態を同期。
- `docs/ASSET_INDEX.md` / `assets/asset_catalog.json`: No.01番号へ訂正。ASSET_INDEXに監査結果への参照を追加。
- `docs/INDEX.md`: Phase 1〜4の実装記録へのリンクを追加。

## 新規ファイル

- `src/scenes/StartingPlaceScene.ts`
- `src/config/startingPlace.ts`
- `docs/PHASE4_STARTING_PLACE.md`（本書）

検証スクリプト・スクリーンショット・結果JSONは既存ignore対象の `.qa/` に保存。製品コード・配信アセットへは追加していない。

## Scene接続と構造

BootScene → TitleScene → はじめから → OpeningGlitchScene（約5秒、暗転を含む）→ StartingPlaceScene → 静止表示。

OpeningGlitchSceneは既存のfinishedガードを維持し、終了先のみ接続した。新たなタイマー、二重遷移、存在しないScene参照は追加していない。
StartingPlaceSceneはイベント専用の表示責務だけを持ち、汎用WorldScene / MapSystem / EventSystemは先行実装しない。
createでカメラ背景とGraphics 2個（地面・焚き火）を作成する。update / 入力購読 / Tween / Particle / 次のSceneへの接続は持たない。

色、画面内の配置比率、焚き火の矩形定義はstartingPlace.tsへ分離し、全体をPLACEHOLDERと明記した。
大きさ・座標は既存DISPLAYから算出。320×240および描画単位を正式解像度・正式タイルサイズとは扱わない。

## 主人公・台詞・昼版等

- 焚き火: 静止した最小の仮表示のみ。アニメーション・音なし。
- 主人公: 正式素材・初期配置がTBDのため未配置。
- 台詞: 最終台詞TBDのため文字表示・会話イベントなし。configではnullを維持。
- 昼版 / 朝への切替: 未実装。夜を表示して停止。
- 歩行 / 衝突 / マップ移動 / No.02 / NPC / 戦闘 / セーブ / 音 / カード / アイテム等: 未実装。
- Phase 5には着手していない。

## Phase 4検証結果

- `npm test`: 既存12件すべて成功。既存テストは変更なし。
- `npm run typecheck`: 成功。
- `npm run build`: 成功。JS約1,206.32kB、gzip約322.49kB。引き継ぎ時からの500kB超チャンク警告は継続。
- Chrome headless + Playwright: Zで約5.04秒、Enterで約5.01秒後にStartingPlaceSceneへ遷移。
- タイトル6項目、演出中のスキップなし、暗転、No.01夜表示を確認。
- 遷移後にアクティブなSceneはStartingPlaceSceneだけ、描画オブジェクトはGraphics 2個のみ、カメラscroll=(0,0) / alpha=1。
- 夜の表示後にZ / Enter / X / Escape / 全方向キーを入力しても画面が変わらないことをCanvasスクリーンショット比較で確認。
- 375×812 / 1280×720リサイズで内部320×240と4:3を維持。焚き火のはみ出しなし。
- スクリーンショットを目視確認: 暗い背景・地面に焚き火が表示され、前Sceneの暗転が残っていない。
- HTTPエラー / missing texture / コンソールエラー0件。
- 開始時のSHA-256と比較し、既存src/testsのうちmain.tsとOpeningGlitchScene.ts以外が不変であることを確認。
- `git diff --check`: 成功。

ブラウザ検証の観測用game参照はHTTP応答にだけ付加し、ソースファイルへは書いていない。
初回検証はViteの更新クエリ付きURLに観測フックが一致せず待機タイムアウトした。検証スクリプトのURLマッチのみ修正して再実行し成功。ゲーム本体のエラーは検出されていない。

検証記録: `.qa/phase3-browser.json` / `.qa/phase4-browser.json`。
画面: `.qa/phase4-night.png` / `.qa/phase4-375.png` / `.qa/phase4-1280.png`。

## 発見した問題とPhase 5前の人間確認

- No.01の正式背景・地形・焚き火素材の採用と配置確定が必要。
- 最新男性主人公の正式スプライト、初期位置・向きの確定が必要。
- 最初の操作内容・台詞の有無と確定文言・昼への切替条件はTBDのまま。
- 仮画面の明るさ、焚き火の見え方、約5秒から静かな場面への間を人間が確認する。
- 正式内部解像度とiPhone Safari実機確認は未完了。今回のChrome縦長検証でSafari対応済みとは扱わない。
- ビルドのチャンクサイズ警告は残る。今回の小変更では構成変更や依存追加を行っていない。

プロジェクト共通DoD: **PARTIAL**（正式素材・操作・昼版等を含むオープニング全体は未完成）。
今回許可されたPhase 4「夜の場面を表示して停止」の範囲は検証済み。

PHASE 4 STATUS: PASS
