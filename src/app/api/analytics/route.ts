import { randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
import { analyticsEventSchema } from "@/lib/validation/common";

const botPattern = /bot|crawler|spider|preview|headless/i;
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8_192) return new Response(null, { status: 413 });
  const userAgent = (await headers()).get("user-agent") || "";
  if (botPattern.test(userAgent) || request.headers.get("purpose") === "prefetch") return new Response(null, { status: 204 });
  let parsed;
  try { parsed = analyticsEventSchema.parse(await request.json()); } catch { return Response.json({ error: "حدث غير صالح" }, { status: 400 }); }
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("ah_sid")?.value;
  if (!sessionId) { sessionId = randomUUID(); cookieStore.set("ah_sid", sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" }); }
  const recent = await db.select({ id: analyticsEvents.id }).from(analyticsEvents).where(and(eq(analyticsEvents.eventType, parsed.eventType), eq(analyticsEvents.anonymousSessionId, sessionId), eq(analyticsEvents.path, parsed.path || ""), gt(analyticsEvents.createdAt, new Date(Date.now() - 15_000)))).orderBy(desc(analyticsEvents.id)).limit(1);
  if (!recent.length) {
    const deviceClass = /ipad|tablet/i.test(userAgent) ? "tablet" : /mobile|android|iphone/i.test(userAgent) ? "mobile" : "desktop";
    await db.insert(analyticsEvents).values({ ...parsed, anonymousSessionId: sessionId, path: parsed.path || "", deviceClass });
  }
  return new Response(null, { status: 204 });
}
