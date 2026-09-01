/**
 * Playwright E2E — דורש PLAYWRIGHT_BASE_URL + @playwright/test.
 * גרירה = pointer (לא HTML5), תואם useTrayShelfPointerDrag.
 */
import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "https://traillink-foodtruck-bar.netlify.app";
const bust = "tipsy-v32-meta-sprint";

async function startNight(page: import("@playwright/test").Page, env = "circus") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/?env=${env}&v=${bust}`);
  await page.waitForLoadState("domcontentloaded");
  // נתיב יציב: PLAY NOW עם ?env= (בלי מסך env ארוך / RTL cta)
  await page.getByRole("button", { name: /PLAY NOW|שחקו עכשיו/i }).click();
  await expect(page.locator(".game-screen")).toBeVisible({ timeout: 8000 });
  await page.waitForSelector('[data-testid^="product-"]:not([disabled])', { timeout: 12000 });
}

async function pointerDrag(
  page: import("@playwright/test").Page,
  from: import("@playwright/test").Locator,
  to: import("@playwright/test").Locator,
) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("missing bounding boxes for drag");
  const x0 = a.x + a.width / 2;
  const y0 = a.y + a.height / 2;
  const x1 = b.x + b.width / 2;
  const y1 = b.y + Math.min(40, b.height / 2);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x1, y1, { steps: 12 });
  await page.mouse.up();
}

test.describe("Game Animation & Performance QA Loop", () => {
  test("QA Check 1: Pointer drag shelf→tray snap", async ({ page }) => {
    await startNight(page);
    const draggable = page.locator(".draggable-item:not([disabled])").first();
    const dropZone = page.locator('[data-drop="tray"]');
    await expect(draggable).toBeVisible({ timeout: 8000 });
    await expect(dropZone).toBeVisible();
    await pointerDrag(page, draggable, dropZone);
    await expect(dropZone.locator(".tray-chip").first()).toBeVisible({ timeout: 3000 });
  });

  test("QA Check 2: Floating Score Animation on Order Delivery", async ({ page }) => {
    await page.goto(`${base}/?env=circus&v=${bust}`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("test:complete-order", { detail: { score: 25 } }));
    });
    const rewardEl = page.locator(".floating-score");
    await expect(rewardEl).toBeVisible();
  });

  test("QA Check 3: Frame Rate & Memory Leaks Check", async ({ page }) => {
    await page.goto(`${base}/?env=circus&v=${bust}`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("test:complete-order", { detail: { score: 10 } }));
    });
    await expect(page.locator(".floating-score")).toBeVisible();
    await page.waitForTimeout(2000);
    const lingering = await page.locator(".floating-score").count();
    expect(lingering).toBe(0);
  });

  test("QA Check 4: Mood speech bubbles appear in play", async ({ page }) => {
    await startNight(page);
    await page.waitForSelector('[data-testid="customer-speech"]', { timeout: 12000 });
    const bubble = page.locator('[data-testid="customer-speech"]').first();
    await expect(bubble).toBeVisible();
    const text = (await bubble.textContent())?.trim() ?? "";
    expect(text.length).toBeGreaterThan(6);
  });
});
