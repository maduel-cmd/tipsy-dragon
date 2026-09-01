import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PRODUCTS } from "./catalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = join(root, "public");
const assets = JSON.parse(
  readFileSync(join(publicDir, "assets", "assets.json"), "utf8"),
) as { sprites: Record<string, { src?: string; w?: number; h?: number }> };

test("every catalog sprite resolves to an on-disk WebP", () => {
  for (const p of PRODUCTS) {
    assert.ok(p.sprite, `${p.id} missing sprite`);
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta?.src, `assets.json missing ${p.sprite}`);
    const abs = join(publicDir, meta.src.replace(/^\//, ""));
    assert.ok(existsSync(abs), `missing file for ${p.id}: ${meta.src}`);
  }
});

test("photorealistic showcase set is complete", () => {
  const ids = new Set(PRODUCTS.map((p) => p.id));
  for (const id of [
    "fries",
    "hotdog",
    "bbq_wings",
    "onion_rings",
    "pancakes",
    "draft_beer",
    "dipping_sauces",
    "tacos",
    "burger_double",
    "steak_ribeye",
  ]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
});
