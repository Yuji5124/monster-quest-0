# 音のクレジット・出典

最終更新: 2026-09-27 JST

## BGM
| 用途 | ファイル | 出典 |
|---|---|---|
| C05〜C14（f210〜f765） | `assets/audio/source/wav/mq0_bgm_wav_006_67e4e6838d.wav` の 13.498秒〜31.998秒 | 本作（モンスタークエスト0）のBGM素材。リポジトリ内の原本を直接読み込んでいる（コピーなし）。2026-09-27 ユーザー決定（候補A）。 |

## 環境音（焚き火・風・水）
| ファイル | 出典 |
|---|---|
| `audio/se/campfire.wav` `wind.wav` `water.wav` | ゲーム本体 `src/systems/OpeningCampfireAudio.ts` の Web Audio 構成（白色ノイズ→バンドパス: 火 620Hz Q0.75 / 風 180Hz Q0.3 / 水 1050Hz Q0.42、1.25秒ごとの三角波のパチッ）を `audio/make_sfx.py` でオフライン再現したもの。BRIEF §6 で使用が認められている。予告用に、火へ短いノイズのはぜ音、水へ細かいきらめき、風へゆるい揺れを足している。 |

## 効果音（SE）
`audio/se/` の以下はすべて `audio/make_sfx.py` で本プロジェクトが一から合成したもの（外部の音源・サンプルは不使用）。**CC0 1.0（パブリックドメイン相当）** として扱う。

| ファイル | 内容 | 使っている場所 |
|---|---|---|
| `digital_noise.wav` | ビットクラッシュしたノイズ＋矩形波 | C01 |
| `type.wav` / `type_hi.wav` | 矩形波の短い文字送り音 | C02 / C07 |
| `riser.wav` | 上昇するノイズ＋正弦波 | C03〜C04 |
| `whoosh.wav` | 帯域が移動するノイズ | C04・C08の頭 |
| `boom.wav` | 低音のドン | C05（f210） |
| `snap.wav` | 高域ノイズのスナップ | C06・C10 |
| `flash_hit.wav` | 白フラッシュ用の短い高音 | C09（モンスターハウス） |
| `impact.wav` | 重いインパクト | C09（f452） |
| `bow.wav` | Karplus-Strong による弓の弦 | C10 |
| `explosion.wav` / `rumble.wav` | 爆発・崩落 | C11 |
| `sparkle.wav` | 鈴のようなきらめき | C12 |
| `join.wav` | 加入ジングル風（G4-C5-E5-G5-C6 の上昇アルペジオ。既存作品の旋律は使っていない） | C14 |
| `impact_logo.wav` | ロゴ着地のインパクト＋余韻 | C16 |

BRIEF §6 は「フリー素材（CC0）」を想定していたが、外部素材のダウンロードとライセンス確認を避けるため自前で合成した。外部のCC0素材（例: Kenney の音源パック）へ差し替える場合は、`audio/se/` の同名ファイルを置き換えて `audio/mix.py` を再実行すればよい。

## ミックス
- `audio/mix.py` が `src/data/timeline.json` に従って1本にまとめ、`public/audio/trailer_mix.wav`（48kHz・ステレオ・30.000秒）を書き出す。
- ラウドネス: 統合 -14 LUFS、トゥルーピーク -1 dBTP 以下（結果は `audio/mix/mix_report.json`）。
- f765〜f786 は BGM なし（焚き火の音だけ）。

## フォント（参考）
`public/fonts/` の DotGothic16 / Shippori Mincho B1 / Noto Sans JP は SIL Open Font License 1.1（同フォルダの OFL_*.txt）。
