import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  categories,
  mediaAssets,
  mediaJobs,
  projectItems,
  projects,
  sellers,
  siteSettings,
} from "@/db/schema";
import { storageForDriver } from "@/lib/storage";

type DeleteMediaResult =
  | { status: "deleted" }
  | { status: "missing" }
  | { status: "busy" }
  | { status: "storage_failed"; failedKeys: string[] };

export function mediaStorageKeys(asset: Pick<typeof mediaAssets.$inferSelect, "id" | "objectKey" | "variants">) {
  const keys = new Set<string>([
    asset.objectKey,
    `variants/${asset.id}/thumbnail.webp`,
    `variants/${asset.id}/grid.webp`,
    `variants/${asset.id}/medium.webp`,
    `variants/${asset.id}/large.webp`,
    `variants/${asset.id}/poster.jpg`,
  ]);
  for (const variant of Object.values(asset.variants ?? {})) {
    if (variant && typeof variant.key === "string" && variant.key) keys.add(variant.key);
  }
  return [...keys];
}

export async function deleteMediaAsset(assetId: string, actorUserId: string): Promise<DeleteMediaResult> {
  const prepared = await db.transaction(async (tx) => {
    const [asset] = await tx.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).for("update").limit(1);
    if (!asset) return { status: "missing" as const };
    if (asset.status === "pending_upload" || asset.status === "processing") return { status: "busy" as const };

    const jobs = await tx
      .select({ id: mediaJobs.id, status: mediaJobs.status })
      .from(mediaJobs)
      .where(eq(mediaJobs.mediaAssetId, assetId))
      .for("update");
    if (jobs.some((job) => job.status === "processing")) return { status: "busy" as const };

    await tx.delete(mediaJobs).where(eq(mediaJobs.mediaAssetId, assetId));

    const removedItems = await tx
      .select({ projectId: projectItems.projectId, isCover: projectItems.isCover })
      .from(projectItems)
      .where(or(eq(projectItems.primaryAssetId, assetId), eq(projectItems.secondaryAssetId, assetId)));
    const affectedProjectIds = [...new Set(removedItems.map((item) => item.projectId))];

    await tx
      .update(projectItems)
      .set({ posterAssetId: null, updatedAt: new Date() })
      .where(eq(projectItems.posterAssetId, assetId));
    await tx
      .delete(projectItems)
      .where(or(eq(projectItems.primaryAssetId, assetId), eq(projectItems.secondaryAssetId, assetId)));

    for (const projectId of affectedProjectIds) {
      const [cover] = await tx
        .select({ id: projectItems.id })
        .from(projectItems)
        .where(and(eq(projectItems.projectId, projectId), eq(projectItems.isCover, true)))
        .limit(1);
      if (!cover) {
        const [replacement] = await tx
          .select({ id: projectItems.id })
          .from(projectItems)
          .where(eq(projectItems.projectId, projectId))
          .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt))
          .limit(1);
        if (replacement) {
          await tx.update(projectItems).set({ isCover: true, updatedAt: new Date() }).where(eq(projectItems.id, replacement.id));
        }
      }
    }

    const now = new Date();
    await Promise.all([
      tx.update(sellers).set({ avatarAssetId: null, updatedAt: now }).where(eq(sellers.avatarAssetId, assetId)),
      tx.update(categories).set({ coverAssetId: null, updatedAt: now }).where(eq(categories.coverAssetId, assetId)),
      tx.update(projects).set({ ogAssetId: null, updatedAt: now }).where(eq(projects.ogAssetId, assetId)),
      tx.update(siteSettings).set({ logoAssetId: null, updatedAt: now }).where(eq(siteSettings.logoAssetId, assetId)),
      tx.update(siteSettings).set({ faviconAssetId: null, updatedAt: now }).where(eq(siteSettings.faviconAssetId, assetId)),
      tx.update(mediaAssets).set({ posterAssetId: null, updatedAt: now }).where(eq(mediaAssets.posterAssetId, assetId)),
    ]);
    await tx
      .update(mediaAssets)
      .set({ status: "archived", archivedAt: asset.archivedAt ?? now, updatedAt: now })
      .where(eq(mediaAssets.id, assetId));

    return { status: "prepared" as const, asset, keys: mediaStorageKeys(asset) };
  });

  if (prepared.status !== "prepared") return prepared;

  const assetStorage = storageForDriver(prepared.asset.storageDriver);
  const removals = await Promise.allSettled(prepared.keys.map((key) => assetStorage.remove(key)));
  const failedKeys = prepared.keys.filter((_, index) => removals[index].status === "rejected");
  if (failedKeys.length) return { status: "storage_failed", failedKeys };

  await db.transaction(async (tx) => {
    const [deleted] = await tx.delete(mediaAssets).where(eq(mediaAssets.id, assetId)).returning({ id: mediaAssets.id });
    if (!deleted) return;
    await tx.insert(auditLogs).values({
      actorUserId,
      action: "delete",
      entityType: "media_asset",
      entityId: assetId,
      previousData: prepared.asset,
      nextData: { removedStorageKeys: prepared.keys },
    });
  });
  return { status: "deleted" };
}
