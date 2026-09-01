import assert from "node:assert/strict";
import { test, before } from "node:test";
import { loadStation, saveStation, STATION_LABELS, type StationFocus } from "./fieldUx";

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

test("loadStation accepts all station kinds including seafood/pasta/asian", () => {
  const keys = Object.keys(STATION_LABELS) as StationFocus[];
  for (const id of keys) {
    saveStation(id);
    assert.equal(loadStation(), id, `expected station ${id}`);
  }
  saveStation("all");
  assert.equal(loadStation(), "all");
});

test("loadStation falls back to all on garbage", () => {
  localStorage.setItem("foodtruck.station", "not-a-station");
  assert.equal(loadStation(), "all");
});
