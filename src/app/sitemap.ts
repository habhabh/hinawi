import type { MetadataRoute } from "next";
import { listActiveSellers, listPublicCategories, listPublicProjects } from "@/db/queries/public";
import { absoluteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const [sellerRows, projectRows, categoryRows] = await Promise.all([listActiveSellers(), listPublicProjects(5000), listPublicCategories()]); return [{ url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 }, { url: absoluteUrl("/works"), changeFrequency: "weekly", priority: .9 }, ...sellerRows.map((s) => ({ url: absoluteUrl(`/s/${s.slug}`), changeFrequency: "weekly" as const, priority: .8 })), ...projectRows.map((p) => ({ url: absoluteUrl(`/works/${p.slug}`), lastModified: p.publishedAt || undefined, changeFrequency: "monthly" as const, priority: .7 })), ...categoryRows.map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), changeFrequency: "weekly" as const, priority: .6 }))]; }
