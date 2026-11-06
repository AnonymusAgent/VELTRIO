// Run against a running server without an authenticated browser session.
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";

async function get(path) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  return { response, html: await response.text() };
}

function redirectsTo(result, destination) {
  // Next may stream a redirect as a meta refresh instead of an HTTP 3xx.
  return result.response.headers.get("location") === destination ||
    result.html.includes(`http-equiv="refresh" content="1;url=${destination}"`);
}

for (const path of ["/account", "/privacy", "/adsense-setup"]) {
  const { response, html } = await get(path);
  assert.equal(response.status, 200, `${path} should load`);
  assert.match(html, /aria-label="Sign in or create an account" href="\/account"/);
  assert.match(html, /href="\/my-list"/);
  assert.doesNotMatch(html, /href="\/studio/);
  assert.doesNotMatch(html, /Creator studio|Upload your video|Start uploading/);
  assert.doesNotMatch(html, /href="\/admin(?:\/|"|\?)/, `${path} must not link to admin`);
}
for (const [path, destination] of [["/submit", "/browse"], ["/telegram-setup", "/browse"], ["/studio", "/my-list"], ["/studio/upload", "/my-list"], ["/admin", "/admin/login"]]) {
  assert.ok(redirectsTo(await get(path), destination), `${path} should redirect to ${destination}`);
}
const adminLogin = await get("/admin/login");
assert.equal(adminLogin.response.status, 200, "Admin sign-in should remain available by direct address");
console.log("PASS: public sign-in stays open, viewer uploads are closed, and admin remains a direct route.");
