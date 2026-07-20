import { and, eq, lt, notExists, or } from "drizzle-orm";
import { db, pool } from "@/db";
import { mediaAssets, projectItems } from "@/db/schema";
import { storage } from "@/lib/storage";

const cutoff = new Date(Date.now() - 7 * 86_400_000);
const orphaned = await db.select().from(mediaAssets).where(and(lt(mediaAssets.createdAt, cutoff), or(eq(mediaAssets.status, "failed"), eq(mediaAssets.status, "pending_upload")), notExists(db.select({ id: projectItems.id }).from(projectItems).where(or(eq(projectItems.primaryAssetId, mediaAssets.id), eq(projectItems.secondaryAssetId, mediaAssets.id), eq(projectItems.posterAssetId, mediaAssets.id))))));
for (const asset of orphaned) { if (await storage.exists(asset.objectKey)) await storage.remove(asset.objectKey); await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id)); }
console.info(`تم تنظيف ${orphaned.length} ملف يتيم`);
await pool.end();
