// Browser regression tests with mocked Neon Auth. Run against a local server.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const base = process.env.TEST_BASE_URL || "http://localhost:3000";

async function testFlow(reducedMotion) {
  const context = await browser.newContext({ viewport: { width: reducedMotion ? 1200 : 390, height: 844 }, reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  const page = await context.newPage();
  let signedIn = false, failLogin = !reducedMotion, failLogout = !reducedMotion, loginCalls = 0, logoutCalls = 0;
  const user = { id: "user-1", name: "Test Viewer", email: "viewer@example.invalid", emailVerified: true, image: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const session = { id: "session-1", userId: "user-1", token: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await context.addInitScript(() => { localStorage.setItem("veltrio-intro-enabled", "false"); });
  await context.route("**/api/auth/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/get-session")) return route.fulfill({ json: signedIn ? { user, session } : null });
    if (path.endsWith("/sign-in/email")) {
      loginCalls++;
      if (failLogin) { failLogin = false; return route.fulfill({ status: 401, json: { message: "Invalid credentials" } }); }
      signedIn = true; return route.fulfill({ json: { user, session, token: "test-token" } });
    }
    if (path.endsWith("/sign-out")) {
      logoutCalls++;
      if (failLogout) { failLogout = false; return route.fulfill({ status: 500, json: { message: "Sign out failed" } }); }
      signedIn = false; return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({ status: 404, json: { message: "Not mocked" } });
  });
  try {
    await page.goto(`${base}/account`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    if (!reducedMotion) {
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByText(/invalid credentials/i)).toBeVisible();
      await expect(page.locator(".auth-door-scene")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const entering = page.locator(".auth-door-scene--enter");
    await expect(entering).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Sign in or create an account" })).toBeVisible();
    assert.equal(loginCalls, reducedMotion ? 1 : 2);
    if (reducedMotion) await expect(entering).toBeHidden();
    else {
      await expect(entering).toBeVisible();
      await page.waitForTimeout(1200);
      assert.equal(new URL(page.url()).pathname, "/account", "redirect must follow the scene");
      if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
    }
    await page.waitForURL("**/browse");
    // Browse needs a real database; resume on a DB-independent page in this mock test.
    await page.goto(`${base}/settings`);
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    const exiting = page.locator(".auth-door-scene--exit");
    await expect(exiting).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    assert.equal(logoutCalls, 0, "Sign out request must follow the animation");
    if (reducedMotion) await expect(exiting).toBeHidden();
    else {
      await expect(exiting).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(exiting).toBeVisible();
      await expect(page.locator(".profile-dropdown [role=alert]")).toContainText("Could not sign out", { timeout: 6000 });
      assert.equal(signedIn, true);
      assert.equal(logoutCalls, 1);
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
    }
    await expect.poll(() => signedIn, { timeout: 6000 }).toBe(false);
    assert.equal(logoutCalls, reducedMotion ? 1 : 2);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "layout must fit viewport");
    console.log(`PASS: ${reducedMotion ? "reduced motion / desktop" : "animated / mobile"} auth door flow`);
  } finally { await context.close(); }
}
async function testAccountPageSignOut() {
  const context = await browser.newContext({ viewport: { width: 768, height: 900 } });
  const page = await context.newPage();
  let signedIn = true, logoutCalls = 0;
  const now = new Date().toISOString();
  const user = { id: "user-1", name: "Test Viewer", email: "viewer@example.invalid", emailVerified: true, image: null, createdAt: now, updatedAt: now };
  const session = { id: "session-1", userId: "user-1", token: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: now, updatedAt: now };
  await context.addInitScript(() => { localStorage.setItem("veltrio-intro-enabled", "false"); });
  await context.route("**/api/auth/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/get-session")) return route.fulfill({ json: signedIn ? { user, session } : null });
    if (path.endsWith("/sign-out")) { logoutCalls++; signedIn = false; return route.fulfill({ json: { success: true } }); }
    return route.fulfill({ status: 404, json: { message: "Not mocked" } });
  });
  try {
    await page.goto(`${base}/account`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.locator(".auth-door-scene--exit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open profile menu" })).toBeDisabled();
    assert.equal(logoutCalls, 0);
    await expect.poll(() => signedIn, { timeout: 6000 }).toBe(false);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    assert.equal(logoutCalls, 1);
    console.log("PASS: account-page sign-out / tablet");
  } finally { await context.close(); }
}
try { await testFlow(false); await testFlow(true); await testAccountPageSignOut(); } finally { await browser.close(); }
