"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditLogs, categories, projects, sellers } from "@/db/schema";
import { requirePermission } from "@/lib/auth/session";
import { categoryInputSchema, createSafeSlug, projectInputSchema, sellerInputSchema } from "@/lib/validation/common";

function bool(value: FormDataEntryValue | null) { return value === "on" || value === "true"; }

export async function createSellerAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const name = String(formData.get("name") ?? "");
  const data = sellerInputSchema.parse({
    name,
    slug: String(formData.get("slug") || createSafeSlug(name)),
    jobTitle: String(formData.get("jobTitle") ?? "") || undefined,
    bio: String(formData.get("bio") ?? "") || undefined,
    phoneE164: String(formData.get("phoneE164") ?? "") || undefined,
    whatsappE164: String(formData.get("whatsappE164") ?? "") || undefined,
    branch: String(formData.get("branch") ?? "") || undefined,
    isActive: bool(formData.get("isActive")),
  });
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(sellers).values(data).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "seller", entityId: created.id, nextData: created });
  });
  revalidatePath("/admin/sellers");
}

export async function createCategoryAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const name = String(formData.get("name") ?? "");
  const data = categoryInputSchema.parse({ name, slug: String(formData.get("slug") || createSafeSlug(name)), description: String(formData.get("description") ?? "") || undefined, isActive: bool(formData.get("isActive")) });
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(categories).values(data).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "category", entityId: created.id, nextData: created });
  });
  revalidatePath("/admin/categories");
}

export async function createProjectAction(formData: FormData) {
  const session = await requirePermission("content:write");
  const title = String(formData.get("title") ?? "");
  const data = projectInputSchema.parse({ title, slug: String(formData.get("slug") || createSafeSlug(title)), summary: String(formData.get("summary") ?? "") || undefined, status: "draft", materials: [] });
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(projects).values({ ...data, createdBy: session.user.id, updatedBy: session.user.id }).returning();
    await tx.insert(auditLogs).values({ actorUserId: session.user.id, action: "create", entityType: "project", entityId: created.id, nextData: created });
  });
  revalidatePath("/admin/projects");
}
