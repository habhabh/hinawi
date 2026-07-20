import { Readable } from "node:stream";
import { db, pool } from "@/db";
import { categories, mediaAssets, projectCategories, projectItems, projects, qrLinks, sellerCategories, sellerProjects, sellers, siteSettings } from "@/db/schema";
import { storage } from "@/lib/storage";

const ids = {
  settings: "00000000-0000-4000-8000-000000000001",
  sellers: ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000003"],
  categories: ["20000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000002", "20000000-0000-4000-8000-000000000003", "20000000-0000-4000-8000-000000000004", "20000000-0000-4000-8000-000000000005"],
  projects: ["30000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000002", "30000000-0000-4000-8000-000000000003", "30000000-0000-4000-8000-000000000004", "30000000-0000-4000-8000-000000000005"],
};

function placeholder(title: string, tone: string) { return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f0e7dc"/><rect x="110" y="130" width="980" height="830" rx="36" fill="${tone}"/><path d="M180 880V300h310v580zm360 0V300h480v580z" fill="#fffaf4" opacity=".78"/><text x="600" y="1060" text-anchor="middle" font-family="Tahoma,sans-serif" font-size="54" fill="#3d3027">${title}</text></svg>`; }

async function main() {
  await db.insert(siteSettings).values({ id: ids.settings, companyName: "الحناوي للديكور", shortName: "الحناوي", generalPhoneE164: "+966500000000", generalWhatsappE164: "+966500000000", address: "الرياض، المملكة العربية السعودية", defaultSeoTitle: "الحناوي للديكور والخزائن", defaultSeoDescription: "أعمال مختارة في تصميم وتنفيذ الخزائن والديكور الداخلي." }).onConflictDoNothing();
  const sellerData = [
    { id: ids.sellers[0], slug: "ahmed-alotaibi", name: "أحمد العتيبي", jobTitle: "مستشار تصميم داخلي", branch: "فرع الرياض", bio: "أساعدك على تحويل احتياجك اليومي إلى مساحة عملية بتفاصيل هادئة ومدروسة.", phoneE164: "+966500000001", whatsappE164: "+966500000001", sortOrder: 1 },
    { id: ids.sellers[1], slug: "khalid-alqahtani", name: "خالد القحطاني", jobTitle: "مستشار مبيعات", branch: "فرع الرياض", bio: "أرافقك من اختيار الخامات حتى وضوح تفاصيل التنفيذ والجدول المتوقع.", phoneE164: "+966500000002", whatsappE164: "+966500000002", sortOrder: 2 },
    { id: ids.sellers[2], slug: "sarah-alharbi", name: "سارة الحربي", jobTitle: "مستشارة تصميم", branch: "فرع الرياض", bio: "أصمم حلولًا تستثمر المساحة وتوازن بين الجمال وسهولة الاستخدام.", phoneE164: "+966500000003", whatsappE164: "+966500000003", sortOrder: 3 },
  ];
  await db.insert(sellers).values(sellerData).onConflictDoNothing();
  const names = [["wardrobes", "خزانات ملابس"], ["walk-in-closets", "غرف ملابس"], ["entrances", "مداخل"], ["tv-walls", "ديكور شاشات"], ["wall-decor", "ديكورات جدارية"]];
  await db.insert(categories).values(names.map(([slug, name], i) => ({ id: ids.categories[i], slug, name, description: `مجموعة من أعمال ${name} المنفذة بعناية.`, sortOrder: i + 1 }))).onConflictDoNothing();
  const projectData = [
    ["wardrobe-oak-rhythm", "خزانة إيقاع البلوط", "خزانة جدارية بخطوط رأسية هادئة وتوزيع داخلي عملي."], ["walk-in-sand", "غرفة ملابس الرمل", "غرفة ملابس دافئة تجمع الزجاج والخشب والإضاءة المتوازنة."], ["entrance-brass", "مدخل النحاس الهادئ", "مدخل بخامات طبيعية وتفاصيل معدنية دقيقة."], ["tv-wall-stone", "جدار شاشة الحجر", "تكوين متزن للشاشة والتخزين بخلفية حجرية ناعمة."], ["walnut-lines", "جدارية خطوط الجوز", "كسوة جدارية تضيف العمق من دون ازدحام بصري."],
  ];
  for (let i = 0; i < projectData.length; i++) {
    const assetId = `40000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const itemId = `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const key = `seed/project-${i + 1}.svg`;
    if (!(await storage.exists(key))) await storage.write(key, Readable.from(placeholder(projectData[i][1], ["#b89a7c", "#9c826d", "#84715f", "#aa927e", "#765e4a"][i])), "image/svg+xml");
    await db.insert(mediaAssets).values({ id: assetId, type: "image", storageDriver: process.env.STORAGE_DRIVER || "local", objectKey: key, originalName: `project-${i + 1}.svg`, mimeType: "image/svg+xml", sizeBytes: Buffer.byteLength(placeholder(projectData[i][1], "#b89a7c")), width: 1200, height: 1200, status: "ready", variants: {} }).onConflictDoNothing();
    await db.insert(projects).values({ id: ids.projects[i], slug: projectData[i][0], title: projectData[i][1], summary: projectData[i][2], description: `${projectData[i][2]} صُمم المشروع بما يلائم الاستخدام اليومي ويبرز جودة الخامات والتنفيذ.`, status: "published", location: "الرياض", projectYear: 2026, designStyle: "معاصر دافئ", materials: ["خشب طبيعي", "إضاءة مدمجة"], publishedAt: new Date(Date.UTC(2026, 0, i + 1)) }).onConflictDoNothing();
    await db.insert(projectItems).values({ id: itemId, projectId: ids.projects[i], itemType: "image", primaryAssetId: assetId, altText: `صورة توضيحية لمشروع ${projectData[i][1]}`, isCover: true }).onConflictDoNothing();
    await db.insert(projectCategories).values({ projectId: ids.projects[i], categoryId: ids.categories[i], isPrimary: true }).onConflictDoNothing();
  }
  const sellerProjectRows = ids.sellers.flatMap((sellerId, sellerIndex) => ids.projects.map((projectId, i) => ({ sellerId, projectId, isVisible: true, isFeatured: i === sellerIndex, sortOrder: i + 1 })));
  await db.insert(sellerProjects).values(sellerProjectRows).onConflictDoNothing();
  await db.insert(sellerCategories).values(ids.sellers.flatMap((sellerId) => ids.categories.map((categoryId, i) => ({ sellerId, categoryId, sortOrder: i + 1 })))).onConflictDoNothing();
  await db.insert(qrLinks).values(ids.sellers.map((sellerId, i) => ({ id: `60000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, sellerId, token: `seed_${String(i + 1).padStart(43, "x")}`, label: "بطاقة المعرض" }))).onConflictDoNothing();
  console.info("تم إنشاء البيانات العربية التجريبية");
}
main().finally(() => pool.end());
