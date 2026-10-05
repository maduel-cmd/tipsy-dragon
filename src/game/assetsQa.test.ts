import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PRODUCTS } from "./catalog";
import { ENVIRONMENT_LIST, decorContainsEmoji } from "../config/environments";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = join(root, "public");
const assets = JSON.parse(
  readFileSync(join(publicDir, "assets", "assets.json"), "utf8"),
) as { sprites: Record<string, { src?: string; w?: number; h?: number }> };

const productArtSrc = readFileSync(join(root, "src/components/ProductArt.tsx"), "utf8");
const envSelectorSrc = readFileSync(join(root, "src/components/EnvironmentSelector.tsx"), "utf8");
const environmentsSrc = readFileSync(join(root, "src/config/environments.ts"), "utf8");

test("every catalog sprite resolves to an on-disk WebP", () => {
  for (const p of PRODUCTS) {
    assert.ok(p.sprite, `${p.id} missing sprite`);
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta?.src, `assets.json missing ${p.sprite}`);
    const abs = join(publicDir, meta.src.replace(/^\//, ""));
    assert.ok(existsSync(abs), `missing file for ${p.id}: ${meta.src}`);
    assert.ok(statSync(abs).size > 256, `tiny file for ${p.id}`);
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

test("anti-placeholder: catalog products with sprite must not ship emoji-only UI in prod", () => {
  for (const p of PRODUCTS) {
    assert.ok(p.sprite, `${p.id} must declare sprite (emoji alone banned in prod)`);
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta?.src, `${p.id} sprite key missing from assets.json`);
    assert.ok(
      meta.src.includes("/items/"),
      `${p.id} must use photoreal /items/ art, got ${meta.src}`,
    );
    assert.ok((meta.w ?? 0) >= 256, `${p.id} width < 256`);
    assert.ok((meta.h ?? 0) >= 256, `${p.id} height < 256`);
  }
  assert.ok(
    productArtSrc.includes("allowEmojiFallback"),
    "ProductArt must gate emoji fallback behind allowEmojiFallback()",
  );
  assert.ok(
    productArtSrc.includes("asset-missing"),
    "ProductArt must render non-emoji missing state in prod",
  );
  assert.ok(
    !productArtSrc.includes("emoji-fallback") || productArtSrc.includes("allowEmojiFallback"),
    "emoji-fallback class must be DEV-gated",
  );
});

test("anti-placeholder: environment selector uses icon assets, not emoji decor", () => {
  assert.ok(envSelectorSrc.includes("iconAsset"), "EnvironmentSelector must use iconAsset");
  assert.ok(!envSelectorSrc.includes("env-emoji"), "EnvironmentSelector must not render env-emoji");
  assert.ok(!envSelectorSrc.includes("{e.decor}"), "EnvironmentSelector must not show decor emoji");
  for (const env of ENVIRONMENT_LIST) {
    assert.ok(!decorContainsEmoji(env.decor), `${env.id} decor still contains emoji`);
    const icon = join(publicDir, env.iconAsset.replace(/^\//, ""));
    assert.ok(existsSync(icon), `missing icon ${env.iconAsset}`);
    assert.ok(statSync(icon).size > 500, `icon too small ${env.iconAsset}`);
  }
});

test("legacy public/assets/sprites only keeps UI overlays (archived food plates)", () => {
  const spritesDir = join(publicDir, "assets", "sprites");
  const files = readdirSync(spritesDir).filter((f) => !f.startsWith("."));
  const allowed = new Set([
    "cursor_neon.webp",
    "cursor_neon.jpg",
    "overlay_lights.webp",
    "overlay_lights.jpg",
  ]);
  for (const f of files) {
    assert.ok(allowed.has(f), `unexpected live sprite (archive it): ${f}`);
  }
  for (const key of Object.keys(assets.sprites)) {
    const src = assets.sprites[key]?.src ?? "";
    if (src.includes("/sprites/")) {
      assert.ok(
        key === "cursor_neon" || key === "overlay_lights",
        `assets.json still maps legacy plate ${key} → ${src}`,
      );
    }
  }
  assert.ok(
    existsSync(join(root, "archive/legacy-sprites")),
    "archive/legacy-sprites missing after T2",
  );
});

test("promo pack + og image exist for store listing", () => {
  for (const rel of [
    "public/promo/og.jpg",
    "public/promo/01-hero-truck.jpg",
    "public/promo/02-circus-night.jpg",
    "public/promo/03-urban-festival.jpg",
    "public/promo/04-forest-cart.jpg",
    "docs/promo/README.md",
  ]) {
    const abs = join(root, rel);
    assert.ok(existsSync(abs), `missing ${rel}`);
    if (rel.endsWith(".jpg")) assert.ok(statSync(abs).size > 10_000, `${rel} too small`);
  }
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.ok(html.includes('property="og:image"'), "index.html missing og:image");
  assert.ok(html.includes("/promo/og.jpg"), "og:image should point at /promo/og.jpg");
});

test("T11 catalog completeness: every PRODUCT sprite under items/ prepared|sides", () => {
  assert.ok(PRODUCTS.length >= 28, `expected full menu, got ${PRODUCTS.length}`);
  for (const p of PRODUCTS) {
    const meta = assets.sprites[p.sprite!];
    assert.ok(meta?.src, `${p.id} missing assets.json entry`);
    assert.match(
      meta.src,
      /\/assets\/items\/(prepared|sides)\//,
      `${p.id} not under items/prepared|sides`,
    );
  }
});

test("environments.ts documents icon + mobile paths", () => {
  assert.ok(environmentsSrc.includes("iconAsset"));
  assert.ok(environmentsSrc.includes("mobileBackgroundAsset"));
  assert.ok(environmentsSrc.includes("decorContainsEmoji"));
});
