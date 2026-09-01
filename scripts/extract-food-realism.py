#!/usr/bin/env python3
"""Cut photoreal food sheets → transparent WebP + merge into assets.json.

Uses rembg for subject isolation (preserves white cheese/rice/plates).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / "public" / "assets" / "foodtruck_sheets"
OUT_PREP = ROOT / "public" / "assets" / "items" / "prepared"
OUT_SIDE = ROOT / "public" / "assets" / "items" / "sides"
MANIFEST = ROOT / "public" / "assets" / "assets.json"
TARGET = 512

# sheet_meals_3x3: 3 cols × 3 rows — המבורגר, סטייק, גבינות, אורז, בוקר…
MEALS = [
    ("burger_double", 0, 0),
    ("steak_ribeye", 1, 0),
    ("cheese_platter", 2, 0),
    ("rice_bowl", 0, 1),
    ("breakfast_eggs", 1, 1),
    ("breakfast_meats", 2, 1),
    ("croissant", 0, 2),
    ("waffle_fruit", 1, 2),
    ("chicken_waffles", 2, 2),
]

# sheet_sides_3x4: 4 cols × 3 rows (labels under food — trim bottom)
SIDES = [
    ("fries", 0, 0),
    ("hotdog", 1, 0),
    ("bbq_wings", 2, 0),
    ("draft_beer", 3, 0),
    ("onion_rings", 0, 1),
    ("pancakes", 1, 1),
    ("tacos", 2, 1),
    ("cheeseburger", 3, 1),
    ("dipping_sauces", 0, 2),
    ("nachos", 1, 2),
    ("calamari", 2, 2),
    ("buffalo_wings", 3, 2),
]


def isolate(im: Image.Image) -> Image.Image:
    """AI matting — keeps white foods that edge flood-fill would eat."""
    return remove(im.convert("RGB")).convert("RGBA")


def trim_and_pad(im: Image.Image, size: int = TARGET) -> Image.Image:
    """Crop to non-transparent content, pad to square."""
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


def cut_grid(
    path: Path,
    items: list[tuple[str, int, int]],
    cols: int,
    rows: int,
    out_dir: Path,
    label_trim: float = 0.0,
) -> dict[str, dict]:
    im = Image.open(path).convert("RGB")
    W, H = im.size
    cw, ch = W / cols, H / rows
    out_dir.mkdir(parents=True, exist_ok=True)
    sprites: dict[str, dict] = {}
    for name, c, r in items:
        x0 = int(c * cw + cw * 0.02)
        y0 = int(r * ch + ch * 0.02)
        x1 = int((c + 1) * cw - cw * 0.02)
        y1 = int((r + 1) * ch - ch * (0.02 + label_trim))
        cell = im.crop((x0, y0, x1, y1))
        cut = trim_and_pad(isolate(cell))
        webp = out_dir / f"{name}.webp"
        cut.save(webp, "WEBP", quality=92, method=4)
        rel = f"/assets/items/{out_dir.name}/{name}.webp"
        sprites[name] = {"x": 0, "y": 0, "w": TARGET, "h": TARGET, "src": rel}
        print(f"  {name} → {rel} ({webp.stat().st_size // 1024}KB)")
    return sprites


def main() -> None:
    print("Meals 3×3 (rembg)…")
    meals = cut_grid(SHEETS / "sheet_meals_3x3.jpg", MEALS, 3, 3, OUT_PREP, label_trim=0.0)
    print("Sides 3×4 (rembg)…")
    sides = cut_grid(SHEETS / "sheet_sides_3x4.jpg", SIDES, 4, 3, OUT_SIDE, label_trim=0.18)

    prev: dict = {}
    if MANIFEST.exists():
        try:
            prev = json.loads(MANIFEST.read_text(encoding="utf-8"))
        except Exception:
            prev = {}

    sprites = {**(prev.get("sprites") or {}), **meals, **sides}
    for k in list(sprites):
        if "banana" in k:
            del sprites[k]

    manifest = {
        "sheet": prev.get("sheet")
        or {"src": "/assets/game_asset_library.webp", "width": 1024, "height": 559},
        "hero": prev.get("hero")
        or {"src": "/assets/foodtruck_hero.webp", "width": 1024, "height": 559},
        "foodSheets": {
            "meals": "/assets/foodtruck_sheets/sheet_meals_3x3.jpg",
            "sides": "/assets/foodtruck_sheets/sheet_sides_3x4.jpg",
        },
        "sprites": sprites,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Manifest → {len(sprites)} sprites @ {MANIFEST}")


if __name__ == "__main__":
    main()
