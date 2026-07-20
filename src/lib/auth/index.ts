import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import nodemailer from "nodemailer";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

async function sendResetPassword(url: string, email: string) {
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    console.warn("SMTP غير معد؛ لم تُرسل رسالة استعادة كلمة المرور");
    return;
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "استعادة كلمة المرور — الحناوي",
    text: `استخدم الرابط التالي لتعيين كلمة مرور جديدة. ينتهي الرابط قريبًا:\n${url}`,
    html: `<div dir="rtl"><h2>استعادة كلمة المرور</h2><p>استخدم الرابط الآمن التالي لتعيين كلمة مرور جديدة:</p><p><a href="${url}">تعيين كلمة مرور جديدة</a></p></div>`,
  });
}

export const auth = betterAuth({
  appName: "Al Hinnawi",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => sendResetPassword(url, user.email),
  },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30 },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    cookiePrefix: "alhinnawi",
  },
  rateLimit: { enabled: true, window: 60, max: 100 },
  plugins: [
    admin({
      defaultRole: "editor",
      adminRoles: ["super_admin", "admin"],
      roles: { super_admin: adminAc, admin: adminAc, editor: userAc },
    }),
  ],
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "editor", input: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
