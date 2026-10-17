# FREE AI MOTION COMIC STUDIO — 銀河はぐれ団 第1話 冒頭

漫画画像1枚＋台本JSONから、**日本語音声・BGM・効果音付きのモーションコミック（1920×1080 / 30fps / H.264+AAC）** を作る、
**追加費用0円・CPUのみ・ローカル完結**の制作システムです。

- 完成品: `output/final/ginga_haguredan_episode01.mp4`（80.8秒）
- テストクリップ: `output/test_clips/scene03_robotta.mp4` / `scene05_orca.mp4`
- 字幕: `output/subtitles.srt`（映像には焼き込まない。漫画の吹き出しをそのまま使うため）
- コンタクトシート: `output/previews/contact_sheet.png`
- 動画説明・クレジット: `output/final/description.txt`
- ライセンス: `LICENSE_REPORT.md` / 費用: `COST_REPORT.md`

> 台本は漫画映像化のための脚色です。『銀河はぐれ団』ゲーム本編の確定設定ではありません。

## 仕組み

```
漫画画像 ─▶ upscale.py (Real-ESRGAN ncnn / CPU) ─▶ blend_master.py (ESRGAN 60% + Lanczos 40%)
         └▶ detect_panels.py (コマ自動検出)  ─┐
project/storyboard.json (コマ・吹き出し・パーツ・口・目) ─▶ bake.py ─▶ assets/build/ (レイヤーPNG + manifest)
project/timeline.json (シーン・台詞・カメラ・演出)  ─┬▶ synth_voices.py (VOICEVOX ローカル)
project/voice_config.json                            ├▶ make_sfx.py / make_music.py (numpy で自作合成)
project/effects_config.json (ライブラリ由来の数値)  ├▶ mix.py (ダッキング・ラウドネス正規化・SRT)
                                                     └▶ player.html + engine.js (GSAP, seek 決定論)
                                                         └▶ render.mjs (Playwright+Chromium 撮影 → FFmpeg)
```

- **共通エンジン**（作品に依存しない）: `src/animation/engine.js`, `src/rendering/*`, `src/audio/*`, `scripts/*`
- **作品固有データ**: `assets/source/`, `project/*.json` のみ

### 演出（VISUAL EFFECT LIBRARY から実装）
`project/effects_config.json` に、各カード（`effects/<slug>/README.md` と `index.html`）のパラメータ・イージングを転記し、
エンジンが同じ値で動かしています。

| シーン | 主 | 補助 | 実装の要点 |
|---|---|---|---|
| 01 故郷の崩壊 | deep-parallax | ken-burns, noise-dissolve | 画像を帯状レイヤーに分け速度比1.1/1.25、ease none の等速ズーム、固定ノイズ＋閾値移動の溶暗 |
| 02 瓦礫を蹴る | anticipation | shake, overlapping-action | 0.25s 予備動作→0.65s 発射、振幅列 [8,-8,5,-5,3,-3,1.5,0] |
| 03 ロボ太登場 | spring-overshoot | squash-stretch, shake | `1+2.5(t-1)^3+1.5(t-1)^2` の吹き出しポップ、ロボ太の伸縮は金属なので減衰 |
| 04 自己紹介 | overlapping-action | follow-through, squash-stretch | 0.07s 時間差、角度列 [-24,38,-20,11,-6,3,0]×係数 |
| 05 オルカ号 | mask-reveal | light-sweep, deep-parallax | 暗幕が上から power3.out で開く＋照明が順に点灯、112°光の帯が一度だけ通過 |
| 06 エンジン故障 | shake | light-sweep*, overlapping-action | 火花パーティクル・明滅・揺れ（*光は明滅として使用） |
| 07 仲間の約束 | ken-burns | light-sweep | ラストはオルカ号へティルトアップ＋光の帯 |

その他: 集中線（canvas）、口パク（音量包絡で閉じ口レイヤーを切替）、ロボ太の目の発光＝発話同期、瞬き、
瓦礫・火花・粒子（時刻の純関数なので任意フレームへシーク可能）。
縦長コマは「パネル全体＋同コマのぼかし背景」で見せてから顔へ寄る（吹き出しと顔の両立）。

## 必要環境（すべて無料）

| ソフト | 用途 | 入手 |
|---|---|---|
| Node.js 20+ | 撮影スクリプト | https://nodejs.org/ |
| Python 3.10+ | 画像・音声処理 | https://www.python.org/ |
| FFmpeg | エンコード | https://ffmpeg.org/download.html （Windows は gyan.dev 等の公式リンク先ビルド） |
| Chromium (Playwright) | ヘッドレス描画 | `npx playwright install chromium` |
| VOICEVOX | 日本語音声 | https://voicevox.hiroshiba.jp/ （本体を起動すればエンジンも起動。CPU版で可） |
| Real-ESRGAN ncnn モデル（任意） | 4倍拡大 | https://github.com/xinntao/Real-ESRGAN/releases の `realesrgan-ncnn-vulkan-*.zip` 内 `models/` を `tools/esrgan/models/` へ |

```bash
npm install                      # playwright-core のみ
npx playwright install chromium  # 無料ブラウザ
pip install -r requirements.txt  # numpy / opencv / pillow / scipy / ncnn(任意)
```

GPU は不要です（実測: 4コアCPUで 80秒の本編描画 約6分、ESRGAN 拡大 約3.5分、音声合成 約1分）。
ESRGAN モデルが無い場合は自動で Lanczos 拡大に切り替わります（`--lanczos` でも指定可）。

## 実行

```bash
# VOICEVOX を起動してから
python scripts/make_all.py                 # 拡大→ベイク→音声→効果音→BGM→ミックス→描画→テスト
python scripts/make_all.py --skip-voices   # 同梱の音声WAVを再利用（VOICEVOXなし）
python scripts/make_all.py --only render   # 描画だけ

node src/rendering/serve.mjs               # プレビュー: http://127.0.0.1:8123/src/rendering/player.html?from=40
node src/rendering/render.mjs --scene s03 --audio output/mix.wav --out output/test_clips/x.mp4
node src/rendering/stills.mjs --times 12,40.2 --out output/previews/check
python tests/test_pipeline.py              # 400項目の検証
```

## 別の漫画で使う手順

1. 画像を `assets/source/` に置き、`python scripts/detect_panels.py <画像> project/panels.auto.json --rtl` でコマを検出
2. `project/storyboard.json` にコマ（px）・吹き出し矩形（px）・動かすパーツ／口／目（コマ内 0〜1 座標）を記入
3. `python scripts/bake.py` → `assets/build/debug_overlay.jpg` で位置を確認・修正
4. `project/timeline.json` に台詞（`speaker`, `text`, 任意で読み用 `tts`, `style`）とショット・イベントを書く
5. `python src/audio/synth_voices.py` で尺を確認し、台詞の `at` を調整（テストが重なり・途切れを検出）
6. `python scripts/make_all.py --skip-voices`

イベント型: `bubble` `sfxtext` `part`(anticipation / squash-stretch / follow-through / overlap-move / spring-pop / breathe / rotate / to)
`lipsync` `eyes` `eyes-talk` `blink` `shake` `flash` `fade` `dissolve` `speedlines` `particles`(dust / debris-float / burst / sparks / sparkle / embers)
`parallax` `darkness` `lights-on` `light-sweep` `flicker`。ショットに `"fit": true` で縦長コマ全体表示を許可。

## 制約・既知の限界（正直な報告）

- 1枚絵からの切り抜きのため、**身体の関節を大きく動かすことはしていません**（絵柄破綻を避けるため、楕円フェザーのパーツを小さく変形）。
- 吹き出しを後から出すため下地を推定塗り（ぼかし＋粒子）にしています。吹き出しはショット開始直後に出し、空白が見える時間を最小化しました。
- 口パクは「元絵の開いた口 ↔ 自動生成の閉じ口」の2枚切替です。
- 音声・BGM は人の耳での最終確認をしていません（波形・ラウドネス・台詞区間の音量は自動検証済み）。
- SOUNDVAULT にはこの環境からアクセスできなかったため、BGM・効果音はすべて numpy による自作合成です。
- オルカ号・キャラクターは漫画画像の絵をそのまま使用（ゲーム素材は参照のみ・未改変）。
