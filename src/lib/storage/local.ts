import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { assertSafeStorageKey } from "@/lib/media";
import type { StorageAdapter } from "@/lib/storage/types";

function resolveKey(key: string): string {
  assertSafeStorageKey(key);
  const resolved = path.resolve(env.MEDIA_ROOT, key);
  if (!resolved.startsWith(path.resolve(env.MEDIA_ROOT) + path.sep)) throw new Error("مسار غير آمن");
  return resolved;
}

export const localStorage: StorageAdapter = {
  async createUploadUrl() {
    throw new Error("الرفع المحلي يستخدم endpoint متدفقًا بدل رابط مباشر");
  },
  async exists(key) {
    try {
      const info = await stat(resolveKey(key));
      return { key, size: info.size };
    } catch {
      return null;
    }
  },
  async read(key) {
    return createReadStream(resolveKey(key));
  },
  async write(key, body) {
    const target = resolveKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    const source = body instanceof Uint8Array ? Readable.from(body) : body;
    await pipeline(source, createWriteStream(target, { flags: "wx", mode: 0o640 }));
  },
  async remove(key) {
    try {
      await unlink(resolveKey(key));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  },
  publicUrl(key) {
    return `${env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
  },
};
