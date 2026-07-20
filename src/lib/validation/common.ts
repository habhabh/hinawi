import { randomBytes } from "node:crypto";
import { z } from "zod";
import { toEnglishDigits } from "@/lib/phone";

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط");

export function createSafeSlug(value: string): string {
  const ascii = toEnglishDigits(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return ascii || `item-${randomBytes(5).toString("hex")}`;
}

export const qrTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

export function createQrToken(): string {
  return randomBytes(32).toString("base64url");
}

export const eventTypes = [
  "profile_view",
  "category_view",
  "project_view",
  "qr_scan",
  "whatsapp_click",
  "phone_click",
  "share_click",
  "link_copy",
  "media_play",
  "before_after_interaction",
] as const;

export const analyticsEventSchema = z.object({
  eventType: z.enum(eventTypes),
  sellerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  source: z.string().max(80).optional(),
  path: z.string().max(300).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const sellerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  jobTitle: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1200).optional(),
  phoneE164: z.string().max(20).optional(),
  whatsappE164: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  branch: z.string().max(120).optional(),
  isActive: z.boolean().default(true),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: slugSchema,
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  location: z.string().max(120).optional(),
  projectYear: z.number().int().min(2000).max(2200).optional(),
  designStyle: z.string().max(120).optional(),
  materials: z.array(z.string().max(80)).max(30).default([]),
});

export const mediaUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4"]),
  sizeBytes: z.number().int().positive(),
});
