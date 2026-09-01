import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTS, getProduct } from "./catalog";
import {
  ordersMatch,
  buildOrderItems,
  buildOrderItemsRange,
  getStageConfig,
  shelfProductsForStage,
  unlockedFoodKindsForStage,
  orderPatternForStage,
  distributeTrayToGroup,
  type CustomerOrder,
} from "./waves";

test("ordersMatch ignores item order", () => {
  assert.equal(ordersMatch(["a", "b"], ["b", "a"]), true);
  assert.equal(ordersMatch(["a", "b"], ["a", "b", "c"]), false);
  assert.equal(ordersMatch(["a"], ["b"]), false);
});

function fakeCustomer(id: string, items: string[], deadlineAt = 1000): CustomerOrder {
  return {
    id,
    face: "😊",
    character: {
      gender: "woman",
      baseId: "w1",
    },
    items,
    createdAt: 0,
    deadlineAt,
    timeLimitMs: 1000,
  };
}

test("distributeTrayToGroup splits items across two customers", () => {
  const a = fakeCustomer("a", ["burger", "fries"], 100);
  const b = fakeCustomer("b", ["beer"], 200);
  const result = distributeTrayToGroup(["burger", "fries", "beer"], [a, b]);
  assert.equal(result.matchedCount, 3);
  assert.equal(result.unusedItems.length, 0);
  assert.equal(result.fulfilledCustomers.length, 2);
  assert.equal(result.remainingCustomers.length, 0);
});

test("distributeTrayToGroup supports partial serve", () => {
  const a = fakeCustomer("a", ["burger", "fries", "beer"], 100);
  const result = distributeTrayToGroup(["burger"], [a]);
  assert.equal(result.matchedCount, 1);
  assert.equal(result.fulfilledCustomers.length, 0);
  assert.deepEqual(result.remainingCustomers[0]?.items, ["fries", "beer"]);
});

test("partial serve adds 3 seconds to remaining customer timer", () => {
  const a = fakeCustomer("a", ["burger", "fries"], 10_000);
  a.timeLimitMs = 20_000;
  const result = distributeTrayToGroup(["burger"], [a]);
  assert.equal(result.partialTimeBonusCount, 1);
  assert.equal(result.remainingCustomers[0]?.deadlineAt, 13_000);
  assert.equal(result.remainingCustomers[0]?.timeLimitMs, 23_000);
});

test("full serve does not add partial time bonus", () => {
  const a = fakeCustomer("a", ["burger"], 10_000);
  a.timeLimitMs = 20_000;
  const result = distributeTrayToGroup(["burger"], [a]);
  assert.equal(result.fulfilledCustomers.length, 1);
  assert.equal(result.partialTimeBonusCount, 0);
  assert.equal(result.remainingCustomers.length, 0);
});

test("distributeTrayToGroup prefers selected customer when both need item", () => {
  const a = fakeCustomer("a", ["fries"], 50);
  const b = fakeCustomer("b", ["fries"], 10);
  const result = distributeTrayToGroup(["fries"], [a, b], "a");
  assert.equal(result.fulfilledCustomers[0]?.id, "a");
  assert.deepEqual(result.remainingCustomers[0]?.items, ["fries"]);
  assert.equal(result.remainingCustomers[0]?.id, "b");
});

test("distributeTrayToGroup leaves unused wrong items", () => {
  const a = fakeCustomer("a", ["burger"], 100);
  const result = distributeTrayToGroup(["burger", "sushi"], [a]);
  assert.equal(result.matchedCount, 1);
  assert.deepEqual(result.unusedItems, ["sushi"]);
  assert.equal(result.fulfilledCustomers.length, 1);
});

test("early stages are beginner-friendly", () => {
  const s1 = getStageConfig(1);
  assert.equal(s1.groupSize, 1);
  assert.equal(s1.itemCountMax, 1);
  assert.ok(s1.timePerOrderMs >= 20000);
  assert.deepEqual(s1.unlockedFoodKinds, ["grill"]);
  assert.equal(s1.drinksUnlocked, false);
  assert.equal(s1.orderPattern, "food_only");
});

test("unlocks food kinds progressively every 3 stages", () => {
  assert.deepEqual(unlockedFoodKindsForStage(1), ["grill"]);
  assert.deepEqual(unlockedFoodKindsForStage(3), ["grill"]);
  assert.deepEqual(unlockedFoodKindsForStage(4), ["grill", "side"]);
  assert.deepEqual(unlockedFoodKindsForStage(6), ["grill", "side"]);
  assert.deepEqual(unlockedFoodKindsForStage(7), ["grill", "side", "breakfast"]);
  assert.equal(getStageConfig(4).newlyUnlockedKind, "side");
  assert.equal(getStageConfig(7).newlyUnlockedKind, "breakfast");
  assert.equal(getStageConfig(5).newlyUnlockedKind, null);
});

test("unlocks more dishes within each menu kind over stages", () => {
  const s1 = getStageConfig(1);
  const s2 = getStageConfig(2);
  const s3 = getStageConfig(3);
  const grill1 = shelfProductsForStage(s1).filter((p) => p.kind === "grill");
  const grill2 = shelfProductsForStage(s2).filter((p) => p.kind === "grill");
  const grill3 = shelfProductsForStage(s3).filter((p) => p.kind === "grill");
  assert.equal(grill1.length, 2);
  assert.equal(grill2.length, 3);
  assert.equal(grill3.length, 4);
  assert.ok(s2.newlyUnlockedItemIds.length >= 1);

  const s4 = getStageConfig(4);
  const sides = shelfProductsForStage(s4).filter((p) => p.kind === "side");
  assert.equal(sides.length, 2);
  assert.ok(shelfProductsForStage(s4).length > shelfProductsForStage(s3).length);
});

test("order patterns escalate within unlock cycles", () => {
  assert.equal(orderPatternForStage(1), "food_only");
  assert.equal(orderPatternForStage(2), "food_or_drink");
  assert.equal(orderPatternForStage(3), "one_kind_plus_drink");
  assert.equal(getStageConfig(2).drinksUnlocked, true);
});

test("stages get harder endlessly", () => {
  const early = getStageConfig(2);
  const mid = getStageConfig(8);
  const late = getStageConfig(20);
  assert.ok(mid.groupSize >= early.groupSize);
  assert.ok(late.groupSize >= mid.groupSize);
  assert.ok(late.timePerOrderMs < early.timePerOrderMs);
  assert.ok(late.itemCountMax >= early.itemCountMax);
  assert.equal(getStageConfig(100).stage, 100);
  assert.ok(late.unlockedFoodKinds.length >= 3);
  assert.ok(getStageConfig(30).unlockedFoodKinds.length >= 8);
});

test("buildOrderItems only uses unlocked shelf products", () => {
  for (const stageNum of [1, 2, 3, 5, 7, 12]) {
    const cfg = getStageConfig(stageNum);
    const shelf = new Set(shelfProductsForStage(cfg).map((p) => p.id));
    for (let i = 0; i < 30; i++) {
      const items = buildOrderItems(cfg);
      assert.ok(items.length >= cfg.itemCountMin);
      assert.ok(items.length <= cfg.itemCountMax);
      for (const id of items) {
        assert.ok(shelf.has(id), `stage ${stageNum}: unexpected ${id}`);
      }
    }
  }
});

test("stage 1 orders are grill food only", () => {
  const cfg = getStageConfig(1);
  for (let i = 0; i < 25; i++) {
    const items = buildOrderItems(cfg);
    assert.equal(items.length, 1);
    const p = getProduct(items[0]!);
    assert.ok(p);
    assert.equal(p!.kind, "grill");
  }
});

test("combo stages include drink when pattern requires", () => {
  const cfg = getStageConfig(3);
  assert.equal(cfg.orderPattern, "one_kind_plus_drink");
  let sawDrink = false;
  for (let i = 0; i < 40; i++) {
    const items = buildOrderItems(cfg);
    if (items.some((id) => getProduct(id)?.kind === "drink")) sawDrink = true;
    const foodKinds = new Set(
      items.map((id) => getProduct(id)?.kind).filter((k) => k && k !== "drink"),
    );
    assert.ok(foodKinds.size <= 1, "one_kind_plus_drink should use at most one food kind");
  }
  assert.ok(sawDrink);
});

test("buildOrderItemsRange respects bounds (legacy)", () => {
  for (let i = 0; i < 20; i++) {
    const items = buildOrderItemsRange(2, 3);
    assert.ok(items.length >= 2 && items.length <= 3);
    assert.equal(new Set(items).size, items.length);
  }
});

test("catalog includes photorealistic Food Truck menu", () => {
  assert.ok(PRODUCTS.some((p) => p.kind === "grill"));
  assert.ok(PRODUCTS.some((p) => p.kind === "breakfast"));
  assert.ok(PRODUCTS.some((p) => p.kind === "side"));
  assert.ok(PRODUCTS.some((p) => p.kind === "drink"));
  assert.ok(PRODUCTS.length >= 28);
  assert.ok(PRODUCTS.some((p) => p.id === "burger_double"));
  assert.ok(PRODUCTS.some((p) => p.id === "fries"));
  assert.ok(PRODUCTS.some((p) => p.id === "draft_beer"));
  assert.ok(PRODUCTS.every((p) => p.sprite));
});
