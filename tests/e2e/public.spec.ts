import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("صفحة عامة RTL بلا overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "critical")).toEqual([]);
});

test("canonical المشروع لا يحمل advisor", async ({ page }) => {
  await page.goto("/works/wardrobe-oak-rhythm?advisor=ahmed-alotaibi");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/works\/wardrobe-oak-rhythm$/);
});

test("شبكة البائع ثلاثة أعمدة وتفتح المشروع", async ({ page }) => {
  await page.goto("/s/ahmed-alotaibi");
  const grid = page.locator('#main > .project-grid[role="list"]');
  await expect(grid).toBeVisible();
  expect(await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(3);
  await grid.locator("a").first().click();
  await expect(page).toHaveURL(/advisor=ahmed-alotaibi/);
});

test("فلترة القسم ورابط واتساب يحمل سياق البائع", async ({ page }) => {
  await page.goto("/s/ahmed-alotaibi");
  await page.getByRole("link", { name: "خزانات ملابس" }).click();
  await expect(page).toHaveURL(/category=wardrobes/);
  const whatsapp = page.getByRole("link", { name: /واتساب/ });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/966/);
});

test("QR ثابت يعيد التوجيه للبائع", async ({ page }) => {
  const token = `seed_${"1".padStart(43, "x")}`;
  await page.goto(`/q/${token}`);
  await expect(page).toHaveURL(/\/s\/ahmed-alotaibi$/);
});

test("تسجيل دخول المشرف وإنشاء قسم", async ({ page }, testInfo) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "بيانات مشرف الاختبار غير متاحة");
  await page.goto("/admin/login");
  await page.getByLabel("البريد الإلكتروني").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("كلمة المرور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "دخول آمن" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/categories");
  const suffix = `${Date.now()}-${testInfo.project.name}`;
  await page.getByLabel("اسم القسم").fill(`قسم اختبار ${suffix}`);
  await page.getByLabel("الرابط المختصر (اختياري)").fill(`e2e-${suffix}`);
  await page.getByRole("button", { name: "إضافة القسم" }).click();
  await expect(page.getByText(`قسم اختبار ${suffix}`)).toBeVisible();
});
