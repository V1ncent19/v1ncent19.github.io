#!/usr/bin/env python3
"""
Subset Cactus Classical Serif (仙人掌明體) to the characters this site actually
uses, output a woff2 webfont, and report coverage.

Why: the upstream TTF is 28 MB (full HK inherited-glyph set). Shipping it raw
would dominate first load on GitHub Pages. The subset keeps only glyphs the
font actually provides among (a) every CJK char found in the repo's source of
truth (content/, lib/i18n.ts, app/, components/) plus (b) a standing safety
set — CJK punctuation, fullwidth forms and common units — so short edits
rarely need a re-run. Chars outside the subset fall back to Noto Serif SC per
the CSS stack; visitors with the font installed locally use their full copy
first (src: local() precedes the url in @font-face).

Usage (managed venv):
  <python> scripts/subset-cactus.py

Run after adding substantial new content; the woff2 is committed, so CI needs
nothing. Source TTF lives at assets-src/fonts/ (NOT in public/ — never deploy
the full TTF). License (OFL.txt) ships alongside the subset in public/fonts/.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

REPO = Path(__file__).resolve().parent.parent
SRC_TTF = REPO / "assets-src/fonts/CactusClassicalSerif-Regular.ttf"
OUT_WOFF2 = REPO / "public/fonts/cactus-subset.woff2"

# Scanned for harvestable CJK chars. TSX files include UI strings; content/
# covers posts, notes and JSON copy; i18n holds every UI label.
SCAN_DIRS = ["content", "app", "components"]
SCAN_FILES = ["lib/i18n.ts", "lib/content.ts", "lib/blog.ts"]

# Always kept: CJK punctuation & symbols (U+3000–303F), fullwidth forms
# (U+FF00–FFEF), general CJK punctuation chars used in prose, common units.
ALWAYS = (
    "".join(chr(c) for c in range(0x3000, 0x3040))
    + "".join(chr(c) for c in range(0xFF00, 0xFFF0))
    + "·—–…×÷°′″℃℉①②③④⑤⑥⑦⑧⑨⑩§†‡※"
)


def harvest_chars() -> str:
    chars: set[str] = set(ALWAYS)
    targets: list[Path] = []
    for d in SCAN_DIRS:
        targets.extend((REPO / d).rglob("*"))
    targets.extend(REPO / f for f in SCAN_FILES)

    for p in targets:
        if not p.is_file() or p.suffix.lower() not in {
            ".ts", ".tsx", ".md", ".mdx", ".json", ".css", ".mjs"
        }:
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for ch in text:
            cp = ord(ch)
            # CJK unified + ext A, compat ideographs, kana & CJK punct,
            # fullwidth forms, CJK radicals — the ranges this family draws.
            if (
                0x2E80 <= cp <= 0x9FFF
                or 0xF900 <= cp <= 0xFAFF
                or 0xFF00 <= cp <= 0xFFEF
            ):
                chars.add(ch)
    return "".join(sorted(chars))


def main() -> int:
    if not SRC_TTF.is_file():
        print(f"source TTF missing: {SRC_TTF}", file=sys.stderr)
        return 1
    OUT_WOFF2.parent.mkdir(parents=True, exist_ok=True)

    text = harvest_chars()
    print(f"harvested {len(text)} unique chars (incl. safety set)")

    with NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
        tf.write(text)
        charfile = tf.name

    r = subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset",
            str(SRC_TTF),
            f"--text-file={charfile}",
            "--flavor=woff2",
            f"--output-file={OUT_WOFF2}",
            "--layout-features=*",   # keep OpenType features (frac, liga, …)
            "--glyph-names",
            "--notdef-outline",
            "--recommended-glyphs",
            "--name-IDs=*",
        ],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        return 1

    size_kb = OUT_WOFF2.stat().st_size / 1024
    print(f"subset written: {OUT_WOFF2.relative_to(REPO)}  ({size_kb:.0f} KB)")

    # Coverage report: which harvested chars does the font actually have?
    from fontTools.ttLib import TTFont

    font = TTFont(OUT_WOFF2)
    cmap = font.getBestCmap()
    have = [ch for ch in text if ord(ch) in cmap]
    miss = [ch for ch in text if ord(ch) not in cmap]
    print(f"covered by Cactus: {len(have)}/{len(text)}")
    if miss:
        sample = "".join(miss[:60])
        print(f"missing ({len(miss)} chars, fall back to Noto Serif SC): {sample}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
