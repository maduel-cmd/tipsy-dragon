/**
 * QA Asset Loop — בודק שכל ספרייט בקטלוג קיים ב־assets.json ובדיסק.
 * הרצה: npm run qa:assets
 * חי (HEAD): QA_LIVE_URL=https://traillink-foodtruck-bar.netlify.app npm run qa:live
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/game/catalog.ts";
import {
  ENVIRONMENT_LIST,
  decorContainsEmoji,
} from "../src/config/environments.ts";

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

check("QA Check 4c: no prod emoji placeholder when sprite exists", () => {
  const productArt = readFileSync(join(root, "src/components/ProductArt.tsx"), "utf8");
  assert.ok(productArt.includes("allowEmojiFallback"), "ProductArt missing DEV gate");
  for (const p of PRODUCTS) {
    assert.ok(p.sprite, `${p.id}: sprite required (emoji-only banned in prod)`);
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta?.src?.includes("/items/"), `${p.id}: must use /items/ art`);
  }
  for (const env of ENVIRONMENT_LIST) {
    assert.ok(!decorContainsEmoji(env.decor), `${env.id}: decor emoji banned`);
    const icon = join(publicDir, env.iconAsset.replace(/^\//, ""));
    assert.ok(existsSync(icon), `missing env icon ${env.iconAsset}`);
  }
});

check("QA Check 4d: legacy sprites archived out of public build", () => {
  const live = readdirSync(join(publicDir, "assets", "sprites"));
  for (const f of live) {
    assert.ok(
      /^(cursor_neon|overlay_lights)\.(webp|jpg)$/.test(f),
      `legacy plate still in public/assets/sprites: ${f}`,
    );
  }
  assert.ok(existsSync(join(root, "archive/legacy-sprites")), "archive folder missing");
});

check("QA Check 4e: promo + og image on disk", () => {
  for (const rel of [
    "public/promo/og.jpg",
    "public/promo/01-hero-truck.jpg",
    "public/promo/02-circus-night.jpg",
    "public/promo/03-urban-festival.jpg",
  ]) {
    const abs = join(root, rel);
    assert.ok(existsSync(abs), `missing ${rel}`);
    assert.ok(statSync(abs).size > 10_000, `${rel} too small`);
  }
});

check("QA Check 4f: environment desktop + mobile + icon assets", () => {
  for (const env of ENVIRONMENT_LIST) {
    for (const rel of [env.backgroundAsset, env.mobileBackgroundAsset, env.iconAsset]) {
      const abs = join(publicDir, rel.replace(/^\//, ""));
      assert.ok(existsSync(abs), `404 env asset ${rel}`);
      assert.ok(statSync(abs).size > 1000, `too small ${rel}`);
    }
  }
});

async function checkLive(): Promise<void> {
  const liveUrl = process.env.QA_LIVE_URL;
  if (!liveUrl) {
    if (process.env.QA_LIVE_REQUIRED === "1") {
      failed += 1;
      console.error("✗ QA Check 5: QA_LIVE_URL required (qa:live)");
    }
    return;
  }

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
  // also probe og image when present on live (may 404 until deploy — warn only if required)
  try {
    const og = new URL("/promo/og.jpg", liveUrl).href;
    const res = await fetch(og, { method: "HEAD" });
    if (!res.ok && process.env.QA_LIVE_STRICT_PROMO === "1") {
      liveFailures.push(`og:image → ${og} (${res.status})`);
    } else if (!res.ok) {
      console.log(`⚠ live promo og.jpg not deployed yet @ ${og} (${res.status}) — ok pre-merge`);
    }
  } catch {
    /* ignore optional promo HEAD */
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
