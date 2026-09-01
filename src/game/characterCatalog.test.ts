import assert from "node:assert/strict";
import { test } from "node:test";
import { randomCharacterLoadout, loadoutKey, listSprites } from "./characterCatalog";

test("randomCharacterLoadout returns gender + baseId", () => {
  const a = randomCharacterLoadout(1);
  assert.ok(a.baseId.length > 0, "baseId required");
  assert.ok(["man", "woman", "kid"].includes(a.gender), "gender");
  assert.ok(loadoutKey(a).includes(a.baseId));
});

test("without loaded manifest listSprites is empty but random still works", () => {
  assert.equal(listSprites("base").length, 0);
  const keys = new Set(Array.from({ length: 30 }, (_, i) => randomCharacterLoadout(1000 + i).baseId));
  assert.ok(keys.size >= 3, "seeded random should vary bases");
});
