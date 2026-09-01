#!/usr/bin/env python3
"""Extract Tipsy Dragon sprites from game_asset_library.jpg into public/assets/sprites/."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "public/assets/game_asset_library.jpg"
OUT = ROOT / "public/assets/sprites"
MANIFEST = ROOT / "public/assets/assets.json"

# Absolute crops on the 1024×559 sheet: name -> (x, y, w, h)
CROPS: dict[str, tuple[int, int, int, int]] = {
    "bg_square": (8, 8, 320, 185),
    "bg_kitchen": (335, 8, 300, 185),
    "tex_cobble": (645, 8, 155, 185),
    "overlay_lights": (810, 8, 170, 120),
    "cursor_neon": (930, 125, 85, 85),
    "ramen_classic": (52, 208, 150, 145),
    "ramen_spicy": (218, 218, 138, 138),
    "ramen_vegan": (368, 220, 135, 138),
    "dish_yakitori": (210, 355, 155, 128),
    "dish_karaage": (375, 360, 115, 90),
    "dish_gyoza": (512, 348, 98, 88),
    "sushi_rolls": (525, 205, 170, 125),
    "sushi_nigiri": (712, 212, 128, 92),
    "sashimi_platter": (848, 220, 100, 120),
    "drink_whisky_glass": (562, 432, 82, 118),
    "drink_cocktail_yuzu": (728, 400, 90, 145),
    "drink_beer_can": (932, 395, 88, 160),
    "drink_wine_bottle": (872, 328, 68, 226),
}


def main() -> None:
    sheet = Image.open(SHEET).convert("RGB")
    w, h = sheet.size
    OUT.mkdir(parents=True, exist_ok=True)
    debug = sheet.copy()
    draw = ImageDraw.Draw(debug)
    sprites: dict = {}

    for name, (x, y, cw, ch) in CROPS.items():
        x2, y2 = min(w, x + cw), min(h, y + ch)
        crop = sheet.crop((x, y, x2, y2))
        crop.save(OUT / f"{name}.jpg", quality=92)
        crop.save(OUT / f"{name}.webp", "WEBP", quality=86)
        draw.rectangle([x, y, x2 - 1, y2 - 1], outline=(0, 255, 80), width=2)
        sprites[name] = {
            "x": x,
            "y": y,
            "w": x2 - x,
            "h": y2 - y,
            "src": f"/assets/sprites/{name}.webp",
        }
        print(f"{name}: {x},{y} {x2 - x}x{y2 - y}")

    MANIFEST.write_text(
        json.dumps(
            {
                "sheet": {"src": "/assets/game_asset_library.webp", "width": w, "height": h},
                "hero": {"src": "/assets/foodtruck_hero.webp", "width": 1024, "height": 559},
                "sprites": sprites,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    debug.save(OUT / "DEBUG_crop_boxes.jpg", quality=90)
    print(f"wrote {MANIFEST}")


if __name__ == "__main__":
    main()
