import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const userRole = pgEnum("user_role", ["super_admin", "admin", "editor"]);
export const projectStatus = pgEnum("project_status", ["draft", "published", "archived"]);
export const mediaType = pgEnum("media_type", ["image", "video"]);
export const mediaStatus = pgEnum("media_status", [
  "pending_upload",
  "uploaded",
  "processing",
  "ready",
  "failed",
  "archived",
]);
export const projectItemType = pgEnum("project_item_type", ["image", "video", "before_after"]);
export const jobStatus = pgEnum("job_status", ["queued", "processing", "completed", "failed"]);

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("editor"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("user_email_uidx").on(t.email)],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (t) => [uniqueIndex("session_token_uidx").on(t.token), index("session_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: mediaType("type").notNull(),
    storageDriver: text("storage_driver").notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    checksum: text("checksum"),
    status: mediaStatus("status").notNull().default("pending_upload"),
    errorMessage: text("error_message"),
    variants: jsonb("variants").$type<Record<string, { key: string; width?: number; height?: number }>>().notNull().default({}),
    posterAssetId: uuid("poster_asset_id"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("media_object_key_uidx").on(t.objectKey),
    index("media_status_idx").on(t.status),
    check("media_size_positive", sql`${t.sizeBytes} >= 0`),
    foreignKey({ columns: [t.posterAssetId], foreignColumns: [t.id], name: "media_assets_poster_asset_fk" }).onDelete("set null"),
  ],
);

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull().default("الحناوي للديكور"),
  shortName: text("short_name").notNull().default("الحناوي"),
  logoAssetId: uuid("logo_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  faviconAssetId: uuid("favicon_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  primaryColor: text("primary_color").notNull().default("#7B5E46"),
  secondaryColor: text("secondary_color").notNull().default("#C8A982"),
  backgroundColor: text("background_color").notNull().default("#F7F3EC"),
  textColor: text("text_color").notNull().default("#27231F"),
  generalPhoneE164: text("general_phone_e164"),
  generalWhatsappE164: text("general_whatsapp_e164"),
  generalEmail: text("general_email"),
  address: text("address"),
  defaultWhatsappMessage: text("default_whatsapp_message"),
  publicProjectsDirectoryEnabled: boolean("public_projects_directory_enabled").notNull().default(true),
  publicSellerDirectoryEnabled: boolean("public_seller_directory_enabled").notNull().default(true),
  publicCategoryPagesEnabled: boolean("public_category_pages_enabled").notNull().default(true),
  defaultSeoTitle: text("default_seo_title"),
  defaultSeoDescription: text("default_seo_description"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
  imageMaxSizeMb: integer("image_max_size_mb").notNull().default(20),
  videoMaxSizeMb: integer("video_max_size_mb").notNull().default(150),
  qrCardMessage: text("qr_card_message").notNull().default("امسح الرمز لمشاهدة أعمالنا"),
  ...timestamps,
});

export const sellers = pgTable(
  "sellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    jobTitle: text("job_title"),
    bio: text("bio"),
    avatarAssetId: uuid("avatar_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    phoneE164: text("phone_e164"),
    whatsappE164: text("whatsapp_e164"),
    email: text("email"),
    showEmail: boolean("show_email").notNull().default(false),
    branch: text("branch"),
    customWhatsappMessage: text("custom_whatsapp_message"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("seller_slug_uidx").on(t.slug), index("seller_active_order_idx").on(t.isActive, t.sortOrder)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    coverAssetId: uuid("cover_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    iconName: text("icon_name"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("category_slug_uidx").on(t.slug), index("category_active_order_idx").on(t.isActive, t.sortOrder)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    description: text("description"),
    status: projectStatus("status").notNull().default("draft"),
    location: text("location"),
    projectYear: integer("project_year"),
    designStyle: text("design_style"),
    materials: text("materials").array().notNull().default([]),
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogAssetId: uuid("og_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    featured: boolean("featured").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("project_slug_uidx").on(t.slug), index("project_status_published_idx").on(t.status, t.publishedAt)],
);

export const sellerCategories = pgTable(
  "seller_categories",
  {
    sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    isVisible: boolean("is_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sellerId, t.categoryId] }), index("seller_category_order_idx").on(t.sellerId, t.sortOrder)],
);

export const projectCategories = pgTable(
  "project_categories",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.categoryId] }),
    index("project_category_order_idx").on(t.projectId, t.sortOrder),
    uniqueIndex("one_primary_category_per_project_uidx").on(t.projectId).where(sql`${t.isPrimary} = true`),
  ],
);

export const sellerProjects = pgTable(
  "seller_projects",
  {
    sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    isVisible: boolean("is_visible").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    customCaption: text("custom_caption"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sellerId, t.projectId] }), index("seller_project_order_idx").on(t.sellerId, t.sortOrder)],
);

export const projectItems = pgTable(
  "project_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    itemType: projectItemType("item_type").notNull(),
    primaryAssetId: uuid("primary_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "restrict" }),
    secondaryAssetId: uuid("secondary_asset_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
    posterAssetId: uuid("poster_asset_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
    title: text("title"),
    caption: text("caption"),
    altText: text("alt_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("project_item_order_idx").on(t.projectId, t.sortOrder),
    uniqueIndex("one_cover_per_project_uidx").on(t.projectId).where(sql`${t.isCover} = true`),
    check("before_after_secondary_check", sql`${t.itemType} <> 'before_after' OR ${t.secondaryAssetId} IS NOT NULL`),
  ],
);

export const mediaJobs = pgTable(
  "media_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaAssetId: uuid("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("media_job_claim_idx").on(t.status, t.availableAt)],
);

export const qrLinks = pgTable(
  "qr_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "restrict" }),
    label: text("label"),
    isActive: boolean("is_active").notNull().default(true),
    scanCount: bigint("scan_count", { mode: "number" }).notNull().default(0),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("qr_token_uidx").on(t.token), index("qr_seller_idx").on(t.sellerId)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventType: text("event_type").notNull(),
    sellerId: uuid("seller_id").references(() => sellers.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    qrLinkId: uuid("qr_link_id").references(() => qrLinks.id, { onDelete: "set null" }),
    anonymousSessionId: text("anonymous_session_id"),
    source: text("source"),
    path: text("path"),
    deviceClass: text("device_class"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_type_date_idx").on(t.eventType, t.createdAt), index("analytics_seller_date_idx").on(t.sellerId, t.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    previousData: jsonb("previous_data"),
    nextData: jsonb("next_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity_date_idx").on(t.entityType, t.entityId, t.createdAt)],
);

export const sellerRelations = relations(sellers, ({ many, one }) => ({
  avatar: one(mediaAssets, { fields: [sellers.avatarAssetId], references: [mediaAssets.id] }),
  projects: many(sellerProjects),
  categories: many(sellerCategories),
  qrLinks: many(qrLinks),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  sellers: many(sellerProjects),
  categories: many(projectCategories),
  items: many(projectItems),
}));

export const sellerProjectRelations = relations(sellerProjects, ({ one }) => ({
  seller: one(sellers, { fields: [sellerProjects.sellerId], references: [sellers.id] }),
  project: one(projects, { fields: [sellerProjects.projectId], references: [projects.id] }),
}));

// Better Auth's Drizzle adapter resolves these canonical model keys.
export { accounts as account, sessions as session, users as user, verifications as verification };
