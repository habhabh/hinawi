import { BarChart3, FolderKanban, Images, LayoutDashboard, QrCode, Settings, Shapes, Users, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";

const links = [
  ["/admin", "الرئيسية", LayoutDashboard], ["/admin/sellers", "البائعون", Users], ["/admin/categories", "الأقسام", Shapes], ["/admin/projects", "المشاريع", FolderKanban], ["/admin/media", "الوسائط", Images], ["/admin/qr", "QR", QrCode], ["/admin/analytics", "التحليلات", BarChart3], ["/admin/users", "المستخدمون", UserRoundCog], ["/admin/settings", "الإعدادات", Settings],
] as const;
export function Sidebar() { return <aside className="admin-sidebar"><Brand /><nav className="admin-nav" aria-label="لوحة التحكم">{links.map(([href, label, Icon]) => <Link href={href} key={href}><Icon size={18} /><span>{label}</span></Link>)}</nav></aside>; }
