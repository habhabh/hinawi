import { describe, expect, it } from "vitest";
import { mediaStorageKeys } from "@/features/admin/delete-media";
import { can, assertPermission } from "@/lib/permissions";
import { toEnglishDigits, normalizePhone } from "@/lib/phone";
import { buildWhatsappUrl, interpolateWhatsappMessage } from "@/lib/whatsapp";
import { createSafeSlug, qrTokenSchema, analyticsEventSchema, sellerInputSchema } from "@/lib/validation/common";
import { createStorageKey, canPublishProject, mediaCoverKey, validateMediaUpload } from "@/lib/media";
import { relativeRedirect, resolveQrSellerSlug } from "@/lib/qr";
import { isPublicDeploymentUrl, projectCanonical } from "@/lib/seo";

describe("أرقام الهاتف وواتساب", () => {
  it("يحوّل الأرقام العربية والفارسية", () => expect(toEnglishDigits("٠١٢۳۴۵6789")).toBe("0123456789"));
  it("يطبع الرقم السعودي بصيغة E.164", () => expect(normalizePhone("٠٥٠ ١٢٣ ٤٥٦٧")).toBe("+966501234567"));
  it("يرفض رقمًا قصيرًا", () => expect(normalizePhone("123")).toBeNull());
  it("يرمز رسالة واتساب والرابط", () => expect(buildWhatsappUrl("+966501234567", "مرحبًا أحمد", "https://example.com/p?x=1")).toContain("%D9%85%D8%B1"));
  it("يستبدل المتغيرات", () => expect(interpolateWhatsappMessage("{seller_name}: {project_title}", { sellerName: "سارة", projectTitle: "مدخل" })).toBe("سارة: مدخل"));
});

describe("التحقق والأمان", () => {
  it("ينشئ slug آمنًا للاسم العربي", () => expect(createSafeSlug("أحمد العتيبي")).toMatch(/^item-[a-f0-9]{10}$/));
  it("يتحقق من QR طويل", () => expect(qrTokenSchema.safeParse("a".repeat(32)).success).toBe(true));
  it("يصلح رابط بائع قديم غير صالح عند فتح QR", () => {
    expect(resolveQrSellerSlug("---", "123e4567-e89b-12d3-a456-426614174000")).toBe("seller-123e4567-e89b-12d3-a456-426614174000");
  });
  it("يعيد QR إلى مسار نسبي ويبقي دومين الزائر", () => {
    expect(relativeRedirect("/s/seller-id").headers.get("location")).toBe("/s/seller-id");
  });
  it("يرفض عنوان الحاوية كدومين إنتاج", () => {
    expect(isPublicDeploymentUrl("https://0.0.0.0:3000")).toBe(false);
    expect(isPublicDeploymentUrl("https://show.alhennawi.sa")).toBe(true);
  });
  it("يرفض حدث تحليلات مجهولًا", () => expect(analyticsEventSchema.safeParse({ eventType: "sale" }).success).toBe(false));
  it("يتحقق من seller input", () => expect(sellerInputSchema.safeParse({ name: "أحمد", slug: "ahmed", isActive: true }).success).toBe(true));
  it("يمنع editor من إدارة المستخدمين", () => { expect(can("editor", "content:write")).toBe(true); expect(() => assertPermission("editor", "users:manage")).toThrow(); });
  it("ينشئ object key عشوائيًا وغير مشتق من الاسم", () => { const key = createStorageKey("image/jpeg", new Date("2026-07-20")); expect(key).toMatch(/^originals\/2026\/07\/[a-f0-9-]+\.jpg$/); });
  it("يفرض حد الوسائط", () => expect(() => validateMediaUpload({ fileName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 2_000_000 }, { imageMb: 1, videoMb: 10 })).toThrow());
});

describe("النشر وSEO", () => {
  it("يرفض مشروعًا بلا غلاف", () => expect(canPublishProject({ title: "مشروع", slug: "project", items: [{ isCover: false, status: "ready" }] }).valid).toBe(false));
  it("يرفض الوسائط تحت المعالجة", () => expect(canPublishProject({ title: "مشروع", slug: "project", items: [{ isCover: true, status: "processing" }] }).reasons).toContain("انتظر اكتمال معالجة الوسائط"));
  it("ينتج canonical مركزيًا بلا advisor", () => expect(projectCanonical("oak-room")).toMatch(/\/works\/oak-room$/));
  it("يستخدم Poster الفيديو كغلاف بدل ملف MP4", () => {
    expect(mediaCoverKey({
      type: "video",
      objectKey: "originals/project.mp4",
      variants: { poster: { key: "variants/video/poster.jpg" } },
    })).toBe("variants/video/poster.jpg");
  });
  it("لا يمرر ملف MP4 إلى مكوّن الصور عند غياب Poster", () => {
    expect(mediaCoverKey({ type: "video", objectKey: "originals/project.mp4", variants: {} })).toBeNull();
  });
});

describe("حذف الوسائط", () => {
  it("يجمع الأصل والنسخ المسجلة والمتوقعة للحذف من التخزين", () => {
    const id = "37f34eb0-d6e1-4569-b76a-5c2a36bd87a8";
    const keys = mediaStorageKeys({
      id,
      objectKey: "originals/2026/07/image.jpg",
      variants: {
        custom: { key: `variants/${id}/custom.webp`, width: 900 },
        thumbnail: { key: `variants/${id}/thumbnail.webp`, width: 320 },
      },
    });
    expect(keys).toContain("originals/2026/07/image.jpg");
    expect(keys).toContain(`variants/${id}/custom.webp`);
    expect(keys).toContain(`variants/${id}/thumbnail.webp`);
    expect(keys).toContain(`variants/${id}/poster.jpg`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
