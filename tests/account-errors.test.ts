import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createAuthClient } from "@neondatabase/auth";
import { accountErrorMessage } from "../src/lib/account-errors";

async function main() {
  // The Neon SDK throws normalized errors even though Better Auth's API can also return errors.
  const server = createServer((_request, response) => {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: "PASSWORD_TOO_SHORT", message: "Password too short" }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const auth = createAuthClient(`http://127.0.0.1:${address.port}`);
    let thrown: unknown;
    try { await auth.signUp.email({ name: "Test", email: "test@example.invalid", password: "bad" }); }
    catch (error) { thrown = error; }
    assert.ok(thrown, "SDK should throw for an upstream rejection");
    assert.notEqual(accountErrorMessage(thrown), "Account service is unavailable. Please try again later.");
    assert.equal(accountErrorMessage({ status: 400, message: "Invalid email" }), "Invalid email");
    assert.equal(accountErrorMessage({ status: 503, message: "internal details" }), "Account service is unavailable. Please try again later.");
    assert.match(accountErrorMessage({ status: 429, message: "rate limit" }), /Too many attempts/);
    assert.equal(accountErrorMessage(new Error("network failure")), "Account service is unavailable. Please try again later.");
    console.log("PASS: Neon signup rejections show actionable errors while service failures remain private.");
  } finally { server.close(); }
}
void main();
