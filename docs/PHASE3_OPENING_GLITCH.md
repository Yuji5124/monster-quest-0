# Phase 3 「はじめから」直後の約5秒異常演出

最終更新: 2026-09-12 JST

## 今回の範囲

ユーザー指定のPhase 3は、TitleSceneで「はじめから」を決定した直後の約5秒異常演出（`OpeningGlitchScene`）のみ。
No.01「はじまりのばしょ」、主人公、焚き火、朝への切り替え、No.02以降はPhase 4以降で扱う。

## 開始時の確認

- 着手前のローカルはPhase 1（起動基盤）+ Phase 2（タイトル画面）完了時点。`git status`で差分がないことを確認済み。
- `docs/GLITCH_SPEC.md` §2〜3を確認し、この導入異常で使える演出（画像崩れ / 文字ノイズ / 音の途切れ / 別画面断片）と禁止事項（本当のフリーズ・エラー・真相説明文・開始直後の偽セーブ消失）を確認した。
- 「ぼうけんのしょが きえました」「……まだ おわっていない」は、`GLITCH_SPEC.md` §3で**現行オープニングでは不採用**と明記されているため、今回一切使用していない。
- `docs/TBD_REGISTRY.md`で「約5秒演出の正確なフレーム／秒数」がTBDと確認し、厳密な固定値ではなく目安として実装した。

## 実装内容

- `src/scenes/OpeningGlitchScene.ts` を新規追加。`Graphics` / `Text` / `Camera`（`setScroll` / `fadeOut`）のみで構成し、新規画像素材は使用していない。
- `src/config/openingGlitch.ts` を新規追加。`OPENING_GLITCH_DURATION_MS`（既定5000ms）とステージ比率 `OPENING_GLITCH_STAGES` を一箇所にまとめ、Scene側に秒数をハードコードしていない。
- `src/scenes/TitleScene.ts` の「はじめから」(`START_GAME`)決定時のみ `this.scene.start("OpeningGlitchScene")` を呼ぶように接続。他5項目（つづきから/ジャンカードガチャ/ジャンカード図鑑/たびのあいことば/設定）は変更していない。
- 二重決定対策として `gameStarting` フラグを追加し、`START_GAME`の`scene.start`を1回だけに制限。
- `src/main.ts` の `scene` 配列へ `OpeningGlitchScene` を追加。

## 演出構成

`OPENING_GLITCH_STAGES`の比率(5000ms換算):

| 段階 | 時間 | 内容 |
|---|---|---|
| blackIn | 0.0〜0.4秒 | 黒画面のみ |
| scanlines | 0.4〜1.5秒 | 断続的な横線ノイズ(白/水色/ピンク/グレー) |
| shift | 1.5〜3.0秒 | 横線 + カメラの数px単位のズレ + 文字化け風の断片テキスト |
| intense | 3.0〜4.3秒 | 横線 + より強いズレ + 一瞬の色フラッシュ + 文字化け頻度増加 |
| blackOut | 4.3〜5.0秒 | `camera.fadeOut`で残り時間ぶん暗転し、完全な黒で確定 |

各段階内の点滅・ズレのON/OFFは`GLITCH_FLICKER_INTERVAL_MS` / `GLITCH_SHIFT_INTERVAL_MS`による決まった間隔（一定周期のオン/オフ切替）で、位置・色・文字列だけをその中で軽い乱数にしている。ゲーム進行そのもの（段階の切替タイミング）は乱数に依存しない。

文字化け風テキストは記号・数字・半角カナの組み合わせ(`GLITCH_CHARS`)からのみ生成しており、実在する単語・文章は生成していない。

## 終了後の状態

- 5秒経過後、`completeOpening()`が1回だけ実行され、`console.log("[OpeningGlitchScene] complete - waiting for Phase 4")`を1回出力する。
- 画面は完全な黒のまま停止する。「PHASE 3 COMPLETE」等の開発文字は表示していない。
- `finished`フラグにより、以降の`update()`は即return。存在しないScene名への遷移は行っていない。
- Phase 4では`completeOpening()`内に、No.01「はじまりのばしょ」夜版への`this.scene.start(...)`を追加するだけで接続できる構造にしている。

## 入力の扱い

- `OpeningGlitchScene`は`InputSystem`を生成・購読しない。演出中はどのキーを押しても何も起こらず、スキップされない。
- タブのフォーカス喪失時は、Phaserの標準動作で`update()`自体が呼ばれなくなるため経過時間が進まず、復帰後に続きから進行する（実時間の差分ではなく`delta`加算で経過時間を管理しているため、バックグラウンド中に進みすぎることもない）。

## 検証記録

- `npm test`: 12件成功（Phase1/2の8件 + 今回のステージ設定4件）。
- `npm run typecheck` / `npm run build`: 成功。新規画像を追加していないため`dist`の構成に変化なし。
- ブラウザ確認: BootScene→TitleScene→Z決定→OpeningGlitchScene（黒→横線→ズレ+文字化け→強い乱れ→暗転→黒固定）を実測。Enter決定でも同様に遷移。演出中・演出後にZ/Enter/X/Escape/矢印キーを連打してもシーンが飛ばされず、`OpeningGlitchScene`が二重起動しないことを確認。ネットワークログで全リクエスト200 OK（missing textureなし）、コンソールエラー0件。
- 1280×720リサイズでも黒画面が崩れないことを確認。

## 状態と残作業

PARTIAL（プロジェクト共通DoD基準）。「はじめから」直後の約5秒異常演出と黒画面停止までは実装・検証済み。
No.01「はじまりのばしょ」夜版・主人公・焚き火への接続はPhase 4で行う。正式解像度・iPhone Safari実機確認はPhase 1から継続してTBD。
