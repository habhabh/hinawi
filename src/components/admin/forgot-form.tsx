"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
export function ForgotForm() { const [sent, setSent] = useState(false); return sent ? <p role="status">إذا كان الحساب موجودًا وإعدادات البريد مفعّلة، ستصلك رسالة الاستعادة قريبًا.</p> : <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); await authClient.requestPasswordReset({ email: String(form.get("email")), redirectTo: "/admin/reset-password" }); setSent(true); }}><div className="field field-wide"><label htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" required /></div><button className="button button-primary field-wide">إرسال رابط الاستعادة</button></form>; }
