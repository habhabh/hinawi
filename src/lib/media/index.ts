import { randomUUID } from "node:crypto";
import path from "node:path";
import { mediaUploadSchema } from "@/lib/validation/common";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
};

export function createStorageKey(mimeType: string, now = new Date()): string {
  const ext = extensions[mimeType];
  if (!ext) throw new Error("نوع الملف غير مدعوم");
  return `originals/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
}

export function assertSafeStorageKey(key: string): void {
  if (path.isAbsolute(key) || key.includes("..") || !/^[a-zA-Z0-9/_\-.]+$/.test(key)) {
    throw new Error("مسار التخزين غير صالح");
  }
}

export function validateMediaUpload(input: unknown, limits: { imageMb: number; videoMb: number }) {
  const parsed = mediaUploadSchema.parse(input);
  const maxMb = parsed.mimeType.startsWith("image/") ? limits.imageMb : limits.videoMb;
  if (parsed.sizeBytes > maxMb * 1024 * 1024) throw new Error(`الحد الأقصى للملف ${maxMb} ميجابايت`);
  return parsed;
}

export function canPublishProject(input: {
  title: string;
  slug: string;
  items: Array<{ isCover: boolean; status: string }>;
}): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.title.trim()) reasons.push("العنوان مطلوب");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) reasons.push("الرابط المختصر غير صالح");
  if (!input.items.length) reasons.push("أضف عنصر محتوى واحدًا على الأقل");
  if (!input.items.some((item) => item.isCover)) reasons.push("اختر غلافًا للمشروع");
  if (input.items.some((item) => item.status !== "ready")) reasons.push("انتظر اكتمال معالجة الوسائط");
  return { valid: reasons.length === 0, reasons };
}
