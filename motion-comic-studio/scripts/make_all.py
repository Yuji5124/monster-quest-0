#!/usr/bin/env python3
"""Run the whole free pipeline end to end (Windows / macOS / Linux, CPU only).

  python scripts/make_all.py            # everything
  python scripts/make_all.py --skip-voices   # reuse committed voice WAVs (no VOICEVOX needed)
  python scripts/make_all.py --only render   # one step: upscale|bake|voices|sfx|music|mix|render|test

The VOICEVOX engine must be running at 127.0.0.1:50021 for the voices step.
"""
import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PY = sys.executable
NODE = shutil.which("node") or "node"
SRC = "assets/source/ginga_ep01_spread.webp"
FINAL = "output/final/ginga_haguredan_episode01.mp4"


def run(*cmd):
    print("\n$ " + " ".join(cmd), flush=True)
    subprocess.run(list(cmd), cwd=ROOT, check=True)


STEPS = {
    "upscale": lambda: (os.path.exists(os.path.join(ROOT, "assets/work/master_x4.png"))
                        or (run(PY, "scripts/upscale.py", SRC, "assets/work/spread_x4.png"),
                            run(PY, "scripts/blend_master.py"))),
    "bake": lambda: run(PY, "scripts/bake.py"),
    "voices": lambda: run(PY, "src/audio/synth_voices.py"),
    "sfx": lambda: run(PY, "src/audio/make_sfx.py"),
    "music": lambda: run(PY, "src/audio/make_music.py"),
    "mix": lambda: run(PY, "src/audio/mix.py"),
    "render": lambda: (
        run(NODE, "src/rendering/render.mjs", "--audio", "output/mix.wav", "--out", FINAL),
        run(NODE, "src/rendering/render.mjs", "--scene", "s03", "--audio", "output/mix.wav", "--out", "output/test_clips/scene03_robotta.mp4"),
        run(NODE, "src/rendering/render.mjs", "--scene", "s05", "--audio", "output/mix.wav", "--out", "output/test_clips/scene05_orca.mp4"),
        run(PY, "scripts/framesheet.py", FINAL, "output/previews/contact_sheet.png",
            ",".join(f"{0.6 + i * 2.5:.1f}" for i in range(32)), "--cols", "8")),
    "test": lambda: run(PY, "tests/test_pipeline.py"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--skip-voices", action="store_true")
    a = ap.parse_args()
    steps = [a.only] if a.only else [s for s in STEPS if not (a.skip_voices and s == "voices")]
    for s in steps:
        STEPS[s]()
    print("\nDONE")


if __name__ == "__main__":
    main()
