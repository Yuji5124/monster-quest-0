#!/usr/bin/env bash
# 書き出したMP4の検査: 1920×1080 / 30fps / 900フレーム / H.264 / 音声トラックなし、黒画面・フリーズの検出。
# 使い方: bash scripts/qa.sh out/mq0_teaser_v6_animatic.mp4
set -euo pipefail
f="${1:?MP4のパスを指定してください}"
echo "== ストリーム"
ffprobe -v error -show_entries stream=index,codec_type,codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration,size -of compact "$f"
v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -of csv=p=0 "$f")
a=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | wc -l)
ok=1
[[ "$v" == "h264,1920,1080,30/1,900" ]] || { echo "NG 映像仕様: $v（期待値 h264,1920,1080,30/1,900）"; ok=0; }
[[ "$a" == "0" ]] || { echo "NG 音声トラックが $a 本あります"; ok=0; }
echo "== 黒画面（0.5秒以上・意図した暗転を含む）"
ffmpeg -v info -i "$f" -vf "blackdetect=d=0.5:pix_th=0.06" -an -f null - 2>&1 | grep -o "black_start:[0-9.]* black_end:[0-9.]* black_duration:[0-9.]*" || echo "なし"
echo "== フリーズ（1秒以上同じ画）"
ffmpeg -v info -i "$f" -vf "freezedetect=n=0.002:d=1" -an -f null - 2>&1 | grep -o "freeze_[a-z]*: [0-9.]*" || echo "なし"
[[ $ok == 1 ]] && echo "== 仕様: OK" || { echo "== 仕様: NG"; exit 1; }
