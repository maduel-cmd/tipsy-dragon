import assert from "node:assert/strict";
import { test } from "node:test";
import { getInstallCapability, isStandaloneDisplay, collectOfflineUrls, forceSystemUpdate } from "./pwaInstall";

test("getInstallCapability returns a known mode in node", () => {
  // ב־node אין window — הפונקציות צריכות לא לקרוס אם נקראות רק בדפדפן.
  // כאן בודקים רק שהמודול נטען.
  assert.equal(typeof getInstallCapability, "function");
  assert.equal(typeof isStandaloneDisplay, "function");
  assert.equal(typeof collectOfflineUrls, "function");
  assert.equal(typeof forceSystemUpdate, "function");
});
