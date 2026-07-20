import { env } from "@/lib/env";

export function absoluteUrl(path: string): string {
  return new URL(path, env.APP_URL).toString();
}

export function projectCanonical(slug: string): string {
  return absoluteUrl(`/works/${encodeURIComponent(slug)}`);
}
