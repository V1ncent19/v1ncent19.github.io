#!/usr/bin/env python3
"""
Subset CJK webfonts to the characters this site actually uses, emitting one
woff2 per (family, weight) and reporting coverage. Generalised successor of
subset-cactus.py (2026-09-07).

Why: full CJK OTFs are ~22 MB each — never deployable raw. The subset keeps
only glyphs present in the font among (a) every CJK char found in the repo's
source of truth (content/, app/, components/, lib/) plus (b) a standing
safety set — CJK punctuation, fullwidth forms, common units — so short edits
rarely need a re-run. Chars outside a subset fall through the CSS stack to
the next font; visitors with the font installed locally use their full copy
first (src: local() precedes url in @font-face).

The woff2 files are COMMITTED — CI needs nothing. Re-run after adding
substantial new content (managed venv with fonttools+brotli):
  C:/Users/V1nce/.workbuddy/binaries/python/envs/default/Scripts/python.exe \
    scripts/subset-cjk-fonts.py

Source fonts live under assets-src/fonts/ (NOT in public/ — never deploy the
full files). Each family's OFL license ships alongside its subsets in
public/fonts/.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

REPO = Path(__file__).resolve().parent.parent

# Scan targets for harvestable CJK chars (UI strings + posts + JSON copy).
SCAN_DIRS = ["content", "app", "components"]
SCAN_FILES = ["lib/i18n.ts", "lib/content.ts", "lib/blog.ts"]

# Always kept: CJK punctuation & symbols (U+3000–303F), fullwidth forms
# (U+FF00–FFEF), common units and typographic marks.
ALWAYS = (
    "".join(chr(c) for c in range(0x3000, 0x3040))
    + "".join(chr(c) for c in range(0xFF00, 0xFFF0))
    + "·—–…×÷°′″℃℉①②③④⑤⑥⑦⑧⑨⑩§†‡※"
)

# ── families to subset ──────────────────────────────────────────────────────
# Each entry: family key → source dir + weights (subset slug, filename infix).
# The active family must match the `--font-serif-zh` stack + @font-face in
# app/globals.css. Cactus Classical Serif keeps its own dedicated script
# (scripts/subset-cactus.py); its 316 KB subset stays deployed as a deep
# fallback behind GenWanMin in the stack.
FAMILIES = [
    {
        "key": "genwanmin2tc",
        "src": "assets-src/fonts/GenWanMin2TC",
        "license": "SIL_Open_Font_License_1.1.txt",
        "out": "public/fonts",
        "weights": [
            ("r", "GenWanMin2TC-R.otf"),
            ("m", "GenWanMin2TC-M.otf"),
            ("sb", "GenWanMin2TC-SB.otf"),
        ],
    },
]


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
            # fullwidth forms, CJK radicals — the ranges these families draw.
            if (
                0x2E80 <= cp <= 0x9FFF
                or 0xF900 <= cp <= 0xFAFF
                or 0xFF00 <= cp <= 0xFFEF
            ):
                chars.add(ch)
    return "".join(sorted(chars))


def main() -> int:
    from fontTools.ttLib import TTFont

    text = harvest_chars()
    print(f"harvested {len(text)} unique chars (incl. safety set)")

    with NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
        tf.write(text)
        charfile = tf.name

    failed = False
    for fam in FAMILIES:
        src_dir = REPO / fam["src"]
        out_dir = REPO / fam["out"]
        out_dir.mkdir(parents=True, exist_ok=True)

        lic = src_dir / fam["license"]
        if lic.is_file():
            dest_lic = out_dir / lic.name
            if not dest_lic.exists() or dest_lic.read_bytes() != lic.read_bytes():
                dest_lic.write_bytes(lic.read_bytes())
            print(f"license: {dest_lic.relative_to(REPO)}")

        # coverage is identical across weights (same cmap set) — report once
        reported = False
        for slug, filename in fam["weights"]:
            src = src_dir / filename
            if not src.is_file():
                print(f"  ✗ missing source: {src}", file=sys.stderr)
                failed = True
                continue
            out = out_dir / f"{fam['key']}-{slug}.woff2"
            r = subprocess.run(
                [
                    sys.executable, "-m", "fontTools.subset",
                    str(src),
                    f"--text-file={charfile}",
                    "--flavor=woff2",
                    f"--output-file={out}",
                    "--layout-features=*",   # keep OpenType features
                    "--glyph-names",
                    "--notdef-outline",
                    "--recommended-glyphs",
                    "--name-IDs=*",
                ],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                print(r.stderr, file=sys.stderr)
                failed = True
                continue
            print(f"  {out.relative_to(REPO)}  ({out.stat().st_size / 1024:.0f} KB)")

            if not reported:
                cmap = TTFont(out).getBestCmap()
                have = [ch for ch in text if ord(ch) in cmap]
                miss = [ch for ch in text if ord(ch) not in cmap]
                print(f"  covered: {len(have)}/{len(text)}")
                if miss:
                    sample = "".join(miss[:60])
                    print(f"  missing ({len(miss)}, fall back down the stack): {sample}…")
                reported = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
