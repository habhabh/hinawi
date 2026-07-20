import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets, mediaJobs } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  await requirePermission("media:write");
  const { assetId } = z.object({ assetId: z.string().uuid() }).parse(await request.json());
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset) return Response.json({ error: "الوسيط غير موجود" }, { status: 404 });
  const stored = await storage.exists(asset.objectKey);
  if (!stored || stored.size !== asset.sizeBytes) return Response.json({ error: "لم يكتمل رفع الملف بالحجم المتوقع" }, { status: 400 });
  await db.transaction(async (tx) => {
    await tx.update(mediaAssets).set({ status: "processing", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    await tx.insert(mediaJobs).values({ mediaAssetId: asset.id, jobType: asset.type === "image" ? "process_image" : "inspect_video" });
  });
  return Response.json({ status: "processing" });
}
