import { normalizePhone } from "@/lib/phone";

export function buildWhatsappUrl(phone: string, message: string, projectUrl?: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const body = projectUrl ? `${message.trim()}\n${projectUrl}` : message.trim();
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(body)}`;
}

export function interpolateWhatsappMessage(
  template: string,
  values: { sellerName?: string; companyName?: string; projectTitle?: string },
): string {
  return template
    .replaceAll("{seller_name}", values.sellerName ?? "")
    .replaceAll("{company_name}", values.companyName ?? "")
    .replaceAll("{project_title}", values.projectTitle ?? "");
}
