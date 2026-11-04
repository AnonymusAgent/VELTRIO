import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "./http";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "./admin-shared";

// Runtime user files live on a persistent volume, never in the application bundle.
export const STORAGE_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || ".data/uploads");
export const STORAGE_QUOTA = Number(process.env.UPLOAD_STORAGE_GB || 10) * 1024 ** 3;
const extensions: Record<string, { mime: string; kind: string }> = {
  ".mp4": { mime: "video/mp4", kind: "video" },
  ".webm": { mime: "video/webm", kind: "video" },
  ".jpg": { mime: "image/jpeg", kind: "thumbnail" },
  ".jpeg": { mime: "image/jpeg", kind: "thumbnail" },
  ".png": { mime: "image/png", kind: "thumbnail" },
  ".webp": { mime: "image/webp", kind: "thumbnail" },
};

export async function ensureStorage() { await mkdir(STORAGE_DIR, { recursive: true, mode: 0o700 }); }
export function assetPath(key: string) {
  if (!/^[a-f0-9-]{36}\.(mp4|webm|jpg|jpeg|png|webp|part)$/.test(key)) throw new HttpError(400, "Invalid file key.");
  return path.join(/*turbopackIgnore: true*/ STORAGE_DIR, key);
}
export function validateUpload(filename: string, size: number, kind: string) {
  const ext = path.extname(filename).toLowerCase();
  const info = extensions[ext];
  if (!info || info.kind !== kind) throw new HttpError(400, kind === "video" ? "Upload an MP4 or WebM video." : "Use a JPG, PNG or WebP thumbnail.");
  const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number.isSafeInteger(size) || size < 12 || size > max) throw new HttpError(400, kind === "video" ? "Videos must be between 12 bytes and 2 GB." : "Thumbnails must be smaller than 10 MB.");
  return { ext, ...info };
}
export async function verifySignature(filename: string, mime: string) {
  const handle = await open(filename, "r");
  const bytes = Buffer.alloc(32);
  try { await handle.read(bytes, 0, 32, 0); } finally { await handle.close(); }
  const valid = mime === "video/mp4" ? bytes.toString("ascii", 4, 8) === "ftyp"
    : mime === "video/webm" ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : mime === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === "image/webp" ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" : false;
  if (!valid) throw new HttpError(400, "The file contents do not match its extension. Upload a valid media file.");
}
export async function removeAssetFile(key: string) {
  await unlink(assetPath(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}
