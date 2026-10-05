/**
 * Runtime iPhone viewport gate — fails if document/body page-scrolls
 * while the main game screen is open.
 *
 * Usage:
 *   npm run build && npm run preview -- --host 127.0.0.1 --port 4173 &
 *   PLAY_URL=http://127.0.0.1:4173 npm run qa:iphone
 *
 * Or: npm run qa:iphone  (starts preview automatically)
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14/15", width: 390, height: 844 },
];

const BASE =
  process.env.PLAY_URL?.replace(/\/$/, "") ??
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:4173";

async function waitForServer(url: string, ms = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error(`Server not ready at ${url}`);
}

async function ensurePreview(): Promise<ChildProcess | null> {
  if (process.env.PLAY_URL || process.env.PLAYWRIGHT_BASE_URL) {
    await waitForServer(BASE);
    return null;
  }
  const child = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"], cwd: process.cwd(), detached: true },
  );
  await waitForServer(BASE);
  return child;
}

type Page = {
  setViewport: (v: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
  goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForSelector: (sel: string, opts?: Record<string, unknown>) => Promise<unknown>;
  click: (sel: string) => Promise<void>;
  evaluate: <T>(fn: () => T | Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

type Browser = {
  newPage: () => Promise<Page>;
  close: () => Promise<void>;
};

type PuppeteerModule = {
  launch: (opts: Record<string, unknown>) => Promise<Browser>;
};

async function loadPuppeteer(): Promise<PuppeteerModule> {
  try {
    return require("puppeteer-core") as PuppeteerModule;
  } catch {
    throw new Error("puppeteer-core required — run npm install");
  }
}

async function assertNoPageScroll(page: Page, vp: Viewport): Promise<void> {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/?env=circus&v=iphone-fit`, {
    waitUntil: "networkidle0",
    timeout: 45000,
  });

  // Real input click — evaluate().click() does not reliably fire React onClick here
  await page.waitForSelector("button.btn-hero", { timeout: 15000 });
  await page.click("button.btn-hero");

  await page.waitForSelector('[data-testid="game-screen"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="ingredient-slot"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid^="product-"]', { timeout: 10000 });

  // Dismiss tip if present (frees vertical space; still must not page-scroll either way)
  await page.evaluate(() => {
    const tipBtn = [...document.querySelectorAll("button")].find((b) =>
      /הבנתי/.test(b.textContent ?? ""),
    );
    tipBtn?.click();
  });
  await sleep(250);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const shelf = document.querySelector('[data-testid="ingredient-slot"]') as HTMLElement | null;
    const game = document.querySelector('[data-testid="game-screen"]') as HTMLElement | null;
    const products = [...document.querySelectorAll('[data-testid^="product-"]')] as HTMLElement[];
    const minTap = products.reduce((m, el) => {
      const r = el.getBoundingClientRect();
      return Math.min(m, r.height);
    }, Number.POSITIVE_INFINITY);

    return {
      docScroll: doc.scrollHeight,
      docClient: doc.clientHeight,
      bodyScroll: body.scrollHeight,
      bodyClient: body.clientHeight,
      bodyOverflow: getComputedStyle(body).overflow,
      htmlOverflow: getComputedStyle(doc).overflow,
      gameHeight: game?.getBoundingClientRect().height ?? 0,
      shelfVisible: shelf
        ? (() => {
            const r = shelf.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0 && r.height > 20;
          })()
        : false,
      productCount: products.length,
      minProductHeight: Number.isFinite(minTap) ? minTap : 0,
      innerHeight: window.innerHeight,
    };
  });

  console.log(`  ${vp.name} ${vp.width}×${vp.height}:`, metrics);

  assert.equal(metrics.htmlOverflow, "hidden", `${vp.name}: html overflow must be hidden`);
  assert.equal(metrics.bodyOverflow, "hidden", `${vp.name}: body overflow must be hidden`);
  assert.ok(
    metrics.docScroll <= metrics.docClient + 1,
    `${vp.name}: document scrollHeight ${metrics.docScroll} > clientHeight ${metrics.docClient}`,
  );
  assert.ok(
    metrics.bodyScroll <= metrics.bodyClient + 1,
    `${vp.name}: body scrollHeight ${metrics.bodyScroll} > clientHeight ${metrics.bodyClient}`,
  );
  assert.ok(metrics.shelfVisible, `${vp.name}: product shelf not visible in viewport`);
  assert.ok(metrics.productCount >= 4, `${vp.name}: expected products on shelf`);
  assert.ok(
    metrics.minProductHeight >= 40,
    `${vp.name}: product tap target too small (${metrics.minProductHeight}px)`,
  );
  assert.ok(
    metrics.gameHeight <= metrics.innerHeight + 1,
    `${vp.name}: game-screen taller than visual viewport`,
  );
  assert.ok(metrics.gameHeight > 100, `${vp.name}: game-screen collapsed`);
}

function killPreview(preview: ChildProcess | null): void {
  if (!preview || preview.pid == null) return;
  try {
    // detached spawn → kill the whole process group
    process.kill(-preview.pid, "SIGKILL");
  } catch {
    try {
      preview.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

async function main(): Promise<void> {
  console.log("\n=== iPhone viewport fit QA ===\n");
  let preview: ChildProcess | null = null;
  let browser: Browser | null = null;
  let failed = false;
  try {
    preview = await ensurePreview();
    const puppeteer = await loadPuppeteer();
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH ?? "/usr/local/bin/google-chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      try {
        await assertNoPageScroll(page, vp);
        console.log(`✓ ${vp.name}: no page scroll, shelf visible, taps ≥40px`);
      } finally {
        await page.close();
      }
    }
    console.log("\nQA PASSED · iPhone viewport fit\n");
  } catch (err) {
    failed = true;
    console.error("\nQA FAILED · iPhone viewport fit");
    console.error(err instanceof Error ? err.message : err);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    killPreview(preview);
  }
  process.exit(failed ? 1 : 0);
}

await main();
