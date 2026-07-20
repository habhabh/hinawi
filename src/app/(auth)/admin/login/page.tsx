import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { Brand } from "@/components/shared/brand";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return <main id="main" className="login-page"><section className="login-card"><Brand /><span className="eyebrow" style={{ display: "block", marginTop: "2rem" }}>لوحة التحكم</span><h1>مرحبًا بعودتك</h1><p className="muted">أدخل حساب الإدارة للوصول إلى مكتبة المحتوى.</p><LoginForm /><p style={{ textAlign: "center" }}><Link href="/admin/forgot-password">نسيت كلمة المرور؟</Link></p></section></main>;
}
