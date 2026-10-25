#!/usr/bin/env python3
"""
Subset EB Garamond (variable, wght 400-800) into the two woff2 files the site
serves, and copy the upstream OFL text alongside them.

Why subset at all: the upstream variable woff2 pair is 583 KB (297 + 286 KB),
and 95% of that is Cyrillic, Greek, Vietnamese and math/currency blocks this
English-facing site never renders. Cutting to Latin Basic + Latin-1 Supplement
+ Latin Extended-A + the typographic punctuation the layout actually uses
(em/en dash, curly quotes, ellipsis, section sign) lands the pair at roughly
90 KB total while keeping every glyph the copy needs.

Why the *variable* font rather than five static cuts: the site uses weights
400 / 500 / 600 / 700 (see `font-normal|medium|semibold|bold` in app/ and
components/), plus italic at 400 only. One variable file per style covers all
of them, so the CSS stays one @font-face per style instead of four, and adding
a weight later needs no new download.

IMPORTANT — the `wght` axis must survive subsetting. pyftsubset drops the
variation tables unless the font is kept as variable; we therefore never pass
`--instance`. Verify with scripts/verify-font-metrics.py after running.

What is lost: `font-variant: small-caps`, old-style figure variants and the
Extra-Bold (800) instance reference no longer-mentioned codepoints; the axis
itself still tops out at 800. None of these are used by the site today.

Usage (managed venv):
  <python> scripts/subset-ebgaramond.py

Source woff2 files live at assets-src/fonts/EBGaramond/ (NOT in public/ —
the raw variable pair is never deployed). Output is committed, so CI needs
nothing. Re-run only if you add characters outside the Unicode ranges below.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "assets-src" / "fonts" / "EBGaramond"
OUT = REPO / "public" / "fonts"

# A housekeeping note on the ranges below:
#   U+0000-00FF  Basic Latin + Latin-1 Supplement (accented French/German
#                names appear in the CV and trip logs)
#   U+0100-017F  Latin Extended-A (Polish/Czech names, macrons)
#   U+2000-206F  General Punctuation (em/en dash, curly quotes, ellipsis,
#                dagger, bullet) — the layout uses these heavily
#   U+20A0-20CF  Currency symbols (the site prints prices in CNY/USD/EUR)
#   U+2190-21FF  Arrows (the travel UI renders a couple inline)
#   U+2200-22FF  Math operators (statistics posts: sum, product, element-of)
#   U+FB00-FB06  Latin ligatures (ff, fi, fl, ffi, ffl) — used in prose
UNICODES = ",".join(
    [
        "U+0000-00FF",
        "U+0100-017F",
        "U+2000-206F",
        "U+20A0-20CF",
        "U+2190-21FF",
        "U+2200-22FF",
        "U+FB00-FB06",
    ]
)

# Layout features worth keeping: kerning, standard ligatures, and the
# contextual alternates EB Garamond relies on for its calligraphic joins.
# Everything else (stylistic sets, historical forms) is dropped for size.
LAYOUT_FEATURES = "kern,liga,clig,calt,ccmp,locl,mark,mkmk"

JOBS = [
    ("EBGaramond[wght].woff2", "ebgaramond-roman.woff2"),
    ("EBGaramond-Italic[wght].woff2", "ebgaramond-italic.woff2"),
]


def run_job(src_name: str, out_name: str) -> int:
    src = SRC / src_name
    dst = OUT / out_name
    if not src.exists():
        print(f"MISSING SOURCE: {src}", file=sys.stderr)
        return 1

    before = src.stat().st_size
    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(src),
        f"--unicodes={UNICODES}",
        f"--layout-features={LAYOUT_FEATURES}",
        "--flavor=woff2",
        "--with-zopfli",
        f"--output-file={dst}",
        "--no-hinting",
        "--desubroutinize",
    ]
    print(" ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stdout, proc.stderr, file=sys.stderr)
        return proc.returncode

    after = dst.stat().st_size
    print(
        f"  {out_name}: {before/1024:.0f} KB -> {after/1024:.0f} KB "
        f"({after/before*100:.1f}%)"
    )
    return 0


def main() -> int:
    if not SRC.exists():
        print(
            f"Source dir not found: {SRC}\n"
            "Download the variable woff2 pair from\n"
            "  https://raw.githubusercontent.com/octaviopardo/EBGaramond12/master/"
            "fonts/webfonts/EBGaramond%5Bwght%5D.woff2\n"
            "  https://raw.githubusercontent.com/octaviopardo/EBGaramond12/master/"
            "fonts/webfonts/EBGaramond-Italic%5Bwght%5D.woff2",
            file=sys.stderr,
        )
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    rc = 0
    for src_name, out_name in JOBS:
        rc |= run_job(src_name, out_name)

    # The OFL requires the license text to travel with the font.
    licence_src = SRC / "OFL.txt"
    if licence_src.exists():
        shutil.copyfile(licence_src, OUT / "EBGaramond-OFL.txt")
        print("  copied EBGaramond-OFL.txt")
    else:
        print(
            "WARNING: OFL.txt missing from assets-src/fonts/EBGaramond/ — "
            "public/fonts/EBGaramond-OFL.txt was NOT refreshed",
            file=sys.stderr,
        )
        rc |= 1

    total = sum((OUT / out).stat().st_size for _, out in JOBS if (OUT / out).exists())
    print(f"TOTAL served: {total/1024:.0f} KB")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
