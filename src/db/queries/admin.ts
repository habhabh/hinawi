import "server-only";
import { count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, categories, mediaAssets, projects, qrLinks, sellers, users } from "@/db/schema";

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
  sellers: () => db.select().from(sellers).orderBy(sellers.sortOrder, sellers.name),
  categories: () => db.select().from(categories).orderBy(categories.sortOrder, categories.name),
  projects: () => db.select().from(projects).orderBy(desc(projects.updatedAt)),
  media: () => db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(100),
  qr: () => db.select({ qr: qrLinks, sellerName: sellers.name }).from(qrLinks).innerJoin(sellers, eq(sellers.id, qrLinks.sellerId)).orderBy(desc(qrLinks.createdAt)),
  users: () => db.select({ id: users.id, name: users.name, email: users.email, role: users.role, banned: users.banned, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
};
