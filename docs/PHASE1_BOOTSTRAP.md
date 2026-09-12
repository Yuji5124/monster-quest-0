# Phase 1 起動・表示・キー入力基盤

最終更新: 2026-09-12 JST

## 今回の範囲

ユーザー指定のPhase 1は、Phaserの起動・解像度・キー入力の基盤のみ。
`ROADMAP.md` のPhase 1全体（主人公歩行等）とは完成範囲が異なる。
ゲーム本編、マップ、主人公、戦闘、NPC、タイトル画面、タッチUI、音声再生、保存処理は追加しない。

## 開始時の確認

- ローカル `main` は `bc2a6cf`。GitHub `origin/main` の `bb5f5ed` までの差分も確認した。
- 既存の `package.json`、ロックファイル、`src/`、`public/`、Phaserコード、Scene、ビルド環境、起動コマンドはなかった。
- GitHub側の追加差分は素材管理メタデータ。既存のローカル変更と素材は保持した。
- `docs/` の仕様、No.02設計JSON、素材台帳、素材管理用Pythonツールは再利用可能な資料として維持する。
- Phaserの既存バージョン指定はなかったため、Phaser 3.90.0を初回導入。`package.json` は範囲指定にせず、`package-lock.json` も管理する。

## 起動・ビルド

Node.js 22.18以上。確認環境はWindows / Node.js 24.15.0 / npm 11.12.1。

```bash
npm install
npm run dev
```

開発: `http://127.0.0.1:5173/`

```bash
npm test
npm run build
npm run preview
```

本番ビルド確認: `http://127.0.0.1:4173/`。`build` は型チェック後に `dist/` を生成する。
依存はPhaser 3.90.0、Vite 8.3.0、TypeScript 5.9.3に固定。

## ファイルの役割

| ファイル | 役割 |
|---|---|
| `index.html` | Canvasの親要素とTypeScriptの起動入口 |
| `vite.config.ts` | 開発・プレビューの待受先とポート、相対base |
| `src/main.ts` | Phaser.Gameの生成、表示設定、終了処理 |
| `src/config/display.ts` | 確認用内部解像度・背景色 |
| `src/config/input.ts` | 共通actionと仮キー配列 |
| `src/scenes/BootScene.ts` | 描画と入力状態を見る診断画面 |
| `src/systems/InputSystem.ts` | キーから共通actionへの変換と入力状態管理 |
| `src/style.css` | 親領域、Safe Area、ピクセル表示 |
| `public/` | 将来の静的配信ファイル用。現在は空 |
| `tests/input.test.mjs` | 短押し、長押し、同一actionの複数キー、フォーカス喪失、ロック、破棄の回帰確認 |

`assets/` の参考素材はロード・コピーしない。`public/` へも自動配置しない。
将来のScene/System構成は引き続き `PHASER_ARCHITECTURE.md` に従う。

## 表示の仮設定

- `320×240` は `TEMP_TEST_VALUE`。正式な内部解像度・拡大方式を決定したものではない。
- `Phaser.Scale.FIT` と `CENTER_BOTH` で比率を維持して中央配置。
- `pixelArt`、`roundPixels`、CSSの `image-rendering: pixelated` を使用。
- 端末に合わせてCanvasの表示サイズを変更し、内部解像度は変更しない。
- 正式素材・iPhone実機での最終判断は `UI_INPUT_SPEC.md` / `TBD_REGISTRY.md` のTBDを維持する。

## キー入力の仮設定

| キー | action |
|---|---|
| ↑ / ↓ / ← / → | moveUp / moveDown / moveLeft / moveRight |
| Z / Enter | confirm |
| X / Escape | cancel |
| C | menu |

- `isDown(action)` は押下状態。`consumePressed(action)` は未消費の押下を1回だけ取得。
- 短い押下もフレーム間で失わず、自動リピートや同じactionの別キーで二重発火させない。
- フォーカス喪失・非表示化・入力ロック時に保持状態と未処理押下を消す。
- Ctrl / Meta / Altのショートカット、IME変換中、編集欄のキー入力は横取りしない。
- 入力ロック解除後は新しい押下が必要。
- キーイベントをInputSystemへ集約し、Phaser側のkeyboard受付を無効化して二重受付を避ける。
- Sceneのshutdown / destroyでリスナーを解除する。
- タッチ入力は未実装。追加時は同じ共通actionへ接続する。

## 検証記録

- `npm install`: 成功。監査結果0 vulnerabilities。
- `npm test`: 5件成功。
- `npm run build`: 型チェック・本番ビルド成功。
- 開発サーバーでPhaser 3.90.0の診断画面を確認。Canvasは1枚、内部320×240。
- PCブラウザで方向4キー、Z / Enter、X / Escape、Cの9入力を確認。押下回数9、解放後Heldはnone。
- 1280×720、390×844、844×390で比率維持と領域内表示を確認。
- 開発画面のコンソールerror / warnは0件。
- Phaser本体を含むJSが約1.20 MB（gzip約320 kB）のため、ビルド時に500 kB超のチャンク警告あり。ビルド失敗ではなく、警告を隠す設定変更は行っていない。

## 状態と残作業

PARTIAL（プロジェクト共通DoD基準）。PCの起動・表示・キー入力基盤は実装・検証済み。
正式解像度・キー配列の確定、iPhone Safari実機での表示確認は残る。
今回の小画面検証はPCブラウザのviewport変更であり、Safari実機確認として扱わない。
ゲーム本編と `ROADMAP.md` のPhase 1全体は未完了。
