import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyticsEvents, qrLinks, sellers } from "@/db/schema";
import { relativeRedirect, resolveQrSellerSlug } from "@/lib/qr";
import { qrTokenSchema } from "@/lib/validation/common";

export async function GET(_request: Request, { params }: { params: Promise<{ opaqueToken: string }> }) {
  const { opaqueToken } = await params;
  if (!qrTokenSchema.safeParse(opaqueToken).success) return relativeRedirect("/?qr=invalid");
  const rows = await db.select({ qr: qrLinks, slug: sellers.slug, sellerId: sellers.id }).from(qrLinks).innerJoin(sellers, eq(sellers.id, qrLinks.sellerId)).where(and(eq(qrLinks.token, opaqueToken), eq(qrLinks.isActive, true), eq(sellers.isActive, true), isNull(sellers.archivedAt))).limit(1);
  const item = rows[0];
  if (!item) return new NextResponse("<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta name=\"robots\" content=\"noindex\"><body><h1>رمز QR غير فعال</h1><p>يرجى التواصل مع معرض الحناوي.</p><a href=\"/\">الصفحة الرئيسية</a></body></html>", { status: 410, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" } });
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("ah_sid")?.value;
  const targetSlug = resolveQrSellerSlug(item.slug, item.sellerId);
  await db.transaction(async (tx) => {
    if (targetSlug !== item.slug) {
      await tx.update(sellers).set({ slug: targetSlug, updatedAt: new Date() }).where(eq(sellers.id, item.sellerId));
    }
    await tx.update(qrLinks).set({ scanCount: sql`${qrLinks.scanCount} + 1`, lastScannedAt: new Date(), updatedAt: new Date() }).where(eq(qrLinks.id, item.qr.id));
    await tx.insert(analyticsEvents).values({ eventType: "qr_scan", sellerId: item.sellerId, qrLinkId: item.qr.id, anonymousSessionId: sessionId, source: "qr", path: `/q/${opaqueToken}` });
  });
  const response = new NextResponse(null, {
    status: 307,
    headers: { location: `/s/${encodeURIComponent(targetSlug)}` },
  });
  response.cookies.set("ah_source", `qr:${item.qr.id}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}
