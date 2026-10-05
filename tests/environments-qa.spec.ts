/**
 * Playwright E2E מול פריסה — סביבות + הזמנות בתפריט המותר.
 */
import { test, expect } from "@playwright/test";
import { ENVIRONMENTS } from "../src/config/environments";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5175";
const bust = "tipsy-v33-marketable-parity";

test.describe("Environments & Dynamic Orders QA Loop", () => {
  for (const [envId, envConfig] of Object.entries(ENVIRONMENTS)) {
    test(`Verify Environment: ${envConfig.name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${base}/?env=${envId}&v=${bust}`);
      await page.waitForLoadState("domcontentloaded");

      await page.getByRole("button", { name: /PLAY NOW|שחקו עכשיו/i }).click();
      await expect(page.locator(".game-screen")).toBeVisible({ timeout: 8000 });

      const shelf = page.locator('[data-testid="ingredient-slot"]');
      const tray = page.locator('[data-testid="tray-drop-zone"]');
      await expect(shelf).toBeVisible({ timeout: 8000 });
      await expect(tray).toBeVisible();

      const bgProbe = page.locator('[data-testid="environment-bg-img"]');
      await expect(bgProbe).toHaveAttribute("src", envConfig.backgroundAsset);
      await expect
        .poll(async () => bgProbe.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), {
          timeout: 15000,
        })
        .toBeTruthy();

      // חכים ללקוחות / הזמנות
      await page.waitForSelector(".customer-order-item, .empty-hint", { timeout: 10000 });
      const orderItems = await page.$$eval(".customer-order-item", (items) =>
        items.map((el) => el.getAttribute("data-item-id")),
      );
      for (const itemId of orderItems) {
        if (itemId) expect(envConfig.allowedItemIds).toContain(itemId);
      }

      const box = await shelf.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(200);
      expect(box?.height ?? 0).toBeGreaterThan(40);
    });
  }
});
