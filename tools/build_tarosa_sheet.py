# -*- coding: utf-8 -*-
"""Build assets/characters/playable/tarosa_walk.png from the user-supplied
reference renders in assets/characters/reference/reference/タロサ/.

Rerun this whenever the reference renders change:
    python3 tools/build_tarosa_sheet.py

See tools/character_walk_sheet.py for the shared pipeline this wraps.
Keep FINAL_CHAR_HEIGHT / PAD_* in sync with src/config/tarosaSprite.ts
(TAROSA_FRAME_WIDTH/HEIGHT, baseline) if you change them here.
"""
from pathlib import Path

from character_walk_sheet import build_walk_sheet

REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = REPO_ROOT / "assets" / "characters" / "reference" / "reference" / "タロサ"
OUT_PATH = REPO_ROOT / "assets" / "characters" / "playable" / "tarosa_walk.png"

# direction -> row order in the final sheet (down, left, right, up)
DIRECTIONS = [
    ("down", ["正面1.png", "正面2.png", "正面3.png"]),
    ("left", ["左1.png", "左2.png", "左3.png"]),
    ("right", ["右1.png", "右2.png", "右3.png"]),
    ("up", ["うしろ1.png", "うしろ2.png", "うしろ3.png"]),
]

# 主人公と同じ最終キャラ高さで揃え、パーティ内で不自然な大小差が出ないようにする。
FINAL_CHAR_HEIGHT = 64
PAD_SIDE = 3
PAD_TOP = 3
PAD_BOTTOM = 3

if __name__ == "__main__":
    build_walk_sheet(SRC_DIR, DIRECTIONS, OUT_PATH, FINAL_CHAR_HEIGHT, PAD_SIDE, PAD_TOP, PAD_BOTTOM)
