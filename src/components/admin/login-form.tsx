"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

const subscribeToHydration = () => () => {};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({ email: String(data.get("email")), password: String(data.get("password")), rememberMe: false });
    setPending(false);
    if (result.error) setError("تعذر تسجيل الدخول. تحقق من البيانات وحالة الحساب.");
    else { router.push("/admin"); router.refresh(); }
  }
  return <form className="form-grid" method="post" onSubmit={submit}><div className="field field-wide"><label htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required /></div><div className="field field-wide"><label htmlFor="password">كلمة المرور</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={12} required /></div>{error && <p className="field-wide" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}<button className="button button-primary field-wide" disabled={pending || !hydrated}>{pending ? "جارٍ التحقق…" : "دخول آمن"}</button></form>;
}
