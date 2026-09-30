# -*- coding: utf-8 -*-
"""Normalize the supplied villager sheets into Phaser-ready walk sheets.

The source files under ``assets/characters/reference/reference/村人たち`` are
the preserved, user-supplied sources.  Each is a 3-column × 4-row sheet in
the game's standard direction order (down, left, right, up).  Their generated
canvas dimensions vary by a few pixels, so this tool extracts each cell,
normalizes it to a shared 70×70 frame with a bottom-centre foot anchor, and
writes a compact runtime copy under ``assets/characters/npc``.

Run this after adding or replacing a source sheet:
    python tools/build_villager_sheets.py
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from character_walk_sheet import alpha_trim, premultiplied_resize


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "assets" / "characters" / "reference" / "reference" / "村人たち"
OUTPUT_DIR = REPO_ROOT / "assets" / "characters" / "npc"

# Use the most recent transparent 3×4 sheet for each supplied villager.  The
# older/duplicate generations remain untouched in SOURCE_DIR for reference.
SOURCES = {
    "villager_01": "image-gen-1(20260923-093758).png",
    "villager_02": "image-gen-2(20260923-093803).png",
    "villager_03": "image-gen-3(20260923-093809).png",
    "villager_04": "image-gen-4(8).png",
    "villager_05": "image-gen-5(8).png",
    "villager_06": "image-gen-6(8).png",
    "villager_07": "image-gen-7(6).png",
    "villager_08": "image-gen-8(6).png",
    "villager_09": "image-gen-9(6).png",
    "villager_10": "image-gen-10(3).png",
    # 2026-09-26: No.06レインランドじょう(城内・王の間)の住人。同じフォルダの城向けシートから選ぶ。
    # 姫のシート(image-gen-5(9) (1).png)はミレイの正体に触れうるため割り当てない。
    "villager_11": "image-gen-1(20260923-100111) (2).png",  # 槍の近衛兵
    "villager_12": "image-gen-2(20260923-100117).png",  # 盾の兵士
    "villager_13": "image-gen-3(20260923-100122) (2).png",  # メイド
    "villager_14": "image-gen-4(9) (2).png",  # 王
    "villager_15": "image-gen-4(7).png",  # 青マントの騎士
    "villager_16": "image-gen-7(5).png",  # 学者
    # 2026-09-26: 不思議なとうの更地を案内するおじいさん。ユーザー指定の
    # 透明3×4歩行シートを、そのまま専用の実行用シートへ正規化する。
    "villager_17": "image-gen-1(20260923-085814) (1).png",
    # 2026-09-29: No.12港町ダコハ用(ユーザー指示「今まで使った村人の画像は使わないでください」)。
    # 同じ村人たちフォルダのうち、villager_01〜17がまだ選んでいない別デザインの生成回を新たに割り当てる。
    "villager_18": "image-gen-1(20260923-090411).png",  # やどやの主人(えりまき・エプロン)
    "villager_19": "image-gen-8(4).png",  # ぶきやの店主(斧を持つ、毛皮のベスト)
    "villager_20": "image-gen-2(20260923-085821).png",  # とうだい近くの老婆(かご持ち)
    "villager_21": "image-gen-2(20260923-090417).png",  # 広場の屋台の女性(かご持ち)
    "villager_22": "image-gen-3(20260923-090422).png",  # 波止場の漁師(たくましい、エプロン)
    "villager_23": "image-gen-6(7).png",  # 桟橋を歩く少年(水夫帽)
    "villager_24": "image-gen-8(5).png",  # 広場を歩く船乗り(ターバン、ひげ)
}

FRAME_WIDTH = 70
FRAME_HEIGHT = 70
BASELINE_Y = 67
FINAL_CHARACTER_HEIGHT = 64


def cell_bounds(index: int, count: int, length: int) -> tuple[int, int]:
    """Split a generated canvas without losing a remainder pixel."""
    return round(index * length / count), round((index + 1) * length / count)


# 断片除去はレインランドじょう用に追加したシートだけに適用する。villager_01〜10にも
# 同じ混入があるが、除去すると表示サイズが変わるため、No.02等の見た目確認を経てから広げる。
CLEAN_EDGE_FRAGMENTS = {"villager_11", "villager_12", "villager_13", "villager_14", "villager_15", "villager_16"}

FRAGMENT_ALPHA_MIN = 16
FRAGMENT_MAX_AREA_RATIO = 0.25


def remove_edge_fragments(cell: Image.Image) -> Image.Image:
    """Erase slivers of neighbouring cells that the even grid split picked up.

    Some generated sheets are not laid out on an exact grid, so a cell can
    contain a neighbour's shoe, crown or cape tip along its border.  Those
    pieces touch the cell edge and are much smaller than the character itself;
    removing them keeps them out of the trim box and the runtime frame.
    """
    arr = np.array(cell)
    labels, count = ndimage.label(arr[..., 3] >= FRAGMENT_ALPHA_MIN, structure=np.ones((3, 3)))
    if count <= 1:
        return cell
    areas = np.bincount(labels.ravel())[1:]
    largest = areas.max()
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    for label in border:
        if label and areas[label - 1] < largest * FRAGMENT_MAX_AREA_RATIO:
            arr[labels == label] = 0
    return Image.fromarray(arr, "RGBA")


def build_sheet(source_path: Path, output_path: Path, clean_edges: bool = False) -> None:
    source = Image.open(source_path).convert("RGBA")
    frames: list[Image.Image] = []
    for row in range(4):
        top, bottom = cell_bounds(row, 4, source.height)
        for column in range(3):
            left, right = cell_bounds(column, 3, source.width)
            cell = source.crop((left, top, right, bottom))
            if clean_edges:
                cell = remove_edge_fragments(cell)
            frames.append(alpha_trim(cell, f"{source_path} cell {row},{column}"))

    # A single character can have one wider side-facing frame; use the largest
    # trimmed frame for one scale so its walk cycle never pulses in size.
    source_height = max(frame.height for frame in frames)
    normalized: list[Image.Image] = []
    for frame in frames:
        new_height = round(frame.height * FINAL_CHARACTER_HEIGHT / source_height)
        new_width = round(frame.width * new_height / frame.height)
        if new_width > FRAME_WIDTH - 4 or new_height > FRAME_HEIGHT - 3:
            raise ValueError(f"{source_path.name} does not fit the {FRAME_WIDTH}x{FRAME_HEIGHT} runtime frame")
        normalized.append(premultiplied_resize(frame, new_width, new_height))

    sheet = Image.new("RGBA", (FRAME_WIDTH * 3, FRAME_HEIGHT * 4), (0, 0, 0, 0))
    for index, frame in enumerate(normalized):
        row, column = divmod(index, 3)
        x = column * FRAME_WIDTH + (FRAME_WIDTH - frame.width) // 2
        y = row * FRAME_HEIGHT + BASELINE_Y - frame.height
        sheet.alpha_composite(frame, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    print(f"{source_path.name} -> {output_path.relative_to(REPO_ROOT)} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build Phaser-ready villager walk sheets.")
    parser.add_argument("--only", choices=sorted(SOURCES), help="Build one sheet without rewriting the others.")
    args = parser.parse_args()
    source_items = [(args.only, SOURCES[args.only])] if args.only else SOURCES.items()
    for villager_id, file_name in source_items:
        build_sheet(SOURCE_DIR / file_name, OUTPUT_DIR / f"{villager_id}_walk.png", villager_id in CLEAN_EDGE_FRAGMENTS)
