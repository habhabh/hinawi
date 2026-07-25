import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets, projectItems, sellers } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  await requirePermission("media:write");
  const { assetId } = z.object({ assetId: z.string().uuid() }).parse(await params);
  const projectId = new URL(request.url).searchParams.get("projectId");
  const sellerId = new URL(request.url).searchParams.get("sellerId");
  const parsedProjectId = projectId ? z.string().uuid().parse(projectId) : null;
  const parsedSellerId = sellerId ? z.string().uuid().parse(sellerId) : null;
  if (parsedProjectId && parsedSellerId) return Response.json({ error: "حدد مشروعًا أو بائعًا فقط" }, { status: 400 });
  const [asset] = await db.select({ status: mediaAssets.status, error: mediaAssets.errorMessage }).from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset) return Response.json({ error: "الوسيط غير موجود" }, { status: 404 });
  const [projectItem] = parsedProjectId
    ? await db.select({ id: projectItems.id }).from(projectItems).where(and(eq(projectItems.projectId, parsedProjectId), eq(projectItems.primaryAssetId, assetId))).limit(1)
    : [];
  const [seller] = parsedSellerId
    ? await db.select({ id: sellers.id }).from(sellers).where(and(eq(sellers.id, parsedSellerId), eq(sellers.avatarAssetId, assetId))).limit(1)
    : [];
  return Response.json({
    status: asset.status,
    error: asset.error,
    attached: parsedProjectId ? Boolean(projectItem) : parsedSellerId ? Boolean(seller) : undefined,
  });
}
