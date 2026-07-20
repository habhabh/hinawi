"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, url, className = "icon-button" }: { title: string; url?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const target = url || window.location.href;
    const usedNativeShare = typeof navigator.share === "function";
    try {
      if (usedNativeShare) await navigator.share({ title, url: target });
      else { await navigator.clipboard.writeText(target); setCopied(true); setTimeout(() => setCopied(false), 1800); }
      navigator.sendBeacon?.("/api/analytics", JSON.stringify({ eventType: usedNativeShare ? "share_click" : "link_copy", path: location.pathname }));
    } catch { /* user cancelled */ }
  }
  return <button type="button" className={className} onClick={share} aria-label={copied ? "تم نسخ الرابط" : "مشاركة الصفحة"}>{copied ? <Check size={19} /> : <Share2 size={19} />}{className.includes("button") && <span>{copied ? "تم النسخ" : "مشاركة"}</span>}</button>;
}
