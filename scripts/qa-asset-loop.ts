/**
 * QA Asset Loop — בודק שכל ספרייט בקטלוג קיים ב־assets.json ובדיסק.
 * הרצה: npm run qa:assets -w @traillink/foodtruck-bar
 * אופציונלי: QA_LIVE_URL=https://traillink-foodtruck-bar.netlify.app npm run qa:assets
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/game/catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const assetsPath = join(publicDir, "assets", "assets.json");

const assets = JSON.parse(readFileSync(assetsPath, "utf8")) as {
  sprites: Record<string, { src?: string; w?: number; h?: number }>;
};

let failed = 0;

function check(label: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${label}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

console.log("\n=== Food Truck Visual & Asset QA Loop ===\n");

check("QA Check 1: catalog sprites map to assets.json", () => {
  assert.ok(PRODUCTS.length >= 12, "catalog too small");
  for (const p of PRODUCTS) {
    assert.ok(p.sprite, `${p.id} missing sprite`);
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta, `assets.json missing sprite key: ${p.sprite}`);
    assert.ok(meta.src, `${p.sprite} missing src`);
  }
});

check("QA Check 2: sprite files exist on disk (integrity)", () => {
  for (const p of PRODUCTS) {
    const meta = assets.sprites[p.sprite!];
    const rel = meta.src!.replace(/^\//, "");
    const abs = join(publicDir, rel);
    assert.ok(existsSync(abs), `404 on disk: ${meta.src} (product ${p.id})`);
  }
});

check("QA Check 3: prepared/sides assets are square-ish metadata", () => {
  for (const p of PRODUCTS) {
    const meta = assets.sprites[p.sprite!];
    if (!meta.src?.includes("/items/")) continue;
    assert.ok((meta.w ?? 0) >= 256, `${p.sprite} width too small`);
    assert.ok((meta.h ?? 0) >= 256, `${p.sprite} height too small`);
  }
});

check("QA Check 4: required showcase items present", () => {
  const required = [
    "fries",
    "hotdog",
    "bbq_wings",
    "onion_rings",
    "pancakes",
    "draft_beer",
    "dipping_sauces",
    "tacos",
  ];
  for (const id of required) {
    assert.ok(
      PRODUCTS.some((p) => p.id === id),
      `missing showcase product: ${id}`,
    );
  }
});

check("QA Check 4b: extended menu items present with files", () => {
  const extended = [
    "salmon_fillet",
    "fish_and_chips",
    "seafood_paella",
    "spaghetti_bolognese",
    "lasagna_slice",
    "pad_thai",
    "ramen_bowl",
    "shakshuka_pan",
    "hummus_plate",
    "shawarma_wrap",
    "fried_chicken_basket",
    "mac_and_cheese",
    "churros_plate",
    "tiramisu_slice",
    "chocolate_lava",
    "ice_cream_cone",
  ];
  for (const id of extended) {
    assert.ok(PRODUCTS.some((p) => p.id === id), `missing extended product: ${id}`);
    const meta = assets.sprites[id];
    assert.ok(meta?.src, `assets.json missing ${id}`);
    const abs = join(publicDir, meta.src!.replace(/^\//, ""));
    assert.ok(existsSync(abs), `404 extended asset: ${meta.src}`);
  }
});

async function checkLive(): Promise<void> {
  const liveUrl = process.env.QA_LIVE_URL;
  if (!liveUrl) return;

  const liveFailures: string[] = [];
  for (const p of PRODUCTS) {
    const meta = assets.sprites[p.sprite!];
    const url = new URL(meta.src!, liveUrl).href;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) liveFailures.push(`${p.id} → ${url} (${res.status})`);
    } catch (e) {
      liveFailures.push(`${p.id} → ${url} (${e instanceof Error ? e.message : e})`);
    }
  }
  if (liveFailures.length) {
    failed += 1;
    console.error(`✗ QA Check 5: live HTTP assets @ ${liveUrl}`);
    for (const line of liveFailures.slice(0, 20)) console.error("  ", line);
    if (liveFailures.length > 20) {
      console.error(`  … +${liveFailures.length - 20} more`);
    }
  } else {
    console.log(`✓ QA Check 5: live HTTP assets @ ${liveUrl}`);
  }
}

await checkLive();

console.log("");
if (failed > 0) {
  console.error(`QA FAILED · ${failed} check(s)`);
  process.exit(1);
}
console.log("QA PASSED · 100%");
