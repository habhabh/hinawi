import "server-only";
import { and, asc, count, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, categories, mediaAssets, projectCategories, projectItems, projects, qrLinks, sellerCategories, sellerProjects, sellers, users } from "@/db/schema";

export async function getDashboardStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [[sellerCount], [projectCount], [categoryCount], [imageCount], [videoCount]] = await Promise.all([
    db.select({ value: count() }).from(sellers).where(eq(sellers.isActive, true)),
    db.select({ value: count() }).from(projects).where(eq(projects.status, "published")),
    db.select({ value: count() }).from(categories).where(eq(categories.isActive, true)),
    db.select({ value: count() }).from(mediaAssets).where(eq(mediaAssets.type, "image")),
    db.select({ value: count() }).from(mediaAssets).where(eq(mediaAssets.type, "video")),
  ]);
  const events = await db
    .select({ eventType: analyticsEvents.eventType, value: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventType);
  const eventMap = Object.fromEntries(events.map((event) => [event.eventType, event.value]));
  const views = (eventMap.profile_view ?? 0) + (eventMap.project_view ?? 0);
  const contacts = (eventMap.whatsapp_click ?? 0) + (eventMap.phone_click ?? 0);
  return {
    sellers: sellerCount.value,
    projects: projectCount.value,
    categories: categoryCount.value,
    images: imageCount.value,
    videos: videoCount.value,
    views,
    qrScans: eventMap.qr_scan ?? 0,
    whatsappClicks: eventMap.whatsapp_click ?? 0,
    phoneClicks: eventMap.phone_click ?? 0,
    shares: eventMap.share_click ?? 0,
    engagementRate: views ? Math.round((contacts / views) * 1000) / 10 : 0,
  };
}

export const adminLists = {
  sellers: () => db.select().from(sellers).where(isNull(sellers.archivedAt)).orderBy(sellers.sortOrder, sellers.name),
  categories: () => db.select().from(categories).where(isNull(categories.archivedAt)).orderBy(categories.sortOrder, categories.name),
  projects: () => db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(desc(projects.updatedAt)),
  media: () => db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(100),
  qr: () => db.select({ qr: qrLinks, sellerName: sellers.name }).from(qrLinks).innerJoin(sellers, eq(sellers.id, qrLinks.sellerId)).orderBy(desc(qrLinks.createdAt)),
  users: () => db.select({ id: users.id, name: users.name, email: users.email, role: users.role, banned: users.banned, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
};

export async function getSellerEditor(id: string) {
  const [[seller], categoryRows, projectRows, assignedCategories, assignedProjects, avatars] = await Promise.all([
    db.select().from(sellers).where(and(eq(sellers.id, id), isNull(sellers.archivedAt))).limit(1),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(isNull(categories.archivedAt)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(isNull(projects.archivedAt)).orderBy(desc(projects.updatedAt)),
    db.select({ id: sellerCategories.categoryId }).from(sellerCategories).where(eq(sellerCategories.sellerId, id)),
    db.select({ id: sellerProjects.projectId }).from(sellerProjects).where(eq(sellerProjects.sellerId, id)),
    db.select({ id: mediaAssets.id, name: mediaAssets.originalName }).from(mediaAssets).where(and(eq(mediaAssets.status, "ready"), eq(mediaAssets.type, "image"))).orderBy(desc(mediaAssets.createdAt)).limit(200),
  ]);
  if (!seller) return null;
  return {
    seller,
    categories: categoryRows,
    projects: projectRows,
    avatars,
    categoryIds: assignedCategories.map((row) => row.id),
    projectIds: assignedProjects.map((row) => row.id),
  };
}

export async function getCategoryEditor(id: string) {
  const [[category], linkedProjects, linkedSellers] = await Promise.all([
    db.select().from(categories).where(and(eq(categories.id, id), isNull(categories.archivedAt))).limit(1),
    db.select({ id: projects.id, title: projects.title }).from(projectCategories).innerJoin(projects, eq(projects.id, projectCategories.projectId)).where(and(eq(projectCategories.categoryId, id), isNull(projects.archivedAt))).orderBy(asc(projects.title)),
    db.select({ id: sellers.id, name: sellers.name }).from(sellerCategories).innerJoin(sellers, eq(sellers.id, sellerCategories.sellerId)).where(and(eq(sellerCategories.categoryId, id), isNull(sellers.archivedAt))).orderBy(asc(sellers.name)),
  ]);
  return category ? { category, linkedProjects, linkedSellers } : null;
}

export async function getProjectEditor(id: string) {
  const [[project], categoryRows, sellerRows, assignedCategories, assignedSellers, assets, items] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.archivedAt))).limit(1),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(isNull(categories.archivedAt)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: sellers.id, name: sellers.name }).from(sellers).where(isNull(sellers.archivedAt)).orderBy(asc(sellers.sortOrder), asc(sellers.name)),
    db.select({ id: projectCategories.categoryId }).from(projectCategories).where(eq(projectCategories.projectId, id)),
    db.select({ id: sellerProjects.sellerId }).from(sellerProjects).where(eq(sellerProjects.projectId, id)),
    db.select({ id: mediaAssets.id, name: mediaAssets.originalName, type: mediaAssets.type }).from(mediaAssets).where(eq(mediaAssets.status, "ready")).orderBy(desc(mediaAssets.createdAt)).limit(300),
    db.select({ id: projectItems.id, assetId: projectItems.primaryAssetId, itemType: projectItems.itemType, isCover: projectItems.isCover }).from(projectItems).where(eq(projectItems.projectId, id)).orderBy(asc(projectItems.sortOrder)),
  ]);
  if (!project) return null;
  return {
    project,
    categories: categoryRows,
    sellers: sellerRows,
    assets,
    items,
    categoryIds: assignedCategories.map((row) => row.id),
    sellerIds: assignedSellers.map((row) => row.id),
  };
}
