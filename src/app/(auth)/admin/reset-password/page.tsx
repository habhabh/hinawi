import { Suspense } from "react";
import { ResetForm } from "@/components/admin/reset-form";
export default function ResetPasswordPage() { return <main id="main" className="login-page"><section className="login-card"><h1>كلمة مرور جديدة</h1><Suspense fallback={<p>جارٍ التحميل…</p>}><ResetForm /></Suspense></section></main>; }
