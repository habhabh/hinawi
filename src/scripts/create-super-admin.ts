import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

const name = process.env.SUPER_ADMIN_NAME;
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
if (!name || !email || !password || password.length < 12) throw new Error("اضبط SUPER_ADMIN_NAME وSUPER_ADMIN_EMAIL وكلمة مرور من 12 حرفًا على الأقل");

const bootstrapAuth = betterAuth({ database: drizzleAdapter(db, { provider: "pg", schema }), secret: process.env.BETTER_AUTH_SECRET || "bootstrap-secret-must-be-at-least-32-characters", emailAndPassword: { enabled: true, disableSignUp: false } });
const result = await bootstrapAuth.api.signUpEmail({ body: { name, email, password } });
await db.update(users).set({ role: "super_admin", emailVerified: true, updatedAt: new Date() }).where(eq(users.id, result.user.id));
console.info(`تم إنشاء المشرف العام: ${email}`);
await pool.end();
