import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { admins, adminSessions, authAttempts, comments, mediaAssets, videos } from "../src/db/schema";
import { ADMIN_EMAIL } from "../src/lib/admin-shared";
import { hashPassword } from "../src/lib/admin-auth";
import { removeAssetFile } from "../src/lib/storage";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Integration tests run on local preview only.");
const initial = process.env.ADMIN_INITIAL_PASSWORD;
if (!initial) throw new Error("ADMIN_INITIAL_PASSWORD is required for the local test.");
const assetIds: string[] = [];
const videoIds: number[] = [];
let cookie = "";
let credentialsChanged = false;
const temporary = `${randomBytes(18).toString("base64url")}!Vh9`;
async function request(path: string, method = "GET", data?: unknown, authenticated = true, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra };
  if (authenticated && cookie) headers.Cookie = cookie;
  let body: BodyInit | undefined;
  if (data instanceof Uint8Array) { body = new Uint8Array(data).buffer; headers["Content-Type"] = "application/octet-stream"; }
  else if (data !== undefined) { body = JSON.stringify(data); headers["Content-Type"] = "application/json"; }
  return fetch(`${base}${path}`, { method, headers, body, redirect: "manual" });
}
async function login(password: string) {
  const response = await request("/api/admin/auth/login", "POST", { email: ADMIN_EMAIL, password }, false);
  assert.equal(response.status, 200, `Login failed: ${await response.clone().text()}`);
  cookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
  return cookie;
}
async function makeAsset(filename: string, kind: string, bytes: Uint8Array) {
  const response = await request("/api/admin/uploads", "POST", { filename, kind, size: bytes.length });
  assert.equal(response.status, 200);
  const { id } = await response.json(); assetIds.push(id);
  assert.equal((await request(`/api/admin/uploads/${id}?offset=1`, "PUT", bytes.slice(0, 10))).status, 409);
  const first = Math.floor(bytes.length / 2);
  assert.equal((await request(`/api/admin/uploads/${id}?offset=0`, "PUT", bytes.slice(0, first))).status, 200);
  const status = await (await request(`/api/admin/uploads/${id}`)).json(); assert.equal(status.received, first);
  assert.equal((await request(`/api/admin/uploads/${id}?offset=${first}`, "PUT", bytes.slice(first))).status, 200);
  assert.equal((await request(`/api/admin/uploads/${id}`, "POST")).status, 200);
  return id as string;
}
async function main() {
  console.log("Testing VELTRIO direct-upload architecture…");
  assert.equal((await request("/api/admin/videos", "GET", undefined, false)).status, 401);
  assert.equal((await request("/api/admin/uploads", "POST", {}, false)).status, 401);
  assert.equal((await request("/api/submit", "POST", {}, false)).status, 410);
  const loginResponse = await request("/api/admin/auth/login", "POST", { email: ADMIN_EMAIL, password: "wrong-password" }, false);
  assert.equal(loginResponse.status, 401);
  await login(initial!);
  assert.equal((await request("/api/admin/uploads", "POST", { filename: "bad.html", size: 200, kind: "video" })).status, 400);
  assert.equal((await request("/api/admin/uploads", "POST", { filename: "test.mp4", size: 1024, kind: "video" }, true, { Origin: "https://attacker.invalid" })).status, 403);
  // Valid container magic for transport tests; browser tests use a playable MediaRecorder clip.
  const bytes = new Uint8Array(512); bytes.set([0x1a, 0x45, 0xdf, 0xa3]); bytes.set(randomBytes(508), 4);
  const mediaId = await makeAsset("transport-test.webm", "video", bytes);
  assert.equal((await request(`/api/media/${mediaId}`, "GET", undefined, false)).status, 404);
  const info = { title: "Integration test — local upload", categorySlug: "short-films", mediaAssetId: mediaId, status: "draft", durationSeconds: 5, rightsConfirmed: false };
  const createdResponse = await request("/api/admin/videos", "POST", info);
  assert.equal(createdResponse.status, 201);
  const video = await createdResponse.json(); videoIds.push(video.id);
  const draftPage = await request(`/video/${video.slug}`, "GET", undefined, false);
  const draftHtml = await draftPage.text();
  // Next.js streams loading boundaries before an asynchronous notFound() can set HTTP status.
  assert.match(draftHtml, /NEXT_HTTP_ERROR_FALLBACK;404|not found/i);
  assert.equal(draftHtml.includes(info.title), false);
  assert.equal((await request(`/api/admin/videos/${video.id}`, "PATCH", { status: "published" })).status, 400);
  assert.equal((await request(`/api/admin/videos/${video.id}`, "PATCH", { status: "published", rightsConfirmed: true, isFeatured: true })).status, 200);
  assert.equal((await request(`/video/${video.slug}`, "GET", undefined, false)).status, 200);
  const range = await request(`/api/media/${mediaId}`, "GET", undefined, false, { Range: "bytes=10-30" });
  assert.equal(range.status, 206); assert.equal(range.headers.get("content-range"), "bytes 10-30/512");
  // Patched Next.js may use chunked transfer and omit Content-Length; verify the actual payload.
  assert.deepEqual(new Uint8Array(await range.arrayBuffer()), bytes.slice(10, 31));
  const suffix = await request(`/api/media/${mediaId}`, "GET", undefined, false, { Range: "bytes=-10" });
  assert.equal(suffix.status, 206); assert.equal((await suffix.arrayBuffer()).byteLength, 10);
  const head = await request(`/api/media/${mediaId}`, "HEAD", undefined, false);
  assert.equal(head.status, 200); assert.equal(head.headers.get("accept-ranges"), "bytes");
  assert.equal(head.headers.get("content-type"), "video/webm"); assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await request(`/api/media/${mediaId}`, "GET", undefined, false, { Range: "bytes=900-999" })).status, 416);
  const commentResponse = await request("/api/comments", "POST", { videoSlug: video.slug, name: "Test viewer", email: "private@example.com", body: "A test comment on this original video." }, false);
  assert.equal(commentResponse.status, 200);
  const commentsResponse = await request(`/api/comments?slug=${video.slug}`, "GET", undefined, false);
  assert.equal((await commentsResponse.text()).includes("private@example.com"), false);
  assert.equal((await request(`/api/admin/videos/${video.id}`, "PATCH", { status: "draft" })).status, 200);
  assert.equal((await request(`/api/media/${mediaId}`, "GET", undefined, false)).status, 404);
  assert.equal((await request(`/api/media/${mediaId}`, "GET")).status, 200);
  console.log("PASS: authentication, CSRF, file validation, chunk offsets/resume, publication, private drafts, Range/HEAD, comment privacy.");
  if (process.env.TEST_CREDENTIAL_CHANGES === "1") {
    const oldCookie = cookie;
    const changed = await request("/api/admin/settings", "PATCH", { action: "password", currentPassword: initial, newPassword: temporary, confirmPassword: temporary });
    assert.equal(changed.status, 200); credentialsChanged = true;
    assert.equal((await request("/api/admin/videos", "GET", undefined, true, { Cookie: oldCookie })).status, 401);
    assert.equal((await request("/api/admin/auth/login", "POST", { email: ADMIN_EMAIL, password: initial }, false)).status, 401);
    await login(temporary);
    const recovery = await request("/api/admin/settings", "PATCH", { action: "recovery", currentPassword: temporary });
    assert.equal(recovery.status, 200);
    const code = (await recovery.json()).recoveryCode;
    const reset = await request("/api/admin/auth/recover", "POST", { email: ADMIN_EMAIL, recoveryCode: code, newPassword: initial, confirmPassword: initial }, false);
    assert.equal(reset.status, 200);
    assert.equal((await request("/api/admin/auth/recover", "POST", { email: ADMIN_EMAIL, recoveryCode: code, newPassword: temporary, confirmPassword: temporary }, false)).status, 401);
    await login(initial!);
    console.log("PASS: password change, previous-session invalidation, recovery reset, one-time code replay rejection.");
  }
  assert.equal((await request(`/api/admin/videos/${video.id}`, "DELETE")).status, 200);
  assert.equal((await request(`/api/media/${mediaId}`, "GET")).status, 404);
  console.log("PASS: video deletion removes media. All integration checks passed.");
}
async function cleanup() {
  if (videoIds.length) { await db.delete(comments).where(inArray(comments.videoId, videoIds)); await db.delete(videos).where(inArray(videos.id, videoIds)); }
  for (const id of assetIds) {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    if (asset) { await removeAssetFile(`${id}.part`); await removeAssetFile(asset.storageKey); await db.delete(mediaAssets).where(eq(mediaAssets.id, id)); }
  }
  const [admin] = await db.select().from(admins).where(eq(admins.email, ADMIN_EMAIL));
  if (admin) {
    if (credentialsChanged) await db.update(admins).set({ passwordHash: await hashPassword(initial!), mustChangePassword: true, recoveryHash: process.env.ADMIN_RECOVERY_CODE ? await hashPassword(process.env.ADMIN_RECOVERY_CODE) : null }).where(eq(admins.id, admin.id));
    await db.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
  }
  await db.delete(authAttempts);
  await pool.end();
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(cleanup);
