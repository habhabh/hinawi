import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { auditLogs, categories, mediaAssets, projectItems, projects, sellers, sellerProjects, users } from "@/db/schema";
import { deleteMediaAsset } from "@/features/admin/delete-media";
import { storage } from "@/lib/storage";

const run = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
run("تكامل قاعدة البيانات", () => {
  afterAll(() => pool.end());
  it("يُسند المشروع المركزي نفسه إلى عدة بائعين بلا نسخ", async () => {
    await db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({ slug: `test-${crypto.randomUUID()}`, title: "مشروع مركزي" }).returning();
      const insertedSellers = await tx.insert(sellers).values([{ slug: `a-${crypto.randomUUID()}`, name: "أحمد" }, { slug: `b-${crypto.randomUUID()}`, name: "خالد" }]).returning();
      await tx.insert(sellerProjects).values(insertedSellers.map((seller) => ({ sellerId: seller.id, projectId: project.id })));
      const assignments = await tx.select().from(sellerProjects).where(eq(sellerProjects.projectId, project.id));
      expect(assignments).toHaveLength(2);
      tx.rollback();
    }).catch((error) => { if (!(error instanceof Error && error.message.includes("Rollback"))) throw error; });
  });

  it("يحذف الوسيط من التخزين والعلاقات ويختار غلافًا بديلًا", async () => {
    const marker = crypto.randomUUID();
    const userId = `delete-media-${marker}`;
    const objectKey = `originals/tests/${marker}.jpg`;
    const variantKey = `variants/${marker}/custom.webp`;
    let projectId: string | undefined;
    let sellerId: string | undefined;
    let categoryId: string | undefined;
    let replacementAssetId: string | undefined;
    let deletedAssetId: string | undefined;
    try {
      await storage.write(objectKey, new Uint8Array([1, 2, 3]), "image/jpeg");
      await storage.write(variantKey, new Uint8Array([4, 5, 6]), "image/webp");
      await db.insert(users).values({ id: userId, name: "مختبر الحذف", email: `${marker}@example.test`, role: "super_admin" });
      const [deletedAsset, replacementAsset] = await db
        .insert(mediaAssets)
        .values([
          {
            type: "image",
            storageDriver: "local",
            objectKey,
            originalName: "delete.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 3,
            status: "ready",
            variants: { custom: { key: variantKey } },
            createdBy: userId,
          },
          {
            type: "image",
            storageDriver: "local",
            objectKey: `originals/tests/${marker}-replacement.jpg`,
            originalName: "replacement.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 3,
            status: "ready",
            createdBy: userId,
          },
        ])
        .returning();
      deletedAssetId = deletedAsset.id;
      replacementAssetId = replacementAsset.id;
      const [project] = await db
        .insert(projects)
        .values({ slug: `delete-${marker}`, title: "مشروع حذف الوسيط", createdBy: userId })
        .returning();
      projectId = project.id;
      await db.insert(projectItems).values([
        { projectId, itemType: "image", primaryAssetId: deletedAsset.id, altText: "الغلاف المحذوف", sortOrder: 0, isCover: true },
        { projectId, itemType: "image", primaryAssetId: replacementAsset.id, altText: "الغلاف البديل", sortOrder: 1 },
      ]);
      const [seller] = await db
        .insert(sellers)
        .values({ slug: `seller-${marker}`, name: "بائع الاختبار", avatarAssetId: deletedAsset.id })
        .returning();
      sellerId = seller.id;
      const [category] = await db
        .insert(categories)
        .values({ slug: `category-${marker}`, name: "قسم الاختبار", coverAssetId: deletedAsset.id })
        .returning();
      categoryId = category.id;

      expect(await deleteMediaAsset(deletedAsset.id, userId)).toEqual({ status: "deleted" });

      const [[remainingAsset], [remainingItem], [updatedSeller], [updatedCategory], [audit]] = await Promise.all([
        db.select().from(mediaAssets).where(eq(mediaAssets.id, deletedAsset.id)),
        db.select().from(projectItems).where(eq(projectItems.primaryAssetId, replacementAsset.id)),
        db.select().from(sellers).where(eq(sellers.id, seller.id)),
        db.select().from(categories).where(eq(categories.id, category.id)),
        db.select().from(auditLogs).where(eq(auditLogs.entityId, deletedAsset.id)),
      ]);
      expect(remainingAsset).toBeUndefined();
      expect(remainingItem?.isCover).toBe(true);
      expect(updatedSeller?.avatarAssetId).toBeNull();
      expect(updatedCategory?.coverAssetId).toBeNull();
      expect(audit?.action).toBe("delete");
      expect(await storage.exists(objectKey)).toBeNull();
      expect(await storage.exists(variantKey)).toBeNull();
    } finally {
      if (deletedAssetId) await db.delete(auditLogs).where(eq(auditLogs.entityId, deletedAssetId));
      if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
      if (sellerId) await db.delete(sellers).where(eq(sellers.id, sellerId));
      if (categoryId) await db.delete(categories).where(eq(categories.id, categoryId));
      if (replacementAssetId) await db.delete(mediaAssets).where(eq(mediaAssets.id, replacementAssetId));
      await db.delete(users).where(eq(users.id, userId));
      await storage.remove(objectKey);
      await storage.remove(variantKey);
    }
  });
});
