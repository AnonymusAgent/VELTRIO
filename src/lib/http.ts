import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  if (origin && new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) throw new HttpError(403, "Cross-site request blocked.");
}

export async function readBounded(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new HttpError(413, "Request is too large.");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks, length);
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse((await readBounded(request, 32 * 1024)).toString());
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid request body.");
  }
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  console.error("VELTRIO request failed:", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
