import assert from "node:assert/strict";
import { createServer } from "node:http";
import { POST } from "../src/app/api/auth/[...path]/route";

async function main() {
  let status = 200;
  const upstream = createServer((_request, response) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(status === 200 ? { status: true } : { message: "Rejected" }));
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  try {
    const address = upstream.address();
    assert.ok(address && typeof address !== "string");
    process.env.NEON_AUTH_BASE_URL = `http://127.0.0.1:${address.port}`;
    process.env.NEON_AUTH_COOKIE_SECRET = "test-secret-not-for-production-123456789";
    const call = () => POST(new Request("https://example.test/api/auth/update-user", { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: JSON.stringify({ name: "New name" }) }), { params: Promise.resolve({ path: ["update-user"] }) });
    const success = await call();
    assert.equal(success.status, 200);
    assert.match(success.headers.get("set-cookie") || "", /__Secure-neon-auth\.local\.session_data=;.*Max-Age=0/);
    status = 400;
    const rejected = await call();
    assert.equal(rejected.status, 400);
    assert.equal(rejected.headers.get("set-cookie"), null);
    console.log("PASS: successful profile changes clear stale cached session data; rejected changes do not.");
  } finally { upstream.close(); }
}
void main();
