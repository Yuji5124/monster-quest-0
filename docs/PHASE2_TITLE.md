# Phase 2 タイトル画面

最終更新: 2026-09-12 JST

## 今回の範囲

ユーザー指定のPhase 2は、タイトル画面（ロゴ表示 + 6項目メニューの選択・決定）のみ。
Phase 3以降（約5秒異常、No.01、主人公、戦闘、NPC、マップ、SaveSystem等）は対象外。

## 開始時の確認

- 着手前のローカル `main` は `bc2a6cf`。Phase 1（起動・解像度・キー入力基盤）は完成済みだった。
- 作業ログ上はCodexがPhase 2に着手した想定だったが、`git status` / `git diff` / 全ブランチ / stashを確認した結果、
  `TitleScene` や関連コードは存在せず、Phase 1の成果物（`BootScene` / `InputSystem` / `display.ts` / `input.ts`）のみが残っていた。
  そのためPhase 2はこの作業で新規に実装した。Phase 1のファイルは変更を最小限に留めて再利用した。
- 正式タイトルロゴは `assets/promo/reference/mq0_promo_026_6d80d17943.png`（1983×793 / RGBA / 透過）と確認した。

## 実装内容

- `src/scenes/TitleScene.ts` を新規追加。ロゴ表示、6項目メニューのカーソル移動・決定を担当する。
- `src/scenes/BootScene.ts` を、`PHASER_ARCHITECTURE.md` のBootScene責務（初期化のみ）に合わせて整理。
  Phase 1の常駐診断表示は役目を終えたため削除し、`create()` で `TitleScene` を起動するだけにした。
  `InputSystem` / `display.ts` / `input.ts` 自体は変更していない。
- `src/config/menu.ts` を新規追加。タイトルメニュー6項目（id / label / action / enabled）を定義する。
- `src/main.ts` の `scene` 配列へ `TitleScene` を追加。

## ロゴ素材

- 元reference: `assets/promo/reference/mq0_promo_026_6d80d17943.png`（削除・移動していない）。
- 実行時配信用コピー: `public/assets/ui/title/mq0_title_logo.png`。
- `TitleScene.preload()` で相対パス `assets/ui/title/mq0_title_logo.png` を読み込む。Windows絶対パスは使用していない。
- 縦横比は維持。`320×240` 内に収まるよう、はみ出す辺に合わせて縮小のみ行う（拡大はしない）。トリミング・変形はしていない。
- ロゴ内にタイトル文字・サブタイトルが含まれるため、テキストによるタイトル文字の重複表示はしていない。

## メニュー

`docs/UI_INPUT_SPEC.md` §3 の正式6項目をそのまま採用。

| 表示 | action | enabled |
|---|---|---|
| はじめから | `START_GAME` | true |
| つづきから | `CONTINUE` | false（SaveSystem未実装のため常時disabled） |
| ジャンカードガチャ | `JANCARD_GACHA` | true |
| ジャンカード図鑑 | `JANCARD_BOOK` | true |
| たびのあいことば | `TRAVEL_PASSWORD` | true |
| 設定 | `SETTINGS` | true |

- カーソルは `▶ `。選択中の項目だけに表示する。
- 「つづきから」はカーソル移動可能（存在を確認できる）だが、文字を暗い色で表示し、決定してもconsole.logのみで何も実行しない。
- 「つづきから」以外を決定すると `console.log("[TitleScene] action: <ACTION>")` を出力する。本体機能へは接続していない。
- 画面上に常時表示される「NOT IMPLEMENTED」等の表示は置いていない。

## 操作

Phase 1の `InputSystem` をそのまま利用し、`TitleScene` 内でキーコードは再定義していない。

- ↑ / ↓: `moveUp` / `moveDown` で選択移動。上端・下端はクランプ（ラップしない）。
- Z / Enter: `confirm` で決定。
- X / Escape: `cancel`。タイトルが最上位のため戻り先はなく、`console.log` のみで無害に処理する。
- `consumePressed` を使用しているため、長押ししても高速連続移動しない。

## 検証記録

- `npm test`: 8件成功（Phase 1のInputSystem 5件 + 新規メニュー構成 3件）。
- `npm run build`: 型チェック・本番ビルド成功。`dist/assets/ui/title/mq0_title_logo.png` が出力に含まれることを確認。
- ブラウザ（開発サーバー）で確認:
  - `BootScene` → `TitleScene` へ自動遷移。
  - ロゴが崩れず表示され、missing textureなし（ネットワークログで200 OK確認）。
  - 6項目すべて表示。「つづきから」のみ暗色。
  - ↑ / ↓ / Z / Enter / X / Escapeの入力をJavaScript経由でKeyboardEventを直接発火させて確認（このBrowserツールの`key`アクションは合成イベントに`code`を付与しないため、`event.code`ベースの`InputSystem`の検証には不向きだった。実際のPCキーボード入力はPhase 1で確認済みの同じ`InputSystem`を再利用している）。
  - 上端を超える↑、下端を超える↓はどちらもクランプされ、選択位置が範囲外に出ない。
  - 長押し（`repeat: true`を連続送出）しても1回分しか選択が動かない。
  - 「つづきから」で決定してもconsole.logのみで安全（SaveSystem等は新規実装していない）。
  - 375×812（縦長）、1280×720（横長）でCanvas比率が崩れず中央表示。
  - コンソールエラー0件。
- iPhone Safari実機確認は未実施（Phase 1から引き続きTBD）。

## 状態と残作業

PARTIAL（プロジェクト共通DoD基準）。タイトル画面の表示・選択・決定入力の取得は実装・検証済み。
「はじめから」以下5項目の本体機能（約5秒異常、ジャンカードガチャ本体、図鑑、たびのあいことば、設定画面）とSaveSystemはPhase 2の範囲外で未実装のまま。
正式解像度確定とiPhone Safari実機確認はPhase 1から継続してTBD。
