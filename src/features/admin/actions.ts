"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  auditLogs,
  categories,
  mediaAssets,
  projectCategories,
  projectItems,
  projects,
  sellerCategories,
  sellerProjects,
  sellers,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { categoryInputSchema, createSafeSlug, projectInputSchema, sellerInputSchema } from "@/lib/validation/common";
import { deleteMediaAsset } from "@/features/admin/delete-media";

const idSchema = z.string().uuid();

function bool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function ids(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map(String))].map((value) => idSchema.parse(value));
}

function refreshContent() {
  revalidatePath("/admin/sellers");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
}

async function replaceSellerRelations(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sellerId: string,
  categoryIds: string[],
  projectIds: string[],
) {
  const projectCategoryRows = projectIds.length
    ? await tx.select({ categoryId: projectCategories.categoryId }).from(projectCategories).where(inArray(projectCategories.projectId, projectIds))
    : [];
  const resolvedCategoryIds = [...new Set([...categoryIds, ...projectCategoryRows.map((row) => row.categoryId)])];
  await tx.delete(sellerCategories).where(eq(sellerCategories.sellerId, sellerId));
  await tx.delete(sellerProjects).where(eq(sellerProjects.sellerId, sellerId));
  if (resolvedCategoryIds.length) {
    await tx.insert(sellerCategories).values(resolvedCategoryIds.map((categoryId, sortOrder) => ({ sellerId, categoryId, sortOrder })));
  }
  if (projectIds.length) {
    await tx.insert(sellerProjects).values(projectIds.map((projectId, sortOrder) => ({ sellerId, projectId, sortOrder })));
  }
}

export async function createSellerAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const name = String(formData.get("name") ?? "");
  const data = sellerInputSchema.parse({
    name,
    slug: String(formData.get("slug") || createSafeSlug(name)),
    jobTitle: optional(formData.get("jobTitle")),
    bio: optional(formData.get("bio")),
    phoneE164: optional(formData.get("phoneE164")),
    whatsappE164: optional(formData.get("whatsappE164")),
    branch: optional(formData.get("branch")),
    isActive: bool(formData.get("isActive")),
  });
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(sellers).values(data).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "seller", entityId: rows[0].id, nextData: rows[0] });
    return rows;
  });
  refreshContent();
  redirect(`/admin/sellers/${created.id}`);
}

export async function updateSellerAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  const name = String(formData.get("name") ?? "");
  const avatarAssetId = optional(formData.get("avatarAssetId"));
  if (avatarAssetId) idSchema.parse(avatarAssetId);
  const data = sellerInputSchema.parse({
    name,
    slug: String(formData.get("slug") || createSafeSlug(name)),
    jobTitle: optional(formData.get("jobTitle")),
    bio: optional(formData.get("bio")),
    phoneE164: optional(formData.get("phoneE164")),
    whatsappE164: optional(formData.get("whatsappE164")),
    email: optional(formData.get("email")) ?? "",
    branch: optional(formData.get("branch")),
    isActive: bool(formData.get("isActive")),
  });
  const categoryIds = ids(formData, "categoryIds");
  const projectIds = ids(formData, "projectIds");
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(sellers).where(eq(sellers.id, id)).limit(1);
    const [updated] = await tx.update(sellers).set({
      name: data.name,
      slug: data.slug,
      jobTitle: data.jobTitle ?? null,
      bio: data.bio ?? null,
      phoneE164: data.phoneE164 ?? null,
      whatsappE164: data.whatsappE164 ?? null,
      email: data.email || null,
      branch: data.branch ?? null,
      isActive: data.isActive,
      avatarAssetId: avatarAssetId ?? null,
      showEmail: bool(formData.get("showEmail")),
      customWhatsappMessage: optional(formData.get("customWhatsappMessage")) ?? null,
      seoTitle: optional(formData.get("seoTitle")) ?? null,
      seoDescription: optional(formData.get("seoDescription")) ?? null,
      updatedAt: new Date(),
    }).where(eq(sellers.id, id)).returning();
    if (!updated) throw new Error("البائع غير موجود");
    await replaceSellerRelations(tx, id, categoryIds, projectIds);
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "update", entityType: "seller", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect(`/admin/sellers/${id}?saved=1`);
}

export async function archiveSellerAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(sellers).where(eq(sellers.id, id)).limit(1);
    const [updated] = await tx.update(sellers).set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() }).where(eq(sellers.id, id)).returning();
    if (!updated) throw new Error("البائع غير موجود");
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "archive", entityType: "seller", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect("/admin/sellers");
}

export async function createCategoryAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const name = String(formData.get("name") ?? "");
  const data = categoryInputSchema.parse({ name, slug: String(formData.get("slug") || createSafeSlug(name)), description: optional(formData.get("description")), isActive: bool(formData.get("isActive")) });
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(categories).values(data).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "category", entityId: rows[0].id, nextData: rows[0] });
    return rows;
  });
  refreshContent();
  redirect(`/admin/categories/${created.id}`);
}

export async function updateCategoryAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  const name = String(formData.get("name") ?? "");
  const data = categoryInputSchema.parse({ name, slug: String(formData.get("slug") || createSafeSlug(name)), description: optional(formData.get("description")), isActive: bool(formData.get("isActive")) });
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
    const [updated] = await tx.update(categories).set({ name: data.name, slug: data.slug, description: data.description ?? null, isActive: data.isActive, seoTitle: optional(formData.get("seoTitle")) ?? null, seoDescription: optional(formData.get("seoDescription")) ?? null, updatedAt: new Date() }).where(eq(categories.id, id)).returning();
    if (!updated) throw new Error("القسم غير موجود");
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "update", entityType: "category", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect(`/admin/categories/${id}?saved=1`);
}

export async function archiveCategoryAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
    const [updated] = await tx.update(categories).set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() }).where(eq(categories.id, id)).returning();
    if (!updated) throw new Error("القسم غير موجود");
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "archive", entityType: "category", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect("/admin/categories");
}

export async function createProjectAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const title = String(formData.get("title") ?? "");
  const data = projectInputSchema.parse({ title, slug: String(formData.get("slug") || createSafeSlug(title)), summary: optional(formData.get("summary")), status: "draft", materials: [] });
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(projects).values({ ...data, createdBy: session.user.id, updatedBy: session.user.id }).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "project", entityId: rows[0].id, nextData: rows[0] });
    return rows;
  });
  refreshContent();
  redirect(`/admin/projects/${created.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  const title = String(formData.get("title") ?? "");
  const yearText = optional(formData.get("projectYear"));
  const materials = String(formData.get("materials") ?? "").split(/[،,\n]/).map((value) => value.trim()).filter(Boolean);
  const data = projectInputSchema.parse({
    title,
    slug: String(formData.get("slug") || createSafeSlug(title)),
    summary: optional(formData.get("summary")),
    description: optional(formData.get("description")),
    status: String(formData.get("status") || "draft"),
    location: optional(formData.get("location")),
    projectYear: yearText ? Number(yearText) : undefined,
    designStyle: optional(formData.get("designStyle")),
    materials,
  });
  const categoryIds = ids(formData, "categoryIds");
  const sellerIds = ids(formData, "sellerIds");
  const mediaAssetIds = ids(formData, "mediaAssetIds");
  const requestedCoverId = optional(formData.get("coverAssetId"));
  if (requestedCoverId) idSchema.parse(requestedCoverId);

  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!previous) throw new Error("المشروع غير موجود");
    const [updated] = await tx.update(projects).set({
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      description: data.description ?? null,
      status: data.status,
      location: data.location ?? null,
      projectYear: data.projectYear ?? null,
      designStyle: data.designStyle ?? null,
      materials: data.materials,
      seoTitle: optional(formData.get("seoTitle")) ?? null,
      seoDescription: optional(formData.get("seoDescription")) ?? null,
      featured: bool(formData.get("featured")),
      publishedAt: data.status === "published" ? previous.publishedAt ?? new Date() : null,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(projects.id, id)).returning();

    await tx.delete(projectCategories).where(eq(projectCategories.projectId, id));
    if (categoryIds.length) {
      await tx.insert(projectCategories).values(categoryIds.map((categoryId, sortOrder) => ({ projectId: id, categoryId, sortOrder, isPrimary: sortOrder === 0 })));
    }
    await tx.delete(sellerProjects).where(eq(sellerProjects.projectId, id));
    if (sellerIds.length) {
      await tx.insert(sellerProjects).values(sellerIds.map((sellerId, sortOrder) => ({ projectId: id, sellerId, sortOrder })));
    }
    if (sellerIds.length && categoryIds.length) {
      await tx.insert(sellerCategories).values(sellerIds.flatMap((sellerId) => categoryIds.map((categoryId, sortOrder) => ({ sellerId, categoryId, sortOrder })))).onConflictDoNothing();
    }

    const existingItems = await tx.select().from(projectItems).where(eq(projectItems.projectId, id));
    const normalItems = existingItems.filter((item) => item.itemType !== "before_after");
    const selectedAssets = mediaAssetIds.length
      ? await tx.select({ id: mediaAssets.id, type: mediaAssets.type }).from(mediaAssets).where(and(inArray(mediaAssets.id, mediaAssetIds), eq(mediaAssets.status, "ready")))
      : [];
    if (selectedAssets.length !== mediaAssetIds.length) throw new Error("بعض الوسائط المختارة غير جاهزة أو غير موجودة");
    const selectedSet = new Set(mediaAssetIds);
    const removeIds = normalItems.filter((item) => !selectedSet.has(item.primaryAssetId)).map((item) => item.id);
    if (removeIds.length) await tx.delete(projectItems).where(inArray(projectItems.id, removeIds));
    const existingAssetIds = new Set(existingItems.map((item) => item.primaryAssetId));
    const additions = selectedAssets.filter((asset) => !existingAssetIds.has(asset.id));
    if (additions.length) {
      await tx.insert(projectItems).values(additions.map((asset, index) => ({ projectId: id, itemType: asset.type, primaryAssetId: asset.id, altText: title, sortOrder: existingItems.length + index })));
    }
    await tx.update(projectItems).set({ isCover: false }).where(eq(projectItems.projectId, id));
    const coverAssetId = requestedCoverId && selectedSet.has(requestedCoverId) ? requestedCoverId : mediaAssetIds[0];
    if (coverAssetId) await tx.update(projectItems).set({ isCover: true }).where(and(eq(projectItems.projectId, id), eq(projectItems.primaryAssetId, coverAssetId)));

    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "update", entityType: "project", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect(`/admin/projects/${id}?saved=1`);
}

export async function archiveProjectAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const id = idSchema.parse(formData.get("id"));
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
    const [updated] = await tx.update(projects).set({ status: "archived", archivedAt: new Date(), updatedBy: session.user.id, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    if (!updated) throw new Error("المشروع غير موجود");
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "archive", entityType: "project", entityId: id, previousData: previous, nextData: updated });
  });
  refreshContent();
  redirect("/admin/projects");
}

export async function deleteMediaAction(formData: FormData) {
  const session = await requirePermission("media:write");
  const id = idSchema.parse(formData.get("id"));
  const result = await deleteMediaAsset(id, session.user.id);
  refreshContent();
  if (result.status === "busy") redirect("/admin/media?busy=1");
  if (result.status === "storage_failed") redirect("/admin/media?deleteError=1");
  redirect("/admin/media?deleted=1");
}
