"use client";

import type { ReactNode } from "react";

export function AnalyticsLink({ href, eventType, className, children }: { href: string; eventType: "whatsapp_click" | "phone_click"; className?: string; children: ReactNode }) {
  return <a href={href} className={className} onClick={() => navigator.sendBeacon?.("/api/analytics", JSON.stringify({ eventType, path: location.pathname }))}>{children}</a>;
}
