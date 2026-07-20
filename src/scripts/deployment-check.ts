import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { env } from "@/lib/env";

const failures: string[] = [];

if (env.NODE_ENV !== "production") failures.push("NODE_ENV يجب أن يكون production");
if (!env.APP_URL.startsWith("https://")) failures.push("APP_URL يجب أن يبدأ بـ https://");
if (env.BETTER_AUTH_URL !== env.APP_URL) failures.push("BETTER_AUTH_URL يجب أن يطابق APP_URL");
if (!env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((value) => value.trim()).includes(env.APP_URL)) {
  failures.push("BETTER_AUTH_TRUSTED_ORIGINS يجب أن يتضمن APP_URL");
}
if (env.BETTER_AUTH_SECRET.includes("development-only") || env.BETTER_AUTH_SECRET.length < 32) {
  failures.push("BETTER_AUTH_SECRET يجب أن يكون عشوائيًا وبطول 32 حرفًا على الأقل");
}

if (env.STORAGE_DRIVER === "s3") {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    failures.push("إعدادات S3 الأساسية غير مكتملة");
  }
} else {
  try {
    await mkdir(env.MEDIA_ROOT, { recursive: true });
    await access(env.MEDIA_ROOT, constants.R_OK | constants.W_OK);
  } catch {
    failures.push(`مسار الوسائط غير قابل للقراءة والكتابة: ${env.MEDIA_ROOT}`);
  }
}

try {
  await db.execute(sql`select 1`);
} catch {
  failures.push("تعذر الاتصال بقاعدة PostgreSQL عبر DATABASE_URL");
} finally {
  await pool.end();
}

if (failures.length) {
  console.error("فشل فحص جاهزية النشر:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.info("فحص النشر ناجح: البيئة وقاعدة البيانات والتخزين جاهزة.");
}
