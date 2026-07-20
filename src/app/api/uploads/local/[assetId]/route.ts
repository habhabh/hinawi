import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

export async function PUT(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await requirePermission("media:write");
  if (env.STORAGE_DRIVER !== "local") return new Response(null, { status: 404 });
  const { assetId } = await params;
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.createdBy, session.user.id), eq(mediaAssets.status, "pending_upload"))).limit(1);
  if (!asset || !request.body) return Response.json({ error: "جلسة الرفع غير صالحة" }, { status: 404 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength !== asset.sizeBytes) return Response.json({ error: "حجم الملف لا يطابق جلسة الرفع" }, { status: 400 });
  await storage.write(asset.objectKey, Readable.fromWeb(request.body as never), asset.mimeType);
  await db.update(mediaAssets).set({ status: "uploaded", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
  return new Response(null, { status: 204 });
}
