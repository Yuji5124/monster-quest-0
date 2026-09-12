# Phase 5.5 タイトル正式素材更新 + No.01ビジュアル基準更新

最終更新: 2026-09-13 JST

## Codex Astra 引き継ぎ確認

作業開始時のHEADは `main` / `bc2a6cf`。`git status` / `git diff` / `git diff --stat` を確認し、
Phase 1〜5のsrc・tests・docs・public・asset_catalog.json・ASSET_INDEX.md等の未コミット変更を保持した。
`.qa/phase55-before-hashes.json`（Codex Astraが着手前に取得したsrc/testsのSHA-256）と現在のファイル内容を再計算して突き合わせ、
`src/scenes/TitleScene.ts` 以外の全18ファイルがバイト単位で不変であることを確認した。

`TitleScene.ts`の差分は、ロゴパス直上のコメントを「public/assets/ui/title/ 配下。元reference画像(assets/promo/reference/)はコピー元として保持。」から
「配信用コピー。CURRENTの元画像と旧素材の履歴はasset_catalog.json / ASSET_INDEX.mdで管理。」へ更新した1行のみ。
`LOGO_PATH`・シーン構成・縦横比維持のスケール計算・メニュー・入力・320×240は無変更で、これが今回の唯一の意図した差分。

`.qa/phase55-image-audit.json` / `.qa/phase55-reference-paths.json` に、Codex Astraが実施した新タイトル画像・3枚のREFERENCE画像の監査結果（サイズ・モード・アルファ範囲・SHA-256・保存先）が残っており、
Claude Code側でも同じ4ファイルを`file`コマンドと`sha256sum`で独立に再確認し、すべて一致した。

reset / restore / checkoutによる破棄、Phase 1〜5の作り直し、ゲームシステムのリファクタリングは行っていない。

## 新タイトル素材

CURRENT:
- サイズ: 1672 × 941
- 透過: あり（8-bit RGBA、アルファ値0〜255を確認）
- 元パス: `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png`（削除・移動せず保持）
- 配信パス: `public/assets/ui/title/mq0_title_logo.png`（既存パスを維持し中身のみ差し替え。SHA-256が元ファイルと一致することを確認）
- `TitleScene.ts`は`assets/ui/title/mq0_title_logo.png`を相対パスで読み込む処理のまま変更していない

## 旧タイトル素材

SUPERSEDED:
- `assets/promo/reference/mq0_promo_026_6d80d17943.png`（1983×793、Phase 2で採用。削除せず保持を確認）
- `docs/ASSET_INDEX.md` / `assets/asset_catalog.json`双方でCURRENT→SUPERSEDEDへの履歴を記録済み

## TitleScene変更内容

コメント1行のみ（上記「Codex Astra 引き継ぎ確認」参照）。

新しい縦横比（1672:941 ≈ 1.78:1、旧1983:793 ≈ 2.5:1）に対しても、既存の
`Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1)` によるフィット計算がそのまま機能するため、
表示サイズ・位置調整のコード変更は不要だった。実際にブラウザで320×240基準・1280×720・375×812のいずれでも、
ロゴが画面外にはみ出さず、6項目メニューと重ならないことを確認した（後述）。

6項目メニュー、InputSystem、▶カーソル、決定処理、320×240暫定内部解像度、内部解像度変更・メニュー再設計・タイトルアニメーション・新フォントはいずれも変更していない。

## 3枚のNo.01 REFERENCE

REFERENCE 01: `assets/maps/reference/starting_place/no01_location_reference_9d4209d80a.png`
（元1448×1086 RGB、ユーザー添付1＝フォトリアルなロケーション・空間構成）

REFERENCE 02: `assets/maps/reference/starting_place/no01_night_reference_1b51bbe29b.png`
（元1448×1086 RGB、ユーザー添付2＝ドット風の夜イメージ）

REFERENCE 03: `assets/maps/reference/starting_place/no01_day_reference_6398a59b13.png`
（元1448×1086 RGB、ユーザー添付3＝同一構図のドット風昼イメージ）

一時ファイル名`codex-clipboard-*.png`は`.qa/phase55-image-audit.json`のSHA-256と一致する形で上記3パスへ保存済みで、二重コピーはしていない。
既存の`no01_*_<hash>`命名は、リポジトリ全体で使われているハッシュ付きファイル名規則（例: `mq0_promo_026_6d80d17943.png`）に合わせたもので、
ユーザー提示の連番例（`_reference_01.png`等）より既存ルールを優先した。不足しているTEMPファイルはない。

## 3枚から採用した空間要素

- 左側: テント／簡易キャンプ、焚き火、森の木々
- 中央: 山側へ伸びる小道、岩、草木
- 中央〜右: 小さな橋
- 右側: 川または湖のような水辺
- 奥: 山、岩壁、滝、森

No.01を「小さな焚き火だけの閉じたマップ」ではなく、「これから大きな世界へ冒険が始まることを感じられる場所」として扱う方針を`docs/OPENING_SPEC.md` §5「Phase 5.5で採用した構図基準」に記録済み。
3枚はREFERENCEであり、画風（フォトリアル）をそのまま採用せず、構図・地形・空間関係・雰囲気・朝夜の見え方のみを参考にする。個別の小物・座標・通行領域を画像から自動確定しない。

## No.01夜版ビジュアル方針

- 開始時は夜。全体を暗く、焚き火を最も明るく、水面は少し見える程度、山・滝は暗いシルエット寄りにし、遠景を見せすぎない。
- 将来の朝／昼は同じ場所が明るくなり、山・滝・水辺・橋が一気に見える構成を想定するが、**今回は実装しない**。
- 記述は`OPENING_SPEC.md`に一本化し、他docsは同ファイルを参照する形にして重複記述を避けた。

## 現在のNo.01正式背景

CURRENT / TBD: **TBD**。正式背景画像は作成・生成していない。`map.starting_place.night` / `.day`は`asset_catalog.json`上も`path: null` / `needs_review`のまま。

## 現在のゲーム画面

DEV_PLACEHOLDER: `StartingPlaceScene`はPhase 4/5のまま。空色背景・地面矩形・焚き火（Graphics）・単色矩形の主人公・4方向移動・Collisionを維持し、今回変更していない。

## 主人公

DEV_PLACEHOLDER: `src/entities/Player.ts`の単色Rectangle（10×14px）。正式歩行素材は未着手。

## 焚き火

DEV_PLACEHOLDER: `src/config/startingPlace.ts`のGraphics矩形定義。今回変更していない。

## ゲームコードへの変更

`TitleScene.ts`のコメント1行のみ（上記参照）。`StartingPlaceScene.ts` / `Player.ts` / `PlayerMovement.ts` / `InputSystem.ts` / `OpeningGlitchScene.ts` / `player.ts` / `startingPlace.ts`はハッシュ一致で無変更を確認。

## Collisionへの変更

なし。Phase 5の地面・焚き火当たり判定、移動速度60px/秒、Player bodyサイズを維持。

## npm test

15/15成功（既存12件 + Phase 5の3件、すべて無変更）。

```
tests 15
pass 15
fail 0
```

## typecheck

`npm run typecheck`: 成功。

## build

`npm run build`: 成功。`dist/assets/ui/title/mq0_title_logo.png`のSHA-256が新CURRENT画像と一致することを確認。JS約1,208kB / gzip約323kB、既存の500kB超チャンク警告は継続（依存追加なし）。

## ブラウザ確認

既存の開発サーバー（Vite, `http://localhost:5173/`）で確認:
- タイトル画面で新ロゴが崩れず表示。1983:793→1672:941の比率変更後も、6項目メニューと重ならず320×240に収まる。
- Z決定 → 約5秒のOpeningGlitchScene → 暗転 → `StartingPlaceScene`（No.01夜、地面・焚き火・DEV_PLACEHOLDER表示）まで遷移。
- 方向キー長押しで主人公が移動し、焚き火の手前で停止（Collision正常）。
- 1280×720リサイズでも4:3を維持し、ロゴ・メニューが崩れない。

## missing texture

0件（全ネットワークリクエスト200 OK、`assets/ui/title/mq0_title_logo.png`含む）。

## console error

0件。

## 不足している素材

- No.01正式背景画像・タイルセット（`map.starting_place.night` / `.day`）は引き続きTBD。今回意図的に作成していない。
- 正式主人公歩行素材は引き続きTBD。
- TEMPファイル(`codex-clipboard-*.png`)は3枚とも既に永続パスへ保存済みで、不足分はない。

## Phase 5.5で扱わなかったもの

昼版実装、主人公の正式配置、マップ遷移、No.02、NPC、会話、戦闘、セーブ、BGM、SE、ジャンカードはPhase 6以降。今回は着手していない。

PHASE 5.5 STATUS:
PASS
