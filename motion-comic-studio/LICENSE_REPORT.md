# LICENSE_REPORT — 銀河はぐれ団 モーションコミック

確認日: 2026-10-17。有料ライセンス・有料素材・有料フォントは**一切使用していません**。

## 1. 素材（映像・音声に入っているもの）

| 素材 | 出所 | 条件 | 判定 |
|---|---|---|---|
| 漫画見開き2ページ | ユーザー提供（`assets/source/ginga_ep01_spread.webp`） | ユーザー所有の作品 | 使用可。人物・オルカ号は漫画の絵をそのまま使用し、別デザインへの変更なし |
| 吹き出し・擬音文字 | 上記漫画から切り抜き | 同上 | 使用可。**フォントは使用していない**（文字は原画のピクセル） |
| 音声（少年） | VOICEVOX:白上虎太郎（style ふつう/わーい/びくびく/おこ） | クレジット表記で商用・非商用可（利用規約: virvoxproject.com） | 使用可・クレジット記載済み |
| 音声（ロボ太） | VOICEVOX:猫使アル（うきうき 他）＋自作ロボット風エフェクト | クレジット表記で商用・非商用可 | 使用可・クレジット記載済み |
| 音声（ナレーター） | VOICEVOX:青山龍星（しっとり） | **個人利用**はクレジット表記で商用・非商用可。**企業が携わる形での利用は「ななはぴ」へ事前確認が必要** | 個人制作として使用可。企業案件にする場合は事前確認するか話者を差し替え（`voice_config.json` の1行） |
| VOICEVOX ソフトウェア規約 | engine 0.25.2 同梱 terms_of_service.md | 商用・非商用可、VOICEVOX 使用のクレジット必須、各音声ライブラリ規約に従う | 遵守（`output/final/description.txt`） |
| BGM 3曲 | `src/audio/make_music.py` による numpy 合成 | 本制作のオリジナル（サンプル不使用） | 制約なし |
| 効果音 20種 | `src/audio/make_sfx.py` による numpy 合成 | 本制作のオリジナル（サンプル不使用） | 制約なし |
| 音響・映像の外部抽出 | なし | YouTube 等からの抽出は行っていない | — |

SOUNDVAULT はこの実行環境から到達できなかったため使用していません（ライセンス未確認の音源は一切不使用）。
実在声優の声の模倣は行っていません（VOICEVOX 公式キャラクター音声のみ）。

## 2. ソフトウェア・ライブラリ

| 名前 | 版 | ライセンス | 用途 | 備考 |
|---|---|---|---|---|
| GSAP | 3.14.2 | GreenSock Standard "No Charge" License | タイムライン補間 | 無改変で同梱（`src/rendering/gsap.min.js`）。同ライセンスは Webflow と競合するノーコード制作ツールへの組込みを禁じるが、本システムは該当しない |
| awesome-ai-motion-JP（ユーザーのフォーク） | main | MIT（原典 gongnyang/awesome-ai-motion） | 技法カードのパラメータ・コード | `effects/` のコードは原典リポジトリのオリジナルMIT。カードが参照する第三者の**概念**出典（react-bits の Commons Clause、animate.css の Hippocratic 等）のコードは使用していない |
| VOICEVOX Engine | 0.25.2 (linux-cpu-x64) | LGPL-3.0 ＋ 利用規約 | 音声合成 | ローカル実行のみ。再配布はしていない（各自公式から取得） |
| Real-ESRGAN（realesrgan-x4plus-anime モデル） | v0.2.5.0 | BSD-3-Clause | 4倍拡大 | モデルは同梱していない（README の手順で取得） |
| ncnn (Python) | 1.0.20260526 | BSD-3-Clause | ESRGAN の CPU 推論 | 任意 |
| Playwright (playwright-core) | 1.56.1 | Apache-2.0 | ヘッドレス撮影 | |
| Chromium | Playwright build 1194 | BSD-3-Clause 他 | 描画 | |
| FFmpeg | 6.1.1 | LGPL-2.1+/GPL-2+（ビルド依存） | エンコード・ラウドネス正規化 | ツールとして使用。出力物に制約は及ばない |
| NumPy / SciPy | 2.5.3 / 1.18.1 | BSD-3-Clause | 音声合成・処理 | |
| OpenCV (headless) | 5.0.0 | Apache-2.0 | 画像処理・コマ検出 | |
| Pillow | 12.3.0 | MIT-CMU (HPND) | シート生成 | |
| py7zr | 1.1.x | LGPL-2.1+ | VOICEVOX Linux 版の展開のみ | Windows はインストーラ版を使うので不要 |
| Node.js / Python | 22 / 3.13 | MIT / PSF | 実行環境 | |

## 3. 参照のみ（読み取り専用・未改変）

- `Yuji5124/ginga-haguredan` — README / app.js / docs/image_prompts.md / assets/（タイトル画面のオルカ号 c60、ロボ太 c1、主人公、背景）を**デザイン確認のためだけに参照**。ゲーム画像は動画に合成していない。
- `Yuji5124/awesome-ai-motion-JP` — 上記の通りパラメータ・実装を移植。リポジトリ自体は変更していない。

## 4. 生成物に必要なクレジット

`output/final/description.txt` に記載済み（動画の説明欄に貼り付け用）:
`VOICEVOX:白上虎太郎` / `VOICEVOX:猫使アル` / `VOICEVOX:青山龍星` / VOICEVOX / GSAP / Awesome AI Motion (MIT)
