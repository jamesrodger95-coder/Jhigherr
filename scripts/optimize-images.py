#!/usr/bin/env python3
"""Turn raw store photos into responsive AVIF / WebP / JPEG sets.

Usage:
    python3 scripts/optimize-images.py <source-dir>

<source-dir> holds the original photos named as in PHOTOS below
(s1_*.jpg = Jack Higher 1 / Ekkamai, s2_*.jpg = Jack Higher 2 / Soi 65).
Output goes to public/img/<slug>-<width>.<ext>. Requires Pillow >= 11
(built with AVIF support).

To swap a photo: drop the new file into <source-dir> under the same
source name (or edit PHOTOS) and re-run.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "img"
WIDTHS = (480, 800, 1200)

# source file -> output slug. Order is irrelevant; the HTML references slugs.
PHOTOS = {
    # Jack Higher 1 — The OG Place (Soi Sukhumvit 63 / Ekkamai)
    "s1_8.jpg": "og-storefront",
    "s1_2.jpg": "og-sign",
    "s1_7.jpg": "og-jars-wall",
    "s1_11.jpg": "og-counter-notes",
    "s1_12.jpg": "og-interior",
    "s1_13.jpg": "og-shelves",
    "s1_1.jpg": "og-jars",
    "s1_10.jpg": "og-door",
    "s1_5.jpg": "og-polaroids",
    # Jack Higher 2 — Smoking Lounge (Soi Sukhumvit 65)
    "s2_7.jpg": "lounge-night",
    "s2_4.jpg": "lounge-seating",
    "s2_5.jpg": "lounge-door",
    "s2_3.jpg": "lounge-shelves",
    "s2_9.jpg": "lounge-counter",
    "s2_1.jpg": "lounge-interior",
    "s2_6.jpg": "lounge-bar",
    "s2_10.jpg": "lounge-bag",
    "s2_2.jpg": "lounge-buds",
}


def main(src_dir: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for src_name, slug in PHOTOS.items():
        src = src_dir / src_name
        if not src.exists():
            print(f"skip (missing): {src}")
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        manifest[slug] = {"w": im.width, "h": im.height}
        for w in WIDTHS:
            if w > im.width and w != WIDTHS[0]:
                continue
            h = round(im.height * w / im.width)
            r = im.resize((w, h), Image.LANCZOS)
            r.save(OUT / f"{slug}-{w}.avif", quality=52, speed=4)
            r.save(OUT / f"{slug}-{w}.webp", quality=74, method=6)
            r.save(OUT / f"{slug}-{w}.jpg", quality=78, optimize=True, progressive=True)
        print(f"ok  {slug:20s} {im.width}x{im.height}")
    (ROOT / "src" / "data" / "images.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
