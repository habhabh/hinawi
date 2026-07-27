import { env } from "@/lib/env";
import { isInternalHostname, isPublicDeploymentUrl } from "@/lib/seo";
import { slugSchema } from "@/lib/validation/common";

export function resolveQrSellerSlug(slug: string, sellerId: string): string {
  if (slugSchema.safeParse(slug).success) return slug;
  return `seller-${sellerId.toLowerCase()}`;
}

function assertRelativePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("مسار إعادة التوجيه غير آمن");
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function publicRequestUrl(request: Request, path: string): URL {
  assertRelativePath(path);
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const requestProtocol = new URL(request.url).protocol.replace(":", "");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : process.env.NODE_ENV === "production"
      ? "https"
      : requestProtocol;
  const hosts = [
    firstForwardedValue(request.headers.get("x-forwarded-host")),
    firstForwardedValue(request.headers.get("host")),
  ];

  for (const host of hosts) {
    if (!host || /[/?#\\]/.test(host)) continue;
    try {
      const origin = new URL(`${protocol}://${host}`);
      if (!isInternalHostname(origin.hostname)) return new URL(path, origin);
    } catch {
      // تجاهل ترويسة proxy غير صالحة واستخدم الإعداد الموثوق أدناه.
    }
  }

  if (isPublicDeploymentUrl(env.APP_URL)) return new URL(path, env.APP_URL);
  return new URL(path, request.url);
}
