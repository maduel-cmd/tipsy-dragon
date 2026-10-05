/**
 * iPhone viewport fit — CSS contract + scrollHeight regression gate.
 * Prevents page-level scroll to reach products on phone portrait sizes.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cssPath = path.join(root, "src/styles.css");
const appPath = path.join(root, "src/App.tsx");
const htmlPath = path.join(root, "index.html");
const qaScript = path.join(root, "scripts/qa-iphone-viewport.ts");

test("iphone viewport CSS locks document to 100dvh without page scroll", () => {
  const css = readFileSync(cssPath, "utf8");

  // Document / shell height lock
  assert.match(css, /html[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /#root\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*?max-height:\s*100dvh/);
  assert.match(css, /\.content-layer\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.game-screen\.thumb-layout\s*\{[\s\S]*?min-height:\s*0/);

  // Must NOT unbounded-grow shelf on mobile (the original defect)
  assert.doesNotMatch(
    css,
    /@media\s*\([^)]*max-width:\s*859px[^)]*\)\s*\{[^}]*\.shelf\s*\{[^}]*max-height:\s*none/s,
    "mobile .shelf must not use max-height:none (causes page scroll)",
  );
  // Stronger: any .shelf { max-height: none } inside a max-width phone query
  const phoneMedia = css.split("@media").filter((chunk) => /max-width:\s*859px/.test(chunk));
  for (const chunk of phoneMedia) {
    const shelfIdx = chunk.indexOf(".shelf");
    if (shelfIdx < 0) continue;
    const brace = chunk.indexOf("{", shelfIdx);
    const end = chunk.indexOf("}", brace);
    if (brace < 0 || end < 0) continue;
    const shelfBody = chunk.slice(brace, end + 1);
    assert.doesNotMatch(
      shelfBody,
      /max-height:\s*none/,
      "phone media .shelf rule must stay height-bounded",
    );
  }

  // Internal shelf scroll is OK / required
  assert.match(css, /\.shelf\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.play-scroll\s*\{[\s\S]*?overflow:\s*hidden/);

  // Finger-friendly targets on phone
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("viewport meta uses viewport-fit=cover for notches", () => {
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /viewport-fit=cover/);
});

test("game screen exposes test id for viewport QA", () => {
  const app = readFileSync(appPath, "utf8");
  assert.match(app, /data-testid="game-screen"/);
  assert.match(app, /data-testid="ingredient-slot"/);
});

test("runtime iphone viewport QA script exists", () => {
  assert.ok(existsSync(qaScript), "scripts/qa-iphone-viewport.ts missing");
  const src = readFileSync(qaScript, "utf8");
  assert.match(src, /scrollHeight/);
  assert.match(src, /375/);
  assert.match(src, /390/);
  assert.match(src, /667/);
  assert.match(src, /844/);
});
