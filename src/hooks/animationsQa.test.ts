/**
 * QA לאנימציות — קיום CSS, reduced-motion, ואירוע test:complete-order.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const animCss = path.join(root, "src/styles/animations.css");
const appTsx = path.join(root, "src/App.tsx");
const hookTs = path.join(root, "src/hooks/useFloatingScores.ts");

test("animations.css exists with GPU keyframes", () => {
  assert.ok(existsSync(animCss));
  const css = readFileSync(animCss, "utf8");
  for (const name of [
    "elasticSnap",
    "floatReward",
    "smokeRise",
    "heatPulse",
    "envParallaxIn",
    "juiceShake",
    "sparkFly",
    "coinArc",
    "customerEnter",
    "comboGlow",
  ]) {
    assert.ok(css.includes(`@keyframes ${name}`), `missing ${name}`);
  }
  assert.ok(css.includes("translate3d"));
  assert.ok(css.includes("will-change"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes(".item-snap"));
  assert.ok(css.includes(".floating-score"));
  assert.ok(css.includes(".draggable-item"));
  assert.ok(css.includes(".drop-zone"));
  assert.ok(css.includes(".cooking-station"));
  assert.ok(css.includes(".juice-layer"));
});

test("animations avoid layout-thrash properties in keyframes", () => {
  const css = readFileSync(animCss, "utf8");
  const re = /@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  let found = 0;
  while ((match = re.exec(css)) !== null) {
    found += 1;
    const body = match[1] ?? "";
    assert.doesNotMatch(
      body,
      /^\s*(top|left|width|height)\s*:/m,
      `layout props animated in keyframe block #${found}`,
    );
  }
  assert.ok(found >= 10, `expected keyframes, found ${found}`);
});

test("App wires pointer drag tray↔shelf, juice, cooking particles, floating scores", () => {
  const src = readFileSync(appTsx, "utf8");
  assert.ok(src.includes("useFloatingScores"));
  assert.ok(src.includes("spawnFloatingScore"));
  assert.ok(src.includes("useTrayShelfPointerDrag"));
  assert.ok(src.includes("useGameJuice"));
  assert.ok(src.includes("triggerServe"));
  assert.ok(src.includes('data-drop="tray"'));
  assert.ok(src.includes('data-drop="shelf"'));
  assert.ok(src.includes("draggable-item"));
  assert.ok(src.includes("drop-zone"));
  assert.ok(src.includes("cooking-particles"));
  assert.ok(src.includes("item-snap"));
  assert.ok(src.includes("timer-fill-gpu"));
  assert.ok(src.includes("patience-ring"));
  assert.ok(src.includes("juice-layer"));
  assert.ok(src.includes("pickMoodLine"));
  assert.ok(src.includes("customer-speech"));
  assert.ok(src.includes("PwaUpdateBanner"));
  assert.ok(src.includes("recordNightScore"));
  assert.ok(src.includes("appendUnlocks"));
  assert.ok(src.includes("takeFromShelf"));
  assert.ok(src.includes("startShelfPrep"));
  assert.ok(src.includes("sfxCombo"));
  assert.ok(src.includes("highscore-banner"));
  assert.ok(src.includes("unlock-journal"));
});

test("useGameJuice exposes tiered triggers", () => {
  const juice = path.join(root, "src/hooks/useGameJuice.ts");
  assert.ok(existsSync(juice));
  const src = readFileSync(juice, "utf8");
  assert.ok(src.includes("triggerServe"));
  assert.ok(src.includes("triggerWrong"));
  assert.ok(src.includes("triggerMiss"));
  assert.ok(src.includes("perfect"));
  assert.ok(src.includes("900"));
});

test("floating score hook exposes test:complete-order", () => {
  const src = readFileSync(hookTs, "utf8");
  assert.ok(src.includes("test:complete-order"));
  assert.ok(src.includes("850"));
});

test("cursor animation rule file exists", () => {
  assert.ok(existsSync(path.join(root, ".cursor/rules/foodtruck-animations.mdc")));
});
