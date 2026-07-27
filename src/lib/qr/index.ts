import { slugSchema } from "@/lib/validation/common";

export function resolveQrSellerSlug(slug: string, sellerId: string): string {
  if (slugSchema.safeParse(slug).success) return slug;
  return `seller-${sellerId.toLowerCase()}`;
}

export function relativeRedirect(path: string, status = 307): Response {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("مسار إعادة التوجيه غير آمن");
  return new Response(null, { status, headers: { location: path } });
}
