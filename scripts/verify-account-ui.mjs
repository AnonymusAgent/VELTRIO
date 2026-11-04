// UI smoke test using a mocked Neon Auth API. Run against a local server.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
let signedIn = false;
let name = "Test Viewer";
const user = () => ({ id: "user-1", name, email: "viewer@example.invalid", emailVerified: true, image: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
const session = () => ({ id: "session-1", userId: "user-1", token: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
await context.addInitScript(() => { localStorage.setItem("veltrio-intro-enabled", "false"); });
await context.route("**/api/auth/**", async route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith("/get-session")) return route.fulfill({ json: signedIn ? { user: user(), session: session() } : null });
  if (path.endsWith("/sign-in/email")) { signedIn = true; return route.fulfill({ json: { user: user(), session: session(), token: "test-token" } }); }
  if (path.endsWith("/update-user")) { name = route.request().postDataJSON().name; return route.fulfill({ json: { status: true } }); }
  if (path.endsWith("/change-password")) return route.fulfill({ json: { user: user(), token: "test-token" } });
  if (path.endsWith("/sign-out")) { signedIn = false; return route.fulfill({ json: { success: true } }); }
  return route.fulfill({ status: 404, json: { message: "Not mocked" } });
});
try {
  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Sign in or create an account" }).waitFor();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("complementary", { name: "Analytics cookie choices" })).toHaveCount(0);
  await page.getByRole("button", { name: "Change analytics cookie choice" }).click();
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByLabel("Default playback speed").selectOption("1.5");
  await page.getByLabel("Offer to resume videos").uncheck();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Default playback speed")).toHaveValue("1.5");
  await expect(page.getByLabel("Offer to resume videos")).not.toBeChecked();
  await page.getByRole("link", { name: "Sign in or create an account" }).click();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByRole("heading", { name: "Create your account" }).waitFor();
  await page.getByRole("button", { name: "Already have an account? Sign in" }).click();
  await page.getByLabel("Email").fill("viewer@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/browse");
  assert.equal(signedIn, true, "The sign-in request should succeed");
  await page.goto(`${base}/settings/account`);
  await page.getByRole("button", { name: "Open profile menu" }).waitFor();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("link", { name: "Upload video" }).waitFor();
  await page.getByRole("link", { name: "Manage profile" }).click();
  await page.getByLabel("Display name").fill("New Name");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Profile updated.").waitFor();
  assert.equal(name, "New Name");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.locator(".profile-heading strong")).toHaveText("New Name");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByLabel("Current password").fill("old-password");
  await page.getByLabel("New password", { exact: true }).fill("new-password");
  await page.getByLabel("Confirm new password").fill("new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByText("Password changed.").waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile layout should not overflow");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect.poll(() => signedIn).toBe(false);
  console.log("PASS: profile menu, account settings, password update, signup switch, sign-in, sign-out, cookie and browser preferences (mock Neon Auth).");
} finally { await browser.close(); }
