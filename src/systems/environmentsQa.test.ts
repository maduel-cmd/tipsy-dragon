/**
 * QA loop לסביבות — קטלוג, אסטים בדיסק, והזמנות מותרות בלבד.
 * (ללא Playwright — מריץ ב־tsx כמו שאר בדיקות הפרויקט)
 */
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { ENVIRONMENT_LIST, ENVIRONMENTS } from "../config/environments";
import { getStageConfig } from "../game/waves";
import {
  buildEnvOrderItems,
  shelfProductsForEnvironment,
  validateEnvironmentCatalog,
} from "../systems/orderSystem";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = path.join(root, "public");

test("all 6 environments are defined", () => {
  assert.equal(ENVIRONMENT_LIST.length, 6);
  assert.deepEqual(Object.keys(ENVIRONMENTS).sort(), [
    "circus",
    "forest_cart",
    "mall_food_court",
    "playground",
    "school_cafeteria",
    "urban_festival",
  ]);
});

for (const env of ENVIRONMENT_LIST) {
  test(`environment catalog valid: ${env.id}`, () => {
    const missing = validateEnvironmentCatalog(env);
    assert.deepEqual(missing, [], `missing ids for ${env.id}: ${missing.join(",")}`);
    assert.ok(env.allowedItemIds.length >= 3);
    assert.ok(env.popularItemIds.length >= 1);
    for (const id of env.popularItemIds) {
      assert.ok(env.allowedItemIds.includes(id), `popular ${id} must be allowed in ${env.id}`);
    }
  });

  test(`environment background asset exists: ${env.id}`, () => {
    const rel = env.backgroundAsset.replace(/^\//, "");
    const file = path.join(publicDir, rel);
    assert.ok(existsSync(file), `missing ${file}`);
    assert.ok(statSync(file).size > 1000, `too small: ${file}`);
  });

  test(`orders stay within allowed menu: ${env.id}`, () => {
    const stage = getStageConfig(5);
    const shelf = new Set(shelfProductsForEnvironment(env).map((p) => p.id));
    assert.ok(shelf.size >= 3);
    for (let i = 0; i < 80; i++) {
      const items = buildEnvOrderItems(env, stage);
      assert.ok(items.length >= 1);
      for (const id of items) {
        assert.ok(env.allowedItemIds.includes(id), `illegal ${id} in ${env.id}`);
        assert.ok(shelf.has(id));
      }
    }
  });

  test(`serving counter style defined: ${env.id}`, () => {
    assert.ok(["wood", "metal", "marble", "rustic_log"].includes(env.counterStyle.texture));
    assert.ok(env.counterStyle.dropShadow.includes("rgba") || env.counterStyle.dropShadow.includes("rgb"));
    assert.ok(env.customerSpawnRateMs >= 2000);
  });
}

test("popular items receive higher weight (statistical)", () => {
  const env = ENVIRONMENTS.circus;
  const stage = getStageConfig(1);
  const counts = new Map<string, number>();
  for (let i = 0; i < 600; i++) {
    const items = buildEnvOrderItems(env, { ...stage, itemCountMin: 1, itemCountMax: 1 });
    const id = items[0]!;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const popularHits = env.popularItemIds.reduce((s, id) => s + (counts.get(id) ?? 0), 0);
  const otherIds = env.allowedItemIds.filter((id) => !env.popularItemIds.includes(id));
  const otherHits = otherIds.reduce((s, id) => s + (counts.get(id) ?? 0), 0);
  const popularAvg = popularHits / env.popularItemIds.length;
  const otherAvg = otherHits / Math.max(1, otherIds.length);
  assert.ok(popularAvg > otherAvg * 1.4, `expected popular bias, got ${popularAvg} vs ${otherAvg}`);
});
