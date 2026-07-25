import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets, mediaJobs, projects, sellers } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  await requirePermission("media:write");
  const { assetId, projectId, sellerId } = z.object({
    assetId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
  }).refine((input) => !(input.projectId && input.sellerId), "لا يمكن ربط الوسيط بمشروع وبائع في الطلب نفسه").parse(await request.json());
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset) return Response.json({ error: "الوسيط غير موجود" }, { status: 404 });
  if (projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), isNull(projects.archivedAt))).limit(1);
    if (!project) return Response.json({ error: "المشروع غير موجود" }, { status: 404 });
  }
  if (sellerId) {
    if (asset.type !== "image") return Response.json({ error: "صورة البائع يجب أن تكون ملف صورة" }, { status: 400 });
    const [seller] = await db.select({ id: sellers.id }).from(sellers).where(and(eq(sellers.id, sellerId), isNull(sellers.archivedAt))).limit(1);
    if (!seller) return Response.json({ error: "البائع غير موجود" }, { status: 404 });
  }
  const stored = await storage.exists(asset.objectKey);
  if (!stored || stored.size !== asset.sizeBytes) return Response.json({ error: "لم يكتمل رفع الملف بالحجم المتوقع" }, { status: 400 });
  await db.transaction(async (tx) => {
    await tx.update(mediaAssets).set({ status: "processing", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    await tx.insert(mediaJobs).values({
      mediaAssetId: asset.id,
      jobType: asset.type === "image" ? "process_image" : "inspect_video",
      payload: projectId ? { projectId } : sellerId ? { sellerId } : {},
    });
  });
  return Response.json({ status: "processing", attachedToProject: Boolean(projectId), attachedToSeller: Boolean(sellerId) });
}
