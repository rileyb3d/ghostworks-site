"""One-off script: turn the raw signature scans into clean, transparent
PNGs sized for the quote PDF.

For each source image:
  1. Open as RGBA.
  2. Knock out near-white pixels (alpha 0) so the signature line on the
     PDF shows through instead of being covered by a white rectangle.
  3. Trim to the bounding box of remaining (inked) pixels so both
     signatures occupy their full canvas — no internal whitespace.
  4. Downscale to a sensible print-resolution height.

Run once with `python scripts/process-signatures.py`; outputs land in
src/lib/pdf/signatures/.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(r"C:\Users\riley\.cursor\projects\f-Tools-ghostworks-site\assets")
OUT_DIR = ROOT / "src" / "lib" / "pdf" / "signatures"

SOURCES = {
    "michael.png": ASSETS /
        "c__Users_riley_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_PXL_20260514_191802658-f8214b10-7c4f-4cd7-ab10-feb5d2355981.png",
    "riley.png": ASSETS /
        "c__Users_riley_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_SIGNATURE-3bec8ff7-259c-482b-b450-248695cd083f.png",
}

# Anything brighter than this (per channel) gets nuked to transparent.
# 235 keeps faint pen pressure intact while clearing paper/JPEG haze.
WHITE_CUTOFF = 235
TARGET_HEIGHT = 200  # final PNG height in pixels; plenty for 40pt PDF render


def knockout_white(img: Image.Image) -> Image.Image:
    """Return a copy of `img` (RGBA) where near-white pixels are fully
    transparent and remaining pixels keep their original alpha."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE_CUTOFF and g >= WHITE_CUTOFF and b >= WHITE_CUTOFF:
                px[x, y] = (255, 255, 255, 0)
    return img


def trim_to_ink(img: Image.Image) -> Image.Image:
    """Crop to the bounding box of non-transparent pixels."""
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def resize_to_height(img: Image.Image, height: int) -> Image.Image:
    if img.height == height:
        return img
    ratio = height / img.height
    new_w = max(1, round(img.width * ratio))
    return img.resize((new_w, height), Image.LANCZOS)


def process_one(src: Path, dst: Path) -> None:
    if not src.exists():
        raise SystemExit(f"missing source: {src}")
    img = Image.open(src)
    img = knockout_white(img)
    img = trim_to_ink(img)
    img = resize_to_height(img, TARGET_HEIGHT)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG", optimize=True)
    print(f"wrote {dst.relative_to(ROOT)} ({img.size[0]}x{img.size[1]}, {dst.stat().st_size // 1024} KB)")


def main() -> None:
    for name, src in SOURCES.items():
        process_one(src, OUT_DIR / name)


if __name__ == "__main__":
    main()
