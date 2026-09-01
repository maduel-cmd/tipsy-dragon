import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTS } from "./catalog";
import { ordersMatch, buildOrderItems, getStageConfig } from "./waves";

test("ordersMatch ignores item order", () => {
  assert.equal(ordersMatch(["a", "b"], ["b", "a"]), true);
  assert.equal(ordersMatch(["a", "b"], ["a", "b", "c"]), false);
  assert.equal(ordersMatch(["a"], ["b"]), false);
});

test("early stages are beginner-friendly", () => {
  const s1 = getStageConfig(1);
  assert.equal(s1.groupSize, 1);
  assert.equal(s1.itemCountMax, 1);
  assert.ok(s1.timePerOrderMs >= 20000);
});

test("stages get harder endlessly", () => {
  const early = getStageConfig(2);
  const mid = getStageConfig(8);
  const late = getStageConfig(20);
  assert.ok(mid.groupSize >= early.groupSize);
  assert.ok(late.groupSize >= mid.groupSize);
  assert.ok(late.timePerOrderMs < early.timePerOrderMs);
  assert.ok(late.itemCountMax >= early.itemCountMax);
  // endless: any stage number is valid
  assert.equal(getStageConfig(100).stage, 100);
});

test("buildOrderItems respects bounds", () => {
  for (let i = 0; i < 20; i++) {
    const items = buildOrderItems(2, 3);
    assert.ok(items.length >= 2 && items.length <= 3);
    assert.equal(new Set(items).size, items.length);
  }
});

test("catalog includes hot food and expanded menu", () => {
  assert.ok(PRODUCTS.some((p) => p.kind === "hot"));
  assert.ok(PRODUCTS.length >= 24);
  assert.ok(PRODUCTS.some((p) => p.id === "hot-burger"));
  assert.ok(PRODUCTS.some((p) => p.id === "ice-strawberry"));
});
