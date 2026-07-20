import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { createStorageKey, validateMediaUpload } from "@/lib/media";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await requirePermission("media:write");
  try {
    const input = validateMediaUpload(await request.json(), { imageMb: env.IMAGE_MAX_SIZE_MB, videoMb: env.VIDEO_MAX_SIZE_MB });
    const objectKey = createStorageKey(input.mimeType);
    const [asset] = await db.insert(mediaAssets).values({ type: input.mimeType.startsWith("image/") ? "image" : "video", storageDriver: env.STORAGE_DRIVER, objectKey, originalName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, status: "pending_upload", createdBy: session.user.id }).returning();
    if (env.STORAGE_DRIVER === "s3") {
      const upload = await storage.createUploadUrl(objectKey, input.mimeType, input.sizeBytes);
      return Response.json({ assetId: asset.id, driver: "s3", uploadUrl: upload.url, headers: upload.headers });
    }
    return Response.json({ assetId: asset.id, driver: "local" });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "طلب رفع غير صالح" }, { status: 400 }); }
}
