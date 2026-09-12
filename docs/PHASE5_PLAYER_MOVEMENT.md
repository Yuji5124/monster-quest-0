# Phase 5 実装結果

最終更新: 2026-09-13 JST

## 作業前に確認した主人公最新仕様

主人公は男性・別世界の元NPC。正式外見・歩行素材・最終配置はTBD。
`AGENTS.md` / `CLAUDE.md` / `README.md`、PROJECT_STATUS・OPENING_SPEC・MAP_FLOW_SPEC・UI_INPUT_SPEC・PHASER_ARCHITECTURE・DATA_CONTRACTS・TBD_REGISTRY・ASSET_INDEX・Phase 4記録、asset_catalogと実ファイルを確認した。
移動方式についてdocsに確定しているのは十字移動が基本という点。グリッド／連続移動や最終速度の指定は見つからなかった。
今回のユーザー指示に従い、正式素材がなくても操作検証専用のDEV_PLACEHOLDERでPhase 5のみ進める。

開始時のgit statusは既存の追跡済み8ファイル変更、src/tests/public/Phase記録等が未追跡。git diff / diff --statを確認し、未コミット変更を保持した。reset / restore / 全面書き換え / コミット / pushは行っていない。

## 主人公素材分類

- CURRENT: 正式採用された現行主人公歩行PNGは確認できない。
- REFERENCE: `assets/characters/reference/sprites/`の14画像、`profiles/`の参考資料。現行主人公への採用根拠がないため不使用。参考画像のフレームや方向数を実装へ転用していない。
- SUPERSEDED: `char.hero.walk` / `assets/characters/playable/hero_walk.png`。旧女性勇者風主人公で使用禁止。指定ファイルも存在しない。
- TBD: `char.protagonist.walk` / `assets/characters/playable/protagonist_walk.png`はneeds_reviewで実ファイルなし。正式外見・方向別フレーム・歩行アニメ速度・初期配置は未確定。

単色RectangleをDEV_PLACEHOLDERとして使用。画像生成・参考画像の正式採用・asset_catalogへの登録は行っていない。

## 変更ファイル

今回の開始時点からの変更:
- `src/scenes/StartingPlaceScene.ts`: このSceneだけのArcade Physics有効化、Player・障害物・InputSystemの接続と後片付け。
- `src/config/startingPlace.ts`: devPlayerSpawnと焚き火の仮collision矩形を追加。既存の描画定義は維持。
- `README.md` / `docs/PROJECT_STATUS.md` / `docs/CURRENT_WORK.md` / `docs/CONTENT_MATRIX.md` / `docs/INDEX.md`: Phase 5の限定範囲を同期。

## 新規ファイル

- `src/config/player.ts`: 仮の速度、表示・当たり判定サイズ、色。
- `src/entities/Player.ts`: DEV_PLACEHOLDERの表示、動くBody、方向状態、速度更新。
- `src/systems/PlayerMovement.ts`: 共通actionから一つの移動方向を選択。
- `tests/playerMovement.test.mjs`: 4方向、同時入力、input lockとblurの回帰テスト。
- `docs/PHASE5_PLAYER_MOVEMENT.md`: 本書。

検証用の `.qa/verify-phase5.cjs` / 結果JSON / 画像は既存ignore対象の `.qa/` に保存し、製品コード・配信物には含めない。

## Player構造

PlayerはRectangleとArcadeのDynamic Body、`facing`を保持する。方向選択は小さなPlayerMovement関数へ分離した。
SceneがPlayerと障害物を組み合わせ、衝突解決には標準のArcade Physicsを使用する。独自CollisionEngine / TilemapSystem / EventSystemは作っていない。
正式素材への差し替え時はPlayerの表示部分を置き換えられる。現段階では正式スプライト用の空クラスやアニメ定義は追加しない。

## InputSystemとの接続

Phase 1のInputSystemをそのまま使用。Scene内でキーコードを再定義していない。
PRE_UPDATEで保持中actionを読み、Arcadeの物理更新前にPlayer速度を更新する。キーを離すと次の物理更新前に速度0となる。
既存`setLocked(true)`を利用でき、ロック時は入力が消去される。解除だけでは移動を再開せず、新しい押下が必要。
Scene shutdown/destroyでInputSystemと移動リスナーを解除。表示物・物理BodyはPhaserのScene終了処理で破棄する。

## 移動方式

**TEMP_TEST_VALUE: ピクセル座標での連続4方向移動。** 最終方式として確定していない。
Arcade標準の固定物理stepを利用する。キーの自動リピート回数によって速度を加算する方式ではない。

## 移動速度

`PLAYER.moveSpeed = 60`（内部座標px/秒）。加速・慣性・減速は付けず、押下中は定速、解放で停止。
ブラウザで約1秒長押しした計測は61px。キー送信とフレーム境界の分を含む値で、設定は60px/秒。
最終速度は人間の操作感確認後に調整する。

## 方向管理

`up / down / left / right`を保持。停止時は最後の向きを保持し、障害物へ向かって押した場合も入力方向を向く。
DEV_PLACEHOLDERの仮初期向きはright。向きによる会話・調べる処理は追加していない。

## 斜め入力の扱い

縦横の同時押しは縦を優先し、一軸だけ移動する。↑＋↓、←＋→は各軸で相殺する。
例: ↑＋→は上、↑＋↓＋→は右、4キー同時押しは停止。キーを離すと残った入力を次の更新で評価する。
斜め移動・斜めの速度増加はない。この優先規則もPhase 5の仮操作方式。

## 歩行アニメーション

未実装。CURRENT素材がないため、フレーム・歩行画像を生成せず、単色Rectangleのままとする。

## Collision構造

StartingPlaceScene内だけでArcade Physicsを有効化。重力0、固定カメラ。
Dynamic Body 1個（Player）とStatic Body 2個（地面より上・焚き火）、Collider 2個。
Playerの当たり判定は表示と同じ10×14px。反発させず、障害物との接触面で止まる。

## 焚き火との当たり判定

既存campfire位置と描画単位を参照する設定矩形で、炎・薪の24×28pxを囲む。現在は左上(148,140)、右下(172,168)。
Player中心の停止位置は、左からx=143、右からx=177、上からy=133、下からy=175。
四方向とも通過できないことを長押しで確認済み。周囲の明かりには当たり判定を付けず、そこは歩ける。
炎アニメーション・音・イベントは追加していない。

## 画面境界

World boundsは既存DISPLAYの320×240。Player全体が画面内に収まるよう止める。
現在のPlayer中心の左右限界はx=5 / 315、下限はy=233。
地面の開始位置（y=96）より上は仮の歩行不可領域で、上への移動はPlayer中心y=103で止まる。
地形の歩行制限により上画面端へは到達できない。No.01の外への遷移はない。

## No.01 PLACEHOLDERとの関係

Phase 4の地面、静止した焚き火、背景色、内部解像度、固定カメラを維持。
初期位置は焚き火からの仮相対配置（中心128,156）で、正式な主人公配置ではない。
`protagonist: null` / `dialogue: null`は正式未確定値として保持し、操作確認用の`devPlayerSpawn`と区別する。
地形・衝突矩形・速度・見た目のすべてをPLACEHOLDERまたはTEMP_TEST_VALUEと明記した。

## テスト結果

`npm test`: 15/15成功（既存12件を無変更で維持、新規3件）。
新規テストは4方向と停止、同時入力と逆方向相殺、InputSystemのlock/unlock/blurとの接続を確認する。
実際のPlayerの移動・衝突・停止・方向保持・再入場は下記ブラウザ検証で確認した。
`git diff --check`: 成功。

## TypeScript結果

`npm run typecheck`: 成功。
初回のStaticBody配列の型エラーは、標準APIへ障害物を一つずつ渡す形に修正して解消した。型チェックを回避するany追加はしていない。

## Build結果

`npm run build`: 成功。Phaser 3.90.0固定と既存の依存バージョンを維持。
JS約1,208.12kB / gzip約323.04kB。既存の500kB超チャンク警告は継続している。
新規画像・音声・外部フォント・依存パッケージは追加していない。

## ブラウザ確認

Chrome headless + Playwrightで、実際のKeyboard API（keydown/up）を使用。
ブラウザ内の観測用game参照はHTTP応答へだけ追加し、製品ソースへデバッグ参照を埋め込んでいない。

確認済み:
- BootScene → TitleScene → Zで決定 → 約5秒OpeningGlitchScene → No.01夜とDEV_PLACEHOLDER。
- 演出中のEscape / Enterでスキップしない。
- ↑ / ↓ / ← / →、長押し、解放後の停止、停止中の向き保持。
- 一軸のみの同時入力、逆方向相殺、約1秒の速度確認。
- 焚き火の四辺、画面の左右・下端、地面より上の進入禁止領域。長押しでも抜けない。
- input lock / unlock、blur後に勝手に移動しない。
- 375×812 / 1280×720リサイズ後の表示と移動。4:3と内部320×240を維持。
- QAからタイトルへ戻し、Enterで再開してもBody数・Collider数が増えず、衝突が機能する。
- 再入場後も動くBody 1、静的Body 2、Collider 2、アクティブSceneはStartingPlaceSceneのみ。

再入場検証では、Collider登録が物理stepで反映される前に件数を読んで一度失敗した。検証側で反映を待つよう修正し成功。
ゲーム本体へ待機タイマー等は追加していない。
結果: `.qa/phase5-browser.json`。画像: `.qa/phase5-start.png` / `.qa/phase5-375.png` / `.qa/phase5-1280.png`。

iPhone Safari実機・タッチ操作は未検証。今回のPCキーボード検証だけでSafari対応済みとは扱わない。

## Consoleエラー

ブラウザ検証で0件。missing texture / HTTPエラーも0件。

## Phase 1〜4への影響

開始時のファイルSHA-256と比較し、既存src/testsの変更はStartingPlaceScene.tsとstartingPlace.tsだけと確認。
BootScene / TitleScene / OpeningGlitchScene / InputSystem / main / display・menu・input・openingGlitch設定 / 既存12テストは変更していない。
Phase 4の「静止表示で停止」を、今回の指示によりNo.01内での歩行へ拡張した。焚き火の描画定義は変更なし。
マップ遷移・No.02・NPC・会話・調べる・昼版・戦闘・セーブ・メニュー画面・音等は追加していない。

## 発見した問題

- 正式主人公素材・正式マップ・正式移動方式は未確定。今回の矩形や数値を正式仕様として扱わない。
- iPhone Safari実機とタッチ操作は継続課題。
- 既存ビルド容量警告は残る。今回の小範囲で依存更新や構成の大変更は行っていない。
- Gitのユーザー共通ignore参照に権限警告が出るが、リポジトリ内の差分確認は実行できた。

## Phase 6へ進む前に不足している素材・仕様

- CURRENT主人公歩行素材、実際の方向・フレーム構成、アニメーション速度。
- 正式な初期配置・向き、正式マップと衝突領域。
- 最終の移動方式・速度、同時押しの優先規則。
- No.01から次マップへの出口位置・接続条件・切替演出。

人間の操作確認項目:
- 60px/秒の速さ、キー解放で滑らず止まる感触。
- 縦優先・逆方向相殺の操作感。
- 10×14pxのPlayerと24×28pxの焚き火の接触距離。
- 地面上端・画面端での止まり方。

[開発サーバー](http://127.0.0.1:5173/)を再読み込みし、「はじめから」をZ/Enterで選択。夜の画面になったら方向キーで確認する。

共通DoD: **PARTIAL**（正式素材・本編全体は未完成）。今回のPhase 5限定範囲は検証済み。Phase 6は実装していない。

PHASE 5 STATUS:
PASS
