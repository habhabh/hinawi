"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
export function ResetForm() { const query = useSearchParams(); const [message, setMessage] = useState(""); return <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const password = String(data.get("password")); const result = await authClient.resetPassword({ newPassword: password, token: query.get("token") || "" }); setMessage(result.error ? "الرابط غير صالح أو منتهي." : "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن."); }}><div className="field field-wide"><label htmlFor="password">كلمة المرور الجديدة</label><input id="password" name="password" type="password" minLength={12} required /></div><button className="button button-primary field-wide">حفظ كلمة المرور</button>{message && <p role="status" className="field-wide">{message}</p>}</form>; }
