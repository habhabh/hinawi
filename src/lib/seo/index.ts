import { env } from "@/lib/env";

const internalHosts = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1"]);

export function isInternalHostname(hostname: string): boolean {
  return internalHosts.has(hostname.toLowerCase());
}

export function isPublicDeploymentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isInternalHostname(url.hostname);
  } catch {
    return false;
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, env.APP_URL).toString();
}

export function projectCanonical(slug: string): string {
  return absoluteUrl(`/works/${encodeURIComponent(slug)}`);
}
