import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/" aria-label="الحناوي — الرئيسية"><span className="brand-mark" aria-hidden>ح</span>{!compact && <span>الحناوي</span>}</Link>;
}
