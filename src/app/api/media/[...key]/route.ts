import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response(null, { status: 404 });
  const key = (await params).key.join("/");
  const [asset] = await db.select({ mimeType: mediaAssets.mimeType }).from(mediaAssets).where(and(eq(mediaAssets.objectKey, key), eq(mediaAssets.status, "ready"))).limit(1);
  if (!asset) return new Response(null, { status: 404 });
  const stream = await storage.read(key);
  return new Response(Readable.toWeb(stream as Readable) as ReadableStream, { headers: { "content-type": asset.mimeType, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
