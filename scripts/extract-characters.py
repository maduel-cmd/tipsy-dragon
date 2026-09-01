#!/usr/bin/env python3
"""Extract modular character sprites → PNG/WebP + characters.json (Tipsy Dragon).

v2 crops: tight portrait boxes for bases; accessories still extracted for future use.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "assets" / "characters" / "modular_characters_sheet.jpg"
OUT = ROOT / "public" / "assets" / "characters" / "sprites"
MANIFEST = ROOT / "public" / "assets" / "characters" / "characters.json"
W, H = 1024, 572


def cell(x0: float, y0: float, cw: float, ch: float, c: int, r: int, pad: float = 0.1):
    x = x0 + c * cw
    y = y0 + r * ch
    return (
        int(round(x + cw * pad)),
        int(round(y + ch * pad)),
        int(round(cw * (1 - 2 * pad))),
        int(round(ch * (1 - 2 * pad))),
    )


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    assert im.size == (W, H), im.size
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*"):
        if old.suffix.lower() in {".png", ".webp", ".jpg"}:
            old.unlink()

    sprites: dict[str, dict] = {}

    def add(sid: str, category: str, gender: str, box: tuple[int, int, int, int]) -> None:
        x, y, w, h = box
        x = max(0, min(x, W - 1))
        y = max(0, min(y, H - 1))
        w = max(1, min(w, W - x))
        h = max(1, min(h, H - y))
        crop = im.crop((x, y, x + w, y + h))
        crop.save(OUT / f"{sid}.png", "PNG")
        crop.save(OUT / f"{sid}.webp", "WEBP", quality=92, method=4)
        sprites[sid] = {
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "src": f"/assets/characters/sprites/{sid}.webp",
            "category": category,
            "gender": gender,
        }

    # Kids — portrait cells (boy ~x50–108, girl ~x150–208)
    add("base_kid_0", "base", "kid", (50, 354, 58, 84))
    add("base_kid_1", "base", "kid", (148, 348, 60, 86))

    # Men: heads ~y68, feet ~y184 — narrow to avoid neighbor bleed
    for i, x in enumerate([26, 98, 170, 246]):
        add(f"base_man_{i}", "base", "man", (x, 68, 52, 116))

    # Women
    for i, x in enumerate([26, 98, 170, 242]):
        add(f"base_woman_{i}", "base", "woman", (x, 212, 52, 124))

    # Fully-assembled examples — slightly narrower
    for i, x in enumerate([26, 104, 182, 260]):
        add(f"example_{i}", "example", "any", (x, 456, 64, 102))

    # Hair / hats / glasses / clothes / accessories (for future mixer UI)
    for r in range(3):
        for c in range(2):
            add(f"hair_male_{r * 2 + c}", "hair", "man", cell(350, 70, 44, 48, c, r, 0.12))
    for r in range(3):
        for c in range(3):
            add(f"hair_female_{r * 3 + c}", "hair", "woman", cell(350, 258, 44, 46, c, r, 0.12))
    for c in range(2):
        add(f"hair_kid_{c}", "hair", "kid", cell(350, 375, 44, 40, c, 0, 0.12))

    for r in range(3):
        for c in range(3):
            add(f"hat_{r * 3 + c}", "hat", "any", cell(442, 70, 52, 48, c, r, 0.14))

    for r in range(3):
        for c in range(3):
            if r == 2 and c > 0:
                continue
            add(f"glasses_{r * 3 + c}", "glasses", "any", cell(442, 258, 52, 46, c, r, 0.14))

    for c in range(3):
        add(f"headphones_{c}", "headphones", "any", cell(442, 375, 52, 40, c, 0, 0.14))

    n = 0
    for r in range(4):
        for c in range(3):
            if n >= 11:
                break
            add(f"clothes_male_{n}", "clothes", "man", cell(630, 70, 50, 46, c, r, 0.12))
            n += 1
    for r in range(3):
        for c in range(3):
            add(f"clothes_kid_{r * 3 + c}", "clothes", "kid", cell(630, 258, 50, 46, c, r, 0.12))
    for r in range(4):
        for c in range(3):
            add(f"clothes_female_{r * 3 + c}", "clothes", "woman", cell(792, 70, 50, 46, c, r, 0.12))
    for r in range(4):
        for c in range(3):
            add(f"accessory_{r * 3 + c}", "accessory", "any", cell(792, 258, 50, 46, c, r, 0.12))

    manifest = {
        "sheet": {
            "src": "/assets/characters/modular_characters_sheet.webp",
            "width": W,
            "height": H,
        },
        "layerOrder": [
            "base",
            "clothes",
            "hair",
            "hat",
            "glasses",
            "headphones",
            "accessory",
        ],
        "anchors": {
            "hair": {"x": 0.5, "y": 0.05, "scale": 0.7},
            "hat": {"x": 0.5, "y": 0.0, "scale": 0.55},
            "glasses": {"x": 0.5, "y": 0.14, "scale": 0.45},
            "headphones": {"x": 0.5, "y": 0.08, "scale": 0.55},
            "accessory": {"x": 0.78, "y": 0.58, "scale": 0.32},
            "clothes": {"x": 0.5, "y": 0.42, "scale": 0.75},
        },
        "sprites": sprites,
    }

    im.save(SRC.with_suffix(".webp"), "WEBP", quality=90, method=4)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(sprites)} sprites → {OUT}")


if __name__ == "__main__":
    main()
