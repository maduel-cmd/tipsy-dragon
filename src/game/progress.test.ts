import assert from "node:assert/strict";
import { test, before } from "node:test";
import {
  appendUnlocks,
  clearProgressForTests,
  loadProgress,
  recordNightScore,
} from "./progress";

before(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

test("recordNightScore beats and keeps high score", () => {
  clearProgressForTests();
  const first = recordNightScore(120, 3);
  assert.equal(first.highScore, 120);
  assert.equal(first.beatHighScore, true);
  assert.equal(first.bestStage, 3);

  const lower = recordNightScore(50, 2);
  assert.equal(lower.highScore, 120);
  assert.equal(lower.beatHighScore, false);
  assert.equal(lower.bestStage, 3);

  const higher = recordNightScore(200, 5);
  assert.equal(higher.highScore, 200);
  assert.equal(higher.beatHighScore, true);
  assert.equal(higher.previousHighScore, 120);
  assert.equal(higher.bestStage, 5);
  assert.equal(higher.beatBestStage, true);
});

test("appendUnlocks journals kinds and items once", () => {
  clearProgressForTests();
  const a = appendUnlocks({ stage: 1, kind: "grill", itemIds: ["cheeseburger"] });
  assert.ok(a.some((e) => e.kind === "grill" && !e.itemId));
  assert.ok(a.some((e) => e.itemId === "cheeseburger"));

  const b = appendUnlocks({ stage: 4, kind: "grill", itemIds: ["cheeseburger", "fries"] });
  const grillKindRows = b.filter((e) => e.kind === "grill" && !e.itemId);
  assert.equal(grillKindRows.length, 1);
  assert.ok(b.some((e) => e.itemId === "fries"));
  assert.equal(b.filter((e) => e.itemId === "cheeseburger").length, 1);

  const snap = loadProgress();
  assert.equal(snap.journal.length, b.length);
});
