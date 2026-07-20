import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/" aria-label="الحناوي — الرئيسية"><Image className="brand-logo" src="/logo.png" width={326} height={345} priority alt="" />{!compact && <span>الحناوي</span>}</Link>;
}
