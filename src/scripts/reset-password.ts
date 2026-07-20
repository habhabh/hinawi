import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { accounts, users } from "@/db/schema";
import { auth } from "@/lib/auth";

const email = process.env.RESET_USER_EMAIL; const password = process.env.RESET_USER_PASSWORD;
if (!email || !password || password.length < 12) throw new Error("اضبط RESET_USER_EMAIL وRESET_USER_PASSWORD (12 حرفًا على الأقل)");
const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
if (!user) throw new Error("الحساب غير موجود");
const context = await auth.$context;
const hash = await context.password.hash(password);
await db.update(accounts).set({ password: hash, updatedAt: new Date() }).where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")));
console.info("تم تحديث كلمة المرور بأمان");
await pool.end();
