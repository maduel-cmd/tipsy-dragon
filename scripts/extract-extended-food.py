#!/usr/bin/env python3
"""Cut extended 10×6 food grid → transparent WebP + merge into assets.json."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "public" / "assets" / "foodtruck_sheets" / "extended_food_grid.jpg"
OUT_PREP = ROOT / "public" / "assets" / "items" / "prepared"
MANIFEST = ROOT / "public" / "assets" / "assets.json"
TARGET = 512
COLS, ROWS = 10, 6

# (name, col 0-based, row 0-based) — from 10×6 photoreal grid
EXTENDED = [
    ("salmon_fillet", 0, 0),
    ("seafood_paella", 1, 0),
    ("fish_and_chips", 2, 0),
    ("spaghetti_bolognese", 5, 0),
    ("pad_thai", 0, 3),
    ("lasagna_slice", 1, 2),
    ("ramen_bowl", 4, 3),
    ("shakshuka_pan", 1, 5),
    ("hummus_plate", 2, 5),
    ("shawarma_wrap", 4, 4),
    ("fried_chicken_basket", 5, 4),
    ("mac_and_cheese", 7, 4),
    ("chocolate_lava", 5, 5),
    ("tiramisu_slice", 6, 5),
    ("ice_cream_cone", 7, 5),
    ("churros_plate", 9, 5),
]


def isolate(im: Image.Image) -> Image.Image:
    return remove(im.convert("RGB")).convert("RGBA")


def trim_and_pad(im: Image.Image, size: int = TARGET) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = im.crop(bbox)
    cw, ch = cropped.size
    scale = min((size * 0.92) / cw, (size * 0.92) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def cut_cell(im: Image.Image, c: int, r: int) -> Image.Image:
    W, H = im.size
    cw, ch = W / COLS, H / ROWS
    x0 = int(c * cw + cw * 0.03)
    y0 = int(r * ch + ch * 0.03)
    x1 = int((c + 1) * cw - cw * 0.03)
    y1 = int((r + 1) * ch - ch * 0.03)
    return im.crop((x0, y0, x1, y1))


def main() -> None:
    if not SHEET.exists():
        raise SystemExit(f"missing sheet: {SHEET}")
    print(f"Extended grid {COLS}×{ROWS} (rembg)… {SHEET}")
    im = Image.open(SHEET).convert("RGB")
    OUT_PREP.mkdir(parents=True, exist_ok=True)
    sprites: dict[str, dict] = {}

    for name, c, r in EXTENDED:
        cell = cut_cell(im, c, r)
        cut = trim_and_pad(isolate(cell))
        # Sanity: enough opaque pixels
        alpha = cut.split()[-1]
        opaque = sum(1 for px in alpha.getdata() if px > 20)
        if opaque < 800:
            print(f"  WARN {name}: sparse alpha ({opaque}) — still saving")
        webp = OUT_PREP / f"{name}.webp"
        cut.save(webp, "WEBP", quality=92, method=4)
        rel = f"/assets/items/prepared/{name}.webp"
        sprites[name] = {"x": 0, "y": 0, "w": TARGET, "h": TARGET, "src": rel}
        print(f"  {name} @({c},{r}) → {rel} ({webp.stat().st_size // 1024}KB, opaque≈{opaque})")

    prev: dict = {}
    if MANIFEST.exists():
        try:
            prev = json.loads(MANIFEST.read_text(encoding="utf-8"))
        except Exception:
            prev = {}

    merged = {**(prev.get("sprites") or {}), **sprites}
    food_sheets = dict(prev.get("foodSheets") or {})
    food_sheets["extended"] = "/assets/foodtruck_sheets/extended_food_grid.jpg"

    manifest = {
        **{k: v for k, v in prev.items() if k not in ("sprites", "foodSheets")},
        "foodSheets": food_sheets,
        "sprites": merged,
    }
    # Keep required top-level keys
    manifest.setdefault(
        "sheet",
        {"src": "/assets/game_asset_library.webp", "width": 1024, "height": 559},
    )
    manifest.setdefault(
        "hero",
        {"src": "/assets/foodtruck_hero.webp", "width": 1024, "height": 559},
    )

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Manifest → {len(merged)} sprites ({len(sprites)} new extended)")


if __name__ == "__main__":
    main()
