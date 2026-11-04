// Browser coverage for the public appearance preference. Run against a local server.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page should fit the viewport");
  const toggleBounds = await page.locator(".theme-toggle").boundingBox();
  assert.ok(toggleBounds && toggleBounds.x >= 0 && toggleBounds.x + toggleBounds.width <= page.viewportSize().width, "theme control must remain visible");
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  await context.addInitScript(() => { localStorage.setItem("veltrio-intro-enabled", "false"); });
  await context.route("**/api/auth/**", route => route.fulfill({ json: null }));
  const page = await context.newPage();
  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("combobox", { name: "Theme" })).toHaveValue("system");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  assert.equal(await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(247, 247, 251)");
  await noOverflow(page);
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("combobox", { name: "Theme" })).toHaveValue("dark");
  assert.equal(await page.evaluate(() => localStorage.getItem("veltrio-theme")), "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("combobox", { name: "Theme" }).selectOption("light");
  const other = await context.newPage();
  await other.goto(`${base}/settings`);
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("combobox", { name: "Theme" }).selectOption("dark");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.getByRole("combobox", { name: "Theme" }).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  assert.equal(await page.evaluate(() => localStorage.getItem("veltrio-theme")), null);
  await context.setDefaultTimeout(5000);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto(`${base}/account`);
  await expect(page.getByLabel("Email")).toBeVisible();
  assert.equal(await page.getByLabel("Email").evaluate(el => getComputedStyle(el).color), "rgb(36, 37, 54)");
  await noOverflow(page);
  for (const width of [320, 761, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  await page.goto(`${base}/admin/login`);
  assert.equal(await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(12, 13, 20)", "admin retains its own dark appearance");
  await context.close();

  const blocked = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: "dark" });
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage unavailable"); } }); });
  await blocked.route("**/api/auth/**", route => route.fulfill({ json: null }));
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(`${base}/settings`);
  await blockedPage.getByRole("combobox", { name: "Theme" }).selectOption("light");
  await expect(blockedPage.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(blockedPage.getByRole("status")).toContainText("could not be saved");
  await noOverflow(blockedPage);
  await blocked.close();
  console.log("PASS: themes, persistence, system and cross-tab updates, unavailable storage, mobile, account and admin isolation");
} finally { await browser.close(); }
