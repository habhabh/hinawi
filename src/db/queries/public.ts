import "server-only";
import { and, asc, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  mediaAssets,
  projectCategories,
  projectItems,
  projects,
  sellerCategories,
  sellerProjects,
  sellers,
  siteSettings,
} from "@/db/schema";
import { storage } from "@/lib/storage";

export const defaultSettings = {
  companyName: "الحناوي للديكور",
  shortName: "الحناوي",
  primaryColor: "#7B5E46",
  secondaryColor: "#C8A982",
  backgroundColor: "#F7F3EC",
  textColor: "#27231F",
  generalPhoneE164: null,
  generalWhatsappE164: null,
  address: "",
  defaultSeoTitle: "الحناوي للديكور والخزائن",
  defaultSeoDescription: "مكتبة أعمال الحناوي للديكور وخزانات الملابس المصممة بعناية.",
  publicProjectsDirectoryEnabled: true,
  publicSellerDirectoryEnabled: true,
  publicCategoryPagesEnabled: true,
};

export async function getSettings() {
  const row = await db.select().from(siteSettings).limit(1);
  return row[0] ?? defaultSettings;
}

export async function listActiveSellers() {
  return db
    .select({ id: sellers.id, slug: sellers.slug, name: sellers.name, jobTitle: sellers.jobTitle, branch: sellers.branch })
    .from(sellers)
    .where(and(eq(sellers.isActive, true), isNull(sellers.archivedAt)))
    .orderBy(asc(sellers.sortOrder), asc(sellers.name));
}

export async function getSellerPage(slug: string, categorySlug?: string, cursor?: string, limit = 18) {
  const sellerRows = await db
    .select({
      id: sellers.id,
      slug: sellers.slug,
      name: sellers.name,
      jobTitle: sellers.jobTitle,
      bio: sellers.bio,
      branch: sellers.branch,
      phoneE164: sellers.phoneE164,
      whatsappE164: sellers.whatsappE164,
      email: sellers.email,
      showEmail: sellers.showEmail,
      customWhatsappMessage: sellers.customWhatsappMessage,
      seoTitle: sellers.seoTitle,
      seoDescription: sellers.seoDescription,
      avatarKey: mediaAssets.objectKey,
    })
    .from(sellers)
    .leftJoin(mediaAssets, eq(sellers.avatarAssetId, mediaAssets.id))
    .where(and(eq(sellers.slug, slug), eq(sellers.isActive, true), isNull(sellers.archivedAt)))
    .limit(1);
  const seller = sellerRows[0];
  if (!seller) return null;

  const availableCategories = await db
    .selectDistinct({ id: categories.id, slug: categories.slug, name: categories.name, iconName: categories.iconName, sortOrder: categories.sortOrder })
    .from(categories)
    .innerJoin(sellerCategories, and(eq(sellerCategories.categoryId, categories.id), eq(sellerCategories.sellerId, seller.id)))
    .innerJoin(projectCategories, eq(projectCategories.categoryId, categories.id))
    .innerJoin(sellerProjects, and(eq(sellerProjects.projectId, projectCategories.projectId), eq(sellerProjects.sellerId, seller.id)))
    .innerJoin(projects, eq(projects.id, sellerProjects.projectId))
    .where(and(eq(categories.isActive, true), isNull(categories.archivedAt), eq(sellerCategories.isVisible, true), eq(sellerProjects.isVisible, true), eq(projects.status, "published"), isNull(projects.archivedAt)))
    .orderBy(asc(categories.sortOrder));

  const selectedCategory = categorySlug ? availableCategories.find((item) => item.slug === categorySlug) : undefined;
  const where = and(
    eq(sellerProjects.sellerId, seller.id),
    eq(sellerProjects.isVisible, true),
    eq(projects.status, "published"),
    isNull(projects.archivedAt),
    cursor ? lt(projects.id, cursor) : undefined,
    selectedCategory ? eq(projectCategories.categoryId, selectedCategory.id) : undefined,
  );

  const rows = await db
    .selectDistinct({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      location: projects.location,
      projectYear: projects.projectYear,
      coverKey: mediaAssets.objectKey,
      coverType: mediaAssets.type,
      itemCount: sql<number>`count(${projectItems.id}) over (partition by ${projects.id})`,
      sellerSortOrder: sellerProjects.sortOrder,
      publishedAt: projects.publishedAt,
    })
    .from(sellerProjects)
    .innerJoin(projects, eq(projects.id, sellerProjects.projectId))
    .leftJoin(projectCategories, eq(projectCategories.projectId, projects.id))
    .leftJoin(projectItems, eq(projectItems.projectId, projects.id))
    .leftJoin(mediaAssets, eq(projectItems.primaryAssetId, mediaAssets.id))
    .where(and(where, or(eq(projectItems.isCover, true), isNull(projectItems.id))))
    .orderBy(asc(sellerProjects.sortOrder), desc(projects.publishedAt), desc(projects.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit);
  return {
    seller: { ...seller, avatarUrl: seller.avatarKey ? storage.publicUrl(seller.avatarKey) : null },
    categories: availableCategories,
    projects: visible.map((project) => ({ ...project, coverUrl: project.coverKey ? storage.publicUrl(project.coverKey) : null })),
    nextCursor: hasMore ? visible.at(-1)?.id : null,
  };
}

export async function getProjectBySlug(slug: string, includeDraft = false) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), includeDraft ? undefined : eq(projects.status, "published"), isNull(projects.archivedAt)))
    .limit(1);
  const project = rows[0];
  if (!project) return null;
  const items = await db
    .select({
      id: projectItems.id,
      itemType: projectItems.itemType,
      title: projectItems.title,
      caption: projectItems.caption,
      altText: projectItems.altText,
      isCover: projectItems.isCover,
      primaryKey: mediaAssets.objectKey,
      primaryType: mediaAssets.type,
      width: mediaAssets.width,
      height: mediaAssets.height,
      variants: mediaAssets.variants,
      secondaryKey: sql<string | null>`secondary.object_key`,
      posterKey: sql<string | null>`poster.object_key`,
    })
    .from(projectItems)
    .innerJoin(mediaAssets, eq(projectItems.primaryAssetId, mediaAssets.id))
    .leftJoin(sql`${mediaAssets} secondary`, sql`${projectItems.secondaryAssetId} = secondary.id`)
    .leftJoin(sql`${mediaAssets} poster`, sql`${projectItems.posterAssetId} = poster.id`)
    .where(and(eq(projectItems.projectId, project.id), eq(mediaAssets.status, "ready")))
    .orderBy(asc(projectItems.sortOrder));
  const projectCategoriesRows = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(projectCategories)
    .innerJoin(categories, eq(categories.id, projectCategories.categoryId))
    .where(eq(projectCategories.projectId, project.id))
    .orderBy(desc(projectCategories.isPrimary), asc(projectCategories.sortOrder));
  return {
    ...project,
    categories: projectCategoriesRows,
    items: items.map((item) => ({
      ...item,
      primaryUrl: storage.publicUrl(item.primaryKey),
      secondaryUrl: item.secondaryKey ? storage.publicUrl(item.secondaryKey) : null,
      posterUrl: item.posterKey ? storage.publicUrl(item.posterKey) : null,
    })),
  };
}

export async function listPublicProjects(limit = 24) {
  return db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, summary: projects.summary, publishedAt: projects.publishedAt })
    .from(projects)
    .where(and(eq(projects.status, "published"), isNull(projects.archivedAt)))
    .orderBy(desc(projects.publishedAt))
    .limit(limit);
}

export async function listPublicCategories() {
  return db.select().from(categories).where(and(eq(categories.isActive, true), isNull(categories.archivedAt))).orderBy(asc(categories.sortOrder));
}

export async function getCategoryPage(slug: string) {
  const rows = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.isActive, true), isNull(categories.archivedAt))).limit(1);
  if (!rows[0]) return null;
  const works = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, summary: projects.summary })
    .from(projectCategories)
    .innerJoin(projects, eq(projects.id, projectCategories.projectId))
    .where(and(eq(projectCategories.categoryId, rows[0].id), eq(projects.status, "published"), isNull(projects.archivedAt)))
    .orderBy(desc(projects.publishedAt));
  return { category: rows[0], projects: works };
}

export async function publicCounts() {
  const [sellerCount] = await db.select({ value: count() }).from(sellers).where(and(eq(sellers.isActive, true), isNull(sellers.archivedAt)));
  const [projectCount] = await db.select({ value: count() }).from(projects).where(and(eq(projects.status, "published"), isNull(projects.archivedAt)));
  return { sellers: sellerCount.value, projects: projectCount.value };
}
