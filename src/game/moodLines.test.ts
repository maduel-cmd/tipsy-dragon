import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOOD_LINES,
  moodFromPatienceRatio,
  moodLineCatalogSize,
  pickMoodLine,
} from "./moodLines";

test("mood catalog has ~60 cute lines across 3 moods", () => {
  assert.equal(MOOD_LINES.happy.length, 20);
  assert.equal(MOOD_LINES.sad.length, 20);
  assert.equal(MOOD_LINES.angry.length, 20);
  assert.equal(moodLineCatalogSize(), 60);
  for (const mood of ["happy", "sad", "angry"] as const) {
    for (const line of MOOD_LINES[mood]) {
      assert.ok(line.trim().length >= 8, `short line in ${mood}`);
    }
  }
});

test("patience ratio maps to moods", () => {
  assert.equal(moodFromPatienceRatio(1), "happy");
  assert.equal(moodFromPatienceRatio(0.55), "happy");
  assert.equal(moodFromPatienceRatio(0.54), "sad");
  assert.equal(moodFromPatienceRatio(0.3), "sad");
  assert.equal(moodFromPatienceRatio(0.29), "angry");
  assert.equal(moodFromPatienceRatio(0), "angry");
});

test("pickMoodLine is stable per customer+mood", () => {
  const a = pickMoodLine("cust-1", "happy");
  const b = pickMoodLine("cust-1", "happy");
  assert.equal(a, b);
  const angry = pickMoodLine("cust-1", "angry");
  assert.notEqual(a, angry);
  assert.ok(MOOD_LINES.angry.includes(angry));
});
