# 内部解像度移行: 320×240 → 960×720

最終更新: 2026-09-13 JST

## 目的

- タイトルロゴを高精細に表示する
- 日本語UI文字の粗さを軽減する
- 今後のUI表現に十分な解像度を確保する
- FC〜初期SFC風のゲーム表現は維持する

正式な最終解像度は引き続きTBD。今回は暫定値を320×240から960×720（4:3を維持したまま3倍）へ更新した。

## 一元管理

`src/config/display.ts`に基準値を集約した。

```ts
export const BASE_WIDTH = 320;
export const BASE_HEIGHT = 240;
export const SCALE_FACTOR = 3;

export const DISPLAY = {
  width: BASE_WIDTH * SCALE_FACTOR, // 960
  height: BASE_HEIGHT * SCALE_FACTOR, // 720
  backgroundColor: "#101018",
} as const;
```

`main.ts`は既存どおり`DISPLAY.width`/`DISPLAY.height`からPhaser.Gameの解像度を取るため、Scene側やmain.tsへ960/720を直接書いていない。

## 変更が不要だったファイル（設計上すでに解像度非依存）

- `src/config/startingPlace.ts`: 焚き火・地面はすべて`DISPLAY.height`に対する比率(`groundTopRatio`/`xRatio`/`yRatio`/`unitHeightRatio`)で定義されており、`DISPLAY`が変わるだけで自動的に3倍相当になる。`devPlayerSpawn`のoffsetも同じ「unit」基準のため追従する。
- `src/scenes/StartingPlaceScene.ts` / `src/scenes/StartingTownScene.ts`: 座標を直書きしておらず、`DISPLAY`・`config/*`・`maps.ts`からのみ値を取るため無変更。
- `src/systems/PlayerMovement.ts` / `src/systems/InputSystem.ts` / `src/systems/MapTransition.ts` / `src/systems/Interaction.ts`: ピクセル値を持たない、または呼び出し側から渡される値をそのまま使うため無変更。
- `src/entities/Player.ts` / `src/entities/Npc.ts`: サイズ・速度は`config/*`から読むだけのため無変更。
- `src/config/openingGlitch.ts`: 段階比率(0〜1)とms単位の時間のみで解像度非依存。

## 変更したファイル（旧320×240基準のpx値を保持していた）

すべて`SCALE_FACTOR`を掛ける形にし、旧値との対応がコード上で分かるようにした。

- `src/config/maps.ts`: spawn座標・exit bounds・NPC座標をすべて`旧値 * SCALE_FACTOR`で表記。
- `src/config/player.ts`: `moveSpeed`(60→180)・`width`(10→30)・`height`(14→42)。
- `src/config/npc.ts`: `width`(12→36)・`height`(16→48)。
- `src/config/interaction.ts`: `INTERACTION_REACH`(8→24)・`INTERACTION_SPAN`(12→36)。
- `src/ui/DialogueBox.ts`: `MARGIN`/`BOX_HEIGHT`/`TEXT_PADDING`/`FONT_SIZE`/`LINE_SPACING`/枠線太さ/▼オフセットをすべて3倍。
- `src/scenes/OpeningGlitchScene.ts`: 文字化けテキストのフォントサイズ、横線の太さ、画面ズレ量(shift/intense両段階)、文字化けテキストの表示可能マージンを3倍。段階比率(0〜1)と発生間隔(ms)は解像度非依存のため無変更。
- `src/scenes/TitleScene.ts`: 下記「タイトル画面」参照。

## タイトルロゴ

- 元画像 `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png`（1672×941）は縮小加工せず、そのまま`this.load.image()`で読み込む。表示側で`Math.min(maxLogoWidth/logo.width, maxLogoHeight/logo.height, 1)`によりアスペクト比を保ったまま縮小するロジックは既存のまま（解像度が変わっても自動で追従する設計だった）。
- ロゴのテクスチャにだけ`this.textures.get(LOGO_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR)`を適用。`main.ts`のグローバル`pixelArt: true`（NEAREST）はゲーム本編のドット絵表示のために維持し、ロゴ以外へは影響しない。

## タイトルメニュー

- 余白(`MARGIN_X/TOP/BOTTOM`)・ロゴとの間隔(`MENU_GAP`)は単純に`* SCALE_FACTOR`。
- 文字サイズ・行間は「単純な3倍」だけでなく、直前のセッションで受けた「まだ大きい」というフィードバックを踏まえてさらに縮小した。

```ts
const PREVIOUS_MENU_FONT_SIZE = 8;    // 320px基準での前回調整値
const PREVIOUS_MENU_LINE_HEIGHT = 10;
const MENU_SIZE_ADJUST = 0.7;         // 「大きすぎる」フィードバックによる追加縮小
const MENU_FONT_SIZE = Math.round(PREVIOUS_MENU_FONT_SIZE * SCALE_FACTOR * MENU_SIZE_ADJUST);   // 17
const MENU_LINE_HEIGHT = Math.round(PREVIOUS_MENU_LINE_HEIGHT * SCALE_FACTOR * MENU_SIZE_ADJUST); // 21
```

中央揃え（前回セッションで導入した`setOrigin(0.5,0)` + `x = DISPLAY.width/2`）とカーソル表示ロジックは変更していない。

## Player移動速度

`moveSpeed`を60→180(px/秒)へ変更し、座標系が3倍になっても画面上の体感速度が変わらないようにした。他の移動ロジック（縦優先、逆方向相殺、input lock等）は無変更。

## Collision / Spawn / Exit

`maps.ts`のspawn座標・exit boundsをすべて3倍したことで、Player・焚き火・地面境界・No.01/No.02の出口との位置関係は比率として解像度移行前と一致する（焚き火・地面自体は比率ベースのため無変更、出口/spawnのみ数値を3倍）。

## OpeningGlitchScene

画面全域を使う`fillRect(0, y, DISPLAY.width, h)`等は`DISPLAY`を参照しているため960×720へ自動追従する。横線の太さ・画面ズレ量・文字化けテキストの表示マージンのみ、旧解像度基準のpx値だったため`SCALE_FACTOR`を掛けて比率を揃えた。段階比率・演出時間(約5秒)は変更していない。

## MapTransition

`beginMapTransition()` / `createExitZone()`のロジック自体は変更していない。渡される`bounds`/`spawnId`は`maps.ts`側で3倍済みの値を使う。

## 検証

- `npm test`: 32/32成功（既存30件は無変更で成功、新規`tests/display.test.mjs`2件を追加）。
- `npm run typecheck` / `npm run build`: 成功。
- ブラウザ（開発サーバー）で確認: タイトル(新ロゴLINEAR表示・中央揃えメニュー)、No.01夜(地面・焚き火・Player・出口マーカー)、No.02(Player・NPC・出口マーカー)、No.01の`fromStartTown`スポーンをそれぞれ静止画で確認し、いずれも旧320×240版と同じ比率・位置関係で表示されることを確認した。全リクエスト200 OK、コンソールエラー0件。
- このセッションもBrowserペインが非表示（`requestAnimationFrame`停止）のため、キー操作を伴う移動速度の体感・出口到達によるMapTransition発火・NPC会話の対話的確認はできていない。過去のPhase 6と同様、ユーザーによる実ブラウザでの手動確認を推奨する。

## 今回意図的に見送ったこと

- Phase 7（NPC・会話）の機能追加・仕様変更はしていない。
- 正式な最終解像度の確定はしていない（960×720も引き続きTEMP_TEST_VALUE）。
- iPhone Safari実機確認は未実施。
