# COST_REPORT — 追加費用 0円

| 項目 | 結果 |
|---|---|
| **追加費用** | **0円** |
| 有料API・従量課金API | 使用なし |
| 外部API呼び出し（AI・TTS・画像・動画） | **なし**（音声は `127.0.0.1:50021` のローカル VOICEVOX のみ） |
| 有料AI動画/画像生成 | 使用なし（AIは無料・ローカルの Real-ESRGAN 拡大のみ。絵は描き変えていない） |
| 有料音声合成 | 使用なし |
| 有料クラウドGPU | 使用なし（GPU 自体不要、全工程CPU） |
| クレジットカード登録・無料トライアル | なし |
| 有料素材・有料フォント | なし（フォント不使用、BGM/効果音は自作合成） |
| 既存の有料契約・APIクレジットの消費 | なし（Claude Code 自体の利用料は本件の追加費用外） |
| ネットワーク利用 | ツールと無料モデルのダウンロード（npm / PyPI / GitHub Releases）のみ |

## 使用ツール（すべて無料）
Node.js, Python, FFmpeg, Playwright + Chromium, GSAP 3.14.2, VOICEVOX 0.25.2（CPU版）, Real-ESRGAN ncnn モデル,
NumPy / SciPy / OpenCV / Pillow / ncnn。詳細なライセンスは `LICENSE_REPORT.md`。

## 無料で再生成できるか
**できる。** `python scripts/make_all.py`（VOICEVOX 起動時）または `--skip-voices`（同梱の音声WAVを再利用）で、
画像拡大 → レイヤー生成 → 音声 → 効果音 → BGM → ミックス → 1080p 描画 → 検証まで無料で再実行できます。
有料サービスへの自動切替コードは存在しません（`synth_voices.py` はローカルエンジンが無ければ停止します）。

## 検証方法
- ソース全体に外部APIキー・有料エンドポイントの記述がないこと（`grep -ri "api_key\|openai\|elevenlabs\|runway" .` → このレポート自身の記述以外は該当なし）
- `tests/test_pipeline.py` が `voice_config.json` の接続先がローカル（127.0.0.1）であることを確認

## 必要なPC環境（実測ベース）
| | 最低 | この制作での実測 |
|---|---|---|
| OS | Windows 10/11（64bit）・macOS・Linux | Linux x64 |
| CPU | 4コア | 4コア：本編 80.8秒の描画 約6分、ESRGAN 4倍拡大 約3.5分 |
| メモリ | 8GB（16GB 推奨） | 16GB 中、ピーク数GB |
| GPU | 不要 | 未使用 |
| ディスク | VOICEVOX 約2GB＋作業 約0.3GB | 同左 |
